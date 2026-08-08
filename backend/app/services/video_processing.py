import ffmpeg


def get_video_metadata(file_path: str) -> dict:
    """
    Uses ffprobe (via ffmpeg-python) to extract duration and format info.
    """
    probe = ffmpeg.probe(file_path)
    format_info = probe.get("format", {})

    duration = float(format_info.get("duration", 0))
    format_name = format_info.get("format_name", "unknown")

    return {
        "duration_seconds": duration,
        "format": format_name,
    }