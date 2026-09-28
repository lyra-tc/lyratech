import io
import time

import pytest

from app.core.portfolio_files import (
    InvalidFileError,
    detect_logo,
    detect_video,
    read_limited,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 32
WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 32
MP4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 32
MOV = b"\x00\x00\x00\x14ftypqt  " + b"\x00" * 32
WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 32
SAFE_SVG = (
    b'<?xml version="1.0" encoding="UTF-8"?>\n'
    b'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
    b'<rect width="1" height="1" fill="url(#p)"/><use xlink:href="#a"/></svg>'
)
SVG_WITH_RASTER = (
    b'<svg xmlns="http://www.w3.org/2000/svg">'
    b'<image href="data:image/png;base64,iVBORw0KGgo=" width="1" height="1"/></svg>'
)
SVG_WITH_INKSCAPE_METADATA = (
    b'<svg xmlns="http://www.w3.org/2000/svg" '
    b'xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd">'
    b'<sodipodi:namedview/><rect width="1" height="1"/></svg>'
)


@pytest.mark.parametrize(
    "data, ext, content_type",
    [
        (PNG, "png", "image/png"),
        (JPG, "jpg", "image/jpeg"),
        (WEBP, "webp", "image/webp"),
        (SAFE_SVG, "svg", "image/svg+xml"),
        (SVG_WITH_RASTER, "svg", "image/svg+xml"),
        (SVG_WITH_INKSCAPE_METADATA, "svg", "image/svg+xml"),
    ],
)
def test_detect_logo_accepts_supported_formats(data, ext, content_type):
    detected = detect_logo(data)
    assert detected.ext == ext
    assert detected.content_type == content_type


@pytest.mark.parametrize("data", [MP4, b"GIF89a" + b"\x00" * 10, b"hola mundo"])
def test_detect_logo_rejects_other_formats(data):
    with pytest.raises(InvalidFileError):
        detect_logo(data)


@pytest.mark.parametrize(
    "payload",
    [
        b"<svg><script>alert(1)</script></svg>",
        b'<svg onload="alert(1)"></svg>',
        b"<svg><foreignObject><div/></foreignObject></svg>",
        b'<svg><a xlink:href="javascript:alert(1)">x</a></svg>',
        b'<svg><image href="https://evil.test/x.png"/></svg>',
        b'<svg><image href="data:image/svg+xml;base64,AAAA"/></svg>',
        b'<!DOCTYPE svg [<!ENTITY x "y">]><svg></svg>',
        (
            b'<svg xmlns="http://www.w3.org/2000/svg" '
            b'xmlns:s="http://www.w3.org/2000/svg">'
            b"<s:script>alert(1)</s:script></svg>"
        ),
        (
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b'<h:script xmlns:h="http://www.w3.org/1999/xhtml">alert(1)</h:script>'
            b"</svg>"
        ),
        (
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b'<s:foreignObject xmlns:s="http://www.w3.org/2000/svg"/></svg>'
        ),
        (
            b'<svg xmlns="http://www.w3.org/2000/svg"><a>'
            b'<set attributeName="href" to="&#106;avascript:alert(1)"/>'
            b"<text>x</text></a></svg>"
        ),
        (
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b'<a href="&#106;avascript:alert(1)">x</a></svg>'
        ),
        b"<svg><rect></svg>",
        (
            b'<?xml-stylesheet type="text/xsl" href=""?>'
            b'<svg xmlns="http://www.w3.org/2000/svg" '
            b'xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xsl:version="1.0">'
            b'<xsl:element name="script" namespace="http://www.w3.org/2000/svg">'
            b"alert(document.domain)</xsl:element></svg>"
        ),
        (
            b'<?xml-stylesheet href="https://evil.test/x.css"?>'
            b'<svg xmlns="http://www.w3.org/2000/svg"/>'
        ),
        b'<!DOCTYPE svg SYSTEM "https://evil.test/x.dtd">'
        b'<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        (
            b'<svg xmlns="http://www.w3.org/2000/svg">'
            b'<foo:bar xmlns:foo="https://evil.test/ns"/></svg>'
        ),
        b"<svg><style>@import url(https://evil.test/x.css)</style></svg>",
        b'<svg><rect style="fill:url(https://evil.test/x.png)"/></svg>',
        b'<svg xml:base="https://evil.test/"><rect/></svg>',
        b"<svg><style>\\75 rl(https://evil.test/x.png)</style></svg>",
        b'<svg><rect style="background:u\\rl(https://evil.test/x)"/></svg>',
        b'<svg><style>@\\69mport "https://evil.test/x.css";</style></svg>',
        (
            b"<svg><style>a{background:image-set("
            b'"https://evil.test/x.png" 1x)}</style></svg>'
        ),
        b"<svg><style><g/>@import url(https://evil.test/x.css);</style></svg>",
    ],
)
def test_detect_logo_rejects_unsafe_svg(payload):
    with pytest.raises(InvalidFileError):
        detect_logo(payload)


@pytest.mark.parametrize(
    "data, ext, content_type",
    [(MP4, "mp4", "video/mp4"), (WEBM, "webm", "video/webm")],
)
def test_detect_video_accepts_supported_formats(data, ext, content_type):
    detected = detect_video(data)
    assert detected.ext == ext
    assert detected.content_type == content_type


@pytest.mark.parametrize(
    "data",
    [
        PNG,
        MOV,
        b"not a video",
        b"\x00\x00\x00\x18ftypavif" + b"\x00" * 32,
        b"\x00\x00\x00\x18ftypheic" + b"\x00" * 32,
    ],
)
def test_detect_video_rejects_other_formats(data):
    with pytest.raises(InvalidFileError):
        detect_video(data)


def test_read_limited_returns_bytes_within_limit():
    assert read_limited(io.BytesIO(b"abc"), 3) == b"abc"


def test_read_limited_rejects_oversized_stream():
    with pytest.raises(InvalidFileError, match="excede"):
        read_limited(io.BytesIO(b"x" * (2 * 1024 * 1024 + 1)), 2 * 1024 * 1024)


def test_read_limited_rejects_empty_stream():
    with pytest.raises(InvalidFileError, match="vacío"):
        read_limited(io.BytesIO(b""), 10)


# Regression tests for a ReDoS in the CSS `url(...)` scanner: an earlier
# implementation searched for the closing `)` with a pattern that backtracked
# catastrophically (O(n^3)) on an unterminated `"url(" + " " * n` — 4000
# spaces alone took ~22s and held the GIL, freezing the whole backend. The
# fixed scanner never looks for `)` at all, so it must stay linear even on
# much larger adversarial input (kept comfortably under LOGO_MAX_BYTES).
@pytest.mark.parametrize(
    "make_payload",
    [
        lambda: b'<svg><rect style="fill:url(' + b" " * 1_000_000 + b'"/></svg>',
        lambda: b"<svg><style>url(" + b" " * 1_000_000 + b"</style></svg>",
        lambda: b'<svg><rect style="fill:url(a' + b" " * 1_000_000 + b'"/></svg>',
        lambda: b'<svg><rect style="' + (b"url(" * 300_000) + b'"/></svg>',
    ],
    ids=["attr-unterminated", "style-unterminated", "url-a-spaces", "repeated-url-open"],
)
def test_css_url_scan_stays_linear_on_adversarial_input(make_payload):
    payload = make_payload()
    assert len(payload) < 2 * 1024 * 1024  # stays under LOGO_MAX_BYTES
    start = time.perf_counter()
    try:
        detect_logo(payload)
    except InvalidFileError:
        pass  # accept-or-reject doesn't matter here, only timing does
    elapsed = time.perf_counter() - start
    assert elapsed < 1.0, f"took {elapsed:.3f}s (expected a linear scan)"
