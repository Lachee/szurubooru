import re
from typing import Optional
import magic
import mimetypes

def get_mime_type(content: bytes) -> str:
    if not content:
        return "application/octet-stream"
    return magic.from_buffer(content, mime=True)


def get_extension(mime_type: str) -> Optional[str]:
    extension_map = {
        "application/octet-stream": "dat",
    }
    return extension_map.get((mime_type or "").strip().lower(), mimetypes.guess_extension(mime_type or "")[1:].strip().lower())


def is_flash(mime_type: str) -> bool:
    return mime_type.lower() == "application/x-shockwave-flash"


def is_video(mime_type: str) -> bool:
    return mime_type.lower() in (
        "application/ogg",
        "video/mp4",
        "video/quicktime",
        "video/webm",
    )


def is_image(mime_type: str) -> bool:
    return mime_type.lower() in (
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/avif",
        "image/heif",
        "image/heic",
    )


def is_animated_gif(content: bytes) -> bool:
    pattern = b"\x21\xF9\x04[\x00-\xFF]{4}\x00[\x2C\x21]"
    return (
        get_mime_type(content) == "image/gif"
        and len(re.findall(pattern, content)) > 1
    )


def is_heif(mime_type: str) -> bool:
    return mime_type.lower() in (
        "image/heif",
        "image/heic",
        "image/avif",
    )
