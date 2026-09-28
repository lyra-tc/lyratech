"""MinIO-backed object storage for portfolio media.

Routers depend on `get_storage` (never on MinioStorage directly) so tests can
swap in an in-memory fake. Objects live under
`{STORAGE_ENV_PREFIX}/portafolio/{slug}-{uuid}/`, and the bucket grants
anonymous read on `*/portafolio/*` so the public site loads them directly.
"""
import io
import logging
import os
import re
import secrets
import time
import unicodedata
from functools import lru_cache
from typing import Protocol

import certifi
import urllib3
from minio import Minio
from minio.deleteobjects import DeleteObject

from ..config import settings

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Object storage is unreachable or rejected the operation."""


class Storage(Protocol):
    def upload(self, key: str, data: bytes, content_type: str) -> None: ...

    def delete(self, key: str) -> None: ...

    def delete_prefix(self, prefix: str) -> None: ...


class MinioStorage:
    def __init__(self) -> None:
        # The minio SDK's default http_client uses 300s connect/read timeouts
        # and 5 retries, so an unreachable MinIO would hang a request for
        # minutes; a short, bounded timeout fails fast instead.
        http_client = urllib3.PoolManager(
            timeout=urllib3.Timeout(connect=5, read=60),
            retries=urllib3.Retry(
                total=2, backoff_factor=0.2, status_forcelist=[500, 502, 503, 504]
            ),
            cert_reqs="CERT_REQUIRED",
            ca_certs=os.environ.get("SSL_CERT_FILE") or certifi.where(),
        )
        self._client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
            http_client=http_client,
        )
        self._bucket = settings.MINIO_BUCKET

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        try:
            self._client.put_object(
                bucket_name=self._bucket,
                object_name=key,
                data=io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
        except Exception as exc:  # S3Error, urllib3 network errors, ...
            raise StorageError(str(exc)) from exc

    def delete(self, key: str) -> None:
        try:
            self._client.remove_object(bucket_name=self._bucket, object_name=key)
        except Exception as exc:
            raise StorageError(str(exc)) from exc

    def delete_prefix(self, prefix: str) -> None:
        try:
            objects = self._client.list_objects(
                bucket_name=self._bucket, prefix=prefix, recursive=True
            )
            errors = self._client.remove_objects(
                bucket_name=self._bucket,
                delete_object_list=(DeleteObject(obj.object_name) for obj in objects),
            )
            # remove_objects is lazy: nothing is deleted until it's iterated.
            collected_errors = list(errors)
        except Exception as exc:
            raise StorageError(str(exc)) from exc
        if collected_errors:
            for error in collected_errors:
                logger.error("MinIO no pudo borrar un objeto: %s", error)
            raise StorageError(
                f"MinIO no pudo borrar {len(collected_errors)} objeto(s) bajo {prefix!r}"
            )


@lru_cache
def get_storage() -> Storage:
    return MinioStorage()


def slugify(value: str, max_length: int = 40) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug[:max_length].strip("-") or "proyecto"


def project_prefix(project_name: str, project_uuid: str) -> str:
    """Folder for one project. The slug is cosmetic (readable in the console);
    the UUID is what ties the folder to the DB row."""
    return f"{settings.STORAGE_ENV_PREFIX}/portafolio/{slugify(project_name)}-{project_uuid}/"


def object_key(prefix: str, kind: str, ext: str) -> str:
    # The timestamp busts browser/CDN caches when a file is replaced; the random
    # suffix keeps two replacements within the same second from colliding.
    return f"{prefix}{kind}-{int(time.time())}-{secrets.token_hex(3)}.{ext}"


def public_url(key: str) -> str:
    return f"{settings.MINIO_PUBLIC_URL.rstrip('/')}/{settings.MINIO_BUCKET}/{key}"
