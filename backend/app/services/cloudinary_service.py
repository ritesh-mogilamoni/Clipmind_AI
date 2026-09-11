import os
import logging
import cloudinary
import cloudinary.uploader
from app.core.config import settings

logger = logging.getLogger(__name__)

def is_cloudinary_configured() -> bool:
    if settings.cloudinary_url:
        return True
    return bool(
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    )

def init_cloudinary():
    if settings.cloudinary_url:
        cloudinary.config(cloudinary_url=settings.cloudinary_url)
    elif (
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    ):
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )

def upload_video_to_cloudinary(file_path: str, public_id: str = None) -> dict | None:
    """
    Uploads a video to Cloudinary with chunked large file support.
    Returns the Cloudinary response dict containing 'secure_url', 'duration', etc.
    """
    if not is_cloudinary_configured():
        logger.info("Cloudinary is not configured. Falling back to local storage.")
        return None

    try:
        init_cloudinary()
        logger.info(f"Uploading video '{file_path}' to Cloudinary...")
        upload_result = cloudinary.uploader.upload_large(
            file_path,
            resource_type="video",
            folder="clipmind_videos",
            public_id=public_id,
            chunk_size=6000000,  # 6MB chunks for reliable streaming upload
            format="mp4",
        )
        if upload_result and upload_result.get("secure_url"):
            import re
            upload_result["secure_url"] = re.sub(r"\.[a-zA-Z0-9]+$", ".mp4", upload_result["secure_url"])
        logger.info(f"Cloudinary upload complete: {upload_result.get('secure_url')}")
        return upload_result
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}", exc_info=True)
        return None
