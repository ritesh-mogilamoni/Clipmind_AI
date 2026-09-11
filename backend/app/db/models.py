import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, BigInteger, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.orm import relationship
from app.db.postgres import Base


def utc_now():
    return datetime.now(timezone.utc)


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36), storing as string.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import UUID
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            else:
                return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if isinstance(value, uuid.UUID):
                return value
            else:
                return uuid.UUID(value)


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

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
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

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    uploaded_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    format = Column(String, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    status = Column(Enum(VideoStatus), default=VideoStatus.uploaded)

    # AI Processed Outputs
    transcript_text = Column(Text, nullable=True)
    transcript_segments = Column(JSON, nullable=True)
    short_summary = Column(Text, nullable=True)
    detailed_summary = Column(Text, nullable=True)
    key_moments = Column(JSON, nullable=True)
    keywords = Column(JSON, nullable=True)
    language = Column(String, nullable=True)
    study_materials = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    uploader = relationship("User", back_populates="videos")
    bookmarks = relationship("Bookmark", back_populates="video")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    video_id = Column(GUID(), ForeignKey("videos.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="bookmarks")
    video = relationship("Video", back_populates="bookmarks")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)