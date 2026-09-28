"""Validation of portfolio uploads (logo / video).

The browser-supplied filename and Content-Type are never trusted: the real
type comes from the file's magic bytes, and that detected type is what gets
stored as the object's Content-Type in MinIO.
"""
import re
from dataclasses import dataclass
from typing import BinaryIO
from xml.etree.ElementTree import ParseError

from defusedxml.common import (
    DTDForbidden,
    EntitiesForbidden,
    ExternalReferenceForbidden,
)
from defusedxml.ElementTree import fromstring as safe_fromstring

LOGO_MAX_BYTES = 2 * 1024 * 1024
VIDEO_MAX_BYTES = 50 * 1024 * 1024
_CHUNK_BYTES = 1024 * 1024


class InvalidFileError(ValueError):
    pass


@dataclass(frozen=True)
class DetectedFile:
    ext: str
    content_type: str


def read_limited(stream: BinaryIO, max_bytes: int) -> bytes:
    """Read the whole stream, failing as soon as it grows past `max_bytes`
    (the client's Content-Length is not trusted)."""
    buffer = bytearray()
    while True:
        chunk = stream.read(_CHUNK_BYTES)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > max_bytes:
            raise InvalidFileError(
                f"El archivo excede el máximo de {max_bytes // (1024 * 1024)} MB"
            )
    if not buffer:
        raise InvalidFileError("El archivo está vacío")
    return bytes(buffer)


# SVGs are served from minio.lyratech.com.mx, the same origin as the MinIO
# console, so a scripted SVG opened directly would be XSS on that origin.
# A regex blocklist over raw markup is bypassable with alternate namespace
# prefixes, entity-encoded attribute values and XSLT processing instructions,
# so instead we parse the SVG as XML (via defusedxml, which blocks DTDs and
# external/internal entities) and walk the resulting element tree, checking
# each element/attribute by its resolved (namespace, local-name) pair rather
# than by raw text. Namespaces are an ALLOWLIST (not a blocklist): anything
# outside the small set an SVG legitimately needs — XSLT, XHTML, MathML, or
# any other foreign namespace an attacker picks — is rejected outright.
_SVG_NS = "http://www.w3.org/2000/svg"
_XLINK_NS = "http://www.w3.org/1999/xlink"
_XML_NS = "http://www.w3.org/XML/1998/namespace"
_ALLOWED_NAMESPACES = frozenset(
    {
        "",  # no namespace (plain attributes / a bare <svg> with no xmlns)
        _SVG_NS,
        _XLINK_NS,
        _XML_NS,
        "http://www.inkscape.org/namespaces/inkscape",
        "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd",
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "http://purl.org/dc/elements/1.1/",
        "http://creativecommons.org/ns#",
        "http://web.resource.org/cc/",
    }
)
_FORBIDDEN_ELEMENTS = {
    "script", "foreignobject", "set", "animate", "animatemotion",
    "animatetransform", "animatecolor", "handler", "listener",
    "iframe", "embed", "object",
}
_HREF_DATA_URI = re.compile(
    r"^data:image/(?:png|jpe?g|gif|webp);base64,", re.IGNORECASE
)
# A logo must be self-contained: no @import and no url(...)/image-set(...)/
# src(...) pointing outside the file (an inline fragment reference or a
# raster data: URI is fine). We deliberately never search for the closing
# `)` — a pattern like `url\(...*\)` backtracks catastrophically (O(n^3)) on
# an unterminated `"url(" + " " * n`, which would hang the whole backend
# (it holds the GIL). Instead we just anchor at each `url(` and check that
# what immediately follows is an allowed prefix; nothing here reads forward
# past that fixed-length check, so it's linear in the input size.
_URL_OPEN = re.compile(r"url\(\s*['\"]?", re.IGNORECASE)
_ALLOWED_URL_TARGET = re.compile(
    r"#|data:image/(?:png|jpe?g|gif|webp);", re.IGNORECASE
)
_CSS_FORBIDDEN_TOKENS = ("@import", "image-set(", "src(")
# Anything other than the leading XML declaration (`<?xml ...?>`) is a
# processing instruction — e.g. `<?xml-stylesheet ...?>` can attach an XSLT
# stylesheet that runs script in browsers that support XML transforms.
_FORBIDDEN_PI = re.compile(rb"<\?(?!xml[\s?])", re.IGNORECASE)

_SVG_UNSAFE_MESSAGE = "El SVG contiene contenido no permitido"
_SVG_INVALID_MESSAGE = "El SVG no es válido o contiene contenido no permitido"


def _looks_like_svg(data: bytes) -> bool:
    head = data[:4096]
    if b"\x00" in head:
        return False
    text = head.decode("utf-8", errors="ignore").lstrip("﻿ \t\r\n").lower()
    return text.startswith("<") and "<svg" in text


def _split_tag(tag: str) -> tuple[str, str]:
    if tag.startswith("{"):
        ns, _, local = tag[1:].partition("}")
        return ns, local
    return "", tag


def _parse_svg(data: bytes):
    try:
        return safe_fromstring(data, forbid_dtd=True)
    except (
        DTDForbidden,
        EntitiesForbidden,
        ExternalReferenceForbidden,
        ParseError,
        ValueError,
    ) as exc:
        raise InvalidFileError(_SVG_INVALID_MESSAGE) from exc


def _check_css_value_safe(value: str) -> None:
    if not value:
        return
    # A backslash lets CSS "escape" any character or codepoint (e.g.
    # `\75 rl(` == `url(`, `@\69mport` == `@import`), which would make the
    # plain substring/prefix checks below unreliable — reject outright
    # rather than trying to unescape safely.
    if "\\" in value:
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    lowered = value.lower()
    if any(token in lowered for token in _CSS_FORBIDDEN_TOKENS):
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    for match in _URL_OPEN.finditer(value):
        if not _ALLOWED_URL_TARGET.match(value, match.end()):
            raise InvalidFileError(_SVG_UNSAFE_MESSAGE)


def _check_style_element_safe(element) -> None:
    # A <style> with child elements (e.g. a smuggled <g/>) would make
    # `element.text` miss content entirely — reject that shape outright,
    # and separately use itertext() (text + every descendant's text/tail)
    # rather than trusting `element.text` alone even if this check above
    # is ever loosened later.
    if len(element) > 0:
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    _check_css_value_safe("".join(element.itertext()))


def _check_element_safe(element) -> None:
    ns, local = _split_tag(element.tag)
    if ns not in _ALLOWED_NAMESPACES:
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    local_lower = local.lower()
    if ns in (_SVG_NS, "") and local_lower in _FORBIDDEN_ELEMENTS:
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    if ns in (_SVG_NS, "") and local_lower == "style":
        _check_style_element_safe(element)
    for attr_name, attr_value in element.attrib.items():
        _check_attribute_safe(attr_name, attr_value)


def _check_attribute_safe(attr_name: str, attr_value: str) -> None:
    attr_ns, attr_local = _split_tag(attr_name)
    if attr_ns not in _ALLOWED_NAMESPACES:
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    attr_local_lower = attr_local.lower()
    if attr_local_lower.startswith("on"):
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    # xml:base would change how relative URLs elsewhere in the document
    # resolve, letting an otherwise-local reference point off-origin.
    if attr_ns == _XML_NS and attr_local_lower == "base":
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    if attr_local_lower == "href":
        href = attr_value.strip()
        if not (href.startswith("#") or _HREF_DATA_URI.match(href)):
            raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    # The parser has already resolved entity references (e.g. &#106; -> "j"),
    # so this also catches obfuscated javascript: URIs regardless of which
    # attribute carries them.
    if "javascript:" in re.sub(r"\s+", "", attr_value).lower():
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    _check_css_value_safe(attr_value)


def _check_svg_safe(data: bytes) -> None:
    if _FORBIDDEN_PI.search(data):
        raise InvalidFileError(_SVG_UNSAFE_MESSAGE)
    root = _parse_svg(data)
    _, root_local = _split_tag(root.tag)
    if root_local.lower() != "svg":
        raise InvalidFileError(_SVG_INVALID_MESSAGE)
    for element in root.iter():
        _check_element_safe(element)


def detect_logo(data: bytes) -> DetectedFile:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return DetectedFile("png", "image/png")
    if data.startswith(b"\xff\xd8\xff"):
        return DetectedFile("jpg", "image/jpeg")
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return DetectedFile("webp", "image/webp")
    if _looks_like_svg(data):
        _check_svg_safe(data)
        return DetectedFile("svg", "image/svg+xml")
    raise InvalidFileError("El logo debe ser PNG, JPG, WebP o SVG")


# Only accept `ftyp` brands that are actually playable video in browsers.
# `ftypavif`/`ftypheic` etc. also carry an `ftyp` box but aren't video.
_MP4_BRANDS = {
    b"isom", b"iso2", b"iso3", b"iso4", b"iso5", b"iso6",
    b"mp41", b"mp42", b"avc1", b"dash", b"M4V ",
}


def detect_video(data: bytes) -> DetectedFile:
    if data[4:8] == b"ftyp" and data[8:12] in _MP4_BRANDS:
        return DetectedFile("mp4", "video/mp4")
    if data.startswith(b"\x1a\x45\xdf\xa3"):
        return DetectedFile("webm", "video/webm")
    raise InvalidFileError("El video debe ser MP4 o WebM")
