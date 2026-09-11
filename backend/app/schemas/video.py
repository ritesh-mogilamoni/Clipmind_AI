from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.db.models import VideoStatus


from typing import Optional, List, Any

class URLImportRequest(BaseModel):
    url: str
    title: Optional[str] = None

class TranscriptUpdate(BaseModel):
    transcript_text: str
    segments: Optional[List[Any]] = None

class VideoVisibilityUpdate(BaseModel):
    visibility: str

class VideoResponse(BaseModel):
    id: UUID
    uploaded_by: UUID
    title: str
    original_filename: str
    duration_seconds: Optional[float]
    format: Optional[str]
    file_size_bytes: Optional[int]
    status: VideoStatus
    visibility: Optional[str] = "public"
    transcript_text: Optional[str] = None
    transcript_segments: Optional[List[Any]] = None
    short_summary: Optional[str] = None
    detailed_summary: Optional[str] = None
    key_moments: Optional[List[Any]] = None
    keywords: Optional[List[str]] = None
    language: Optional[str] = None
    study_materials: Optional[List[Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True