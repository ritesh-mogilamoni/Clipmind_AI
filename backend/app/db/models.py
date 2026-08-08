import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, BigInteger, DateTime, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.postgres import Base
import enum


def utc_now():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    content_creator = "content_creator"
    learner = "learner"
    educator = "educator"
    administrator = "administrator"


class VideoStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    transcribed = "transcribed"
    summarized = "summarized"
    completed = "completed"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    videos = relationship("Video", back_populates="uploader")
    bookmarks = relationship("Bookmark", back_populates="user")


class Video(Base):
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    format = Column(String, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    status = Column(Enum(VideoStatus), default=VideoStatus.uploaded)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    uploader = relationship("User", back_populates="videos")
    bookmarks = relationship("Bookmark", back_populates="video")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="bookmarks")
    video = relationship("Video", back_populates="bookmarks")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    extra_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=utc_now)