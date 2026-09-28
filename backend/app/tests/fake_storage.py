from ..core.storage import StorageError


class FakeStorage:
    """In-memory stand-in for MinioStorage. Set `fail = True` to simulate MinIO being
    down entirely, or `fail_after = N` to simulate an upload batch failing partway
    through (the first N `upload()` calls succeed, the next one raises)."""

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.fail = False
        self.fail_after: int | None = None
        self._upload_count = 0

    def _check(self) -> None:
        if self.fail:
            raise StorageError("MinIO no disponible (simulado)")

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        self._check()
        if self.fail_after is not None and self._upload_count >= self.fail_after:
            raise StorageError("MinIO no disponible (simulado, falla parcial)")
        self._upload_count += 1
        self.objects[key] = (data, content_type)

    def delete(self, key: str) -> None:
        self._check()
        self.objects.pop(key, None)

    def delete_prefix(self, prefix: str) -> None:
        self._check()
        for key in [k for k in self.objects if k.startswith(prefix)]:
            del self.objects[key]
