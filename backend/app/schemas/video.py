from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.db.models import VideoStatus


class VideoResponse(BaseModel):
    id: UUID
    title: str
    original_filename: str
    duration_seconds: Optional[float]
    format: Optional[str]
    file_size_bytes: Optional[int]
    status: VideoStatus
    created_at: datetime

    class Config:
        from_attributes = True