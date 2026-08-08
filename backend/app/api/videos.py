import os
import shutil
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.db.postgres import get_db
from app.db.models import User, Video, VideoStatus
from app.schemas.video import VideoResponse
from app.core.deps import get_current_user
from app.services.video_processing import get_video_metadata

router = APIRouter(prefix="/videos", tags=["videos"])

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
MAX_FILE_SIZE_MB = 500


@router.post("/upload", response_model=VideoResponse)
def upload_video(
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Generate a unique filename to avoid collisions
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file to disk
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Extract metadata via FFmpeg
    try:
        metadata = get_video_metadata(file_path)
    except Exception:
        metadata = {"duration_seconds": None, "format": None}

    # Save metadata to Postgres
    new_video = Video(
        uploaded_by=current_user.id,
        title=title,
        original_filename=file.filename,
        storage_path=file_path,
        duration_seconds=metadata["duration_seconds"],
        format=metadata["format"],
        file_size_bytes=file_size,
        status=VideoStatus.uploaded,
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    return new_video


@router.get("/", response_model=list[VideoResponse])
def list_videos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all videos uploaded by the current user.
    """
    videos = (
        db.query(Video)
        .filter(Video.uploaded_by == current_user.id)
        .order_by(Video.created_at.desc())
        .all()
    )
    return videos


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve a specific video by ID.
    """
    video = db.query(Video).filter(Video.id == video_id, Video.uploaded_by == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video