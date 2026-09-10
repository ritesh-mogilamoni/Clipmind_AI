import os
import shutil
import uuid
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response, Query, Request
from fastapi.responses import FileResponse, StreamingResponse
import re
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.postgres import get_db
from app.db.models import User, Video, VideoStatus, Bookmark, ActivityLog, UserRole
from app.schemas.video import VideoResponse, TranscriptUpdate, URLImportRequest
from app.core.deps import get_current_user
from app.services.video_processing import get_video_metadata
from app.services.transcription import transcribe_video
from app.services.summarization import generate_summaries_and_keywords
from app.services.key_moments import extract_key_moments

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/videos", tags=["videos"])

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}


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

    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    try:
        metadata = get_video_metadata(file_path)
    except Exception:
        metadata = {"duration_seconds": None, "format": None}

    video_id = uuid.uuid4()
    new_video = Video(
        id=video_id,
        uploaded_by=current_user.id,
        title=title,
        original_filename=file.filename,
        storage_path=file_path,
        duration_seconds=metadata["duration_seconds"],
        format=metadata["format"],
        file_size_bytes=file_size,
        status=VideoStatus.uploaded,
    )
    
    try:
        db.add(new_video)
        db.flush()

        log = ActivityLog(
            user_id=current_user.id,
            action="upload_video",
            extra_data={"video_id": str(video_id), "title": title},
        )
        db.add(log)
        db.commit()
        db.refresh(new_video)
        return new_video
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving uploaded video to DB: {e}")
        raise HTTPException(status_code=500, detail=f"Database upload error: {str(e)}")


@router.post("/import-url", response_model=VideoResponse)
def import_video_url(
    body: URLImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Imports and downloads an online video directly via URL link (YouTube, Vimeo, or direct media link).
    """
    import urllib.parse
    import urllib.request

    url = body.url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol. Must start with http:// or https://")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    downloaded_file = None
    extracted_title = body.title or ""

    yt_err_msg = None
    # Attempt yt-dlp first for YouTube, Vimeo, social, and video stream links
    try:
        import yt_dlp
        unique_id = str(uuid.uuid4())
        outtmpl = os.path.join(UPLOAD_DIR, f"{unique_id}.%(ext)s")
        ydl_opts = {
            'outtmpl': outtmpl,
            'format': 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if not extracted_title:
                extracted_title = info.get("title") or "Online Video"
            
            # Find the downloaded file matching unique_id
            for fname in os.listdir(UPLOAD_DIR):
                if fname.startswith(unique_id):
                    downloaded_file = os.path.join(UPLOAD_DIR, fname)
                    break
    except Exception as yt_err:
        yt_err_msg = str(yt_err)
        logger.warning(f"yt-dlp import notice: {yt_err}")

    # Fallback to direct HTTP media file download ONLY for direct media file URLs (.mp4, .mov, .webm, etc.)
    if not downloaded_file or not os.path.exists(downloaded_file):
        parsed_path = urllib.parse.urlparse(url).path
        ext = os.path.splitext(parsed_path)[1].lower()
        if ext in ALLOWED_EXTENSIONS or ext in {".mp4", ".mov", ".avi", ".webm", ".mkv", ".m4a"}:
            try:
                unique_filename = f"{uuid.uuid4()}{ext if ext in ALLOWED_EXTENSIONS else '.mp4'}"
                downloaded_file = os.path.join(UPLOAD_DIR, unique_filename)

                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                )
                with urllib.request.urlopen(req, timeout=180) as resp, open(downloaded_file, "wb") as out:
                    shutil.copyfileobj(resp, out)

                if not extracted_title:
                    raw_base = os.path.basename(parsed_path)
                    extracted_title = os.path.splitext(raw_base)[0] if raw_base else "Online Video"
            except Exception as dl_err:
                logger.error(f"Failed to stream direct video file from URL '{url}': {dl_err}")
                raise HTTPException(status_code=400, detail=f"Failed to download video file: {str(dl_err)}")
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Could not extract video stream from the link: {yt_err_msg or 'Please ensure the link is a valid public video URL.'}"
            )

    file_size = os.path.getsize(downloaded_file)
    try:
        metadata = get_video_metadata(downloaded_file)
    except Exception:
        metadata = {"duration_seconds": None, "format": None}

    video_id = uuid.uuid4()
    new_video = Video(
        id=video_id,
        uploaded_by=current_user.id,
        title=extracted_title if extracted_title else f"Online Video ({str(video_id)[:8]})",
        original_filename=os.path.basename(downloaded_file),
        storage_path=downloaded_file,
        duration_seconds=metadata["duration_seconds"],
        format=metadata["format"] or os.path.splitext(downloaded_file)[1].replace(".", "").upper(),
        file_size_bytes=file_size,
        status=VideoStatus.uploaded,
    )

    try:
        db.add(new_video)
        db.flush()

        log = ActivityLog(
            user_id=current_user.id,
            action="import_url_video",
            extra_data={"video_id": str(video_id), "url": url},
        )
        db.add(log)
        db.commit()
        db.refresh(new_video)
        return new_video
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving URL imported video to DB: {e}")
        raise HTTPException(status_code=500, detail=f"Database import error: {str(e)}")


@router.get("/", response_model=List[VideoResponse])
def list_videos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all videos. Administrators can view all videos; other roles view their videos or accessible videos.
    """
    if current_user.role == UserRole.administrator:
        videos = db.query(Video).order_by(Video.created_at.desc()).all()
    else:
        videos = (
            db.query(Video)
            .filter((Video.uploaded_by == current_user.id) | (Video.status == VideoStatus.completed))
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
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


import mimetypes

@router.get("/{video_id}/file")
def get_video_file(
    video_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    """Stream video file for HTML5 video player with HTTP Range (seeking) support."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video record not found")

    # Locate actual file on disk (handling cross-platform Windows/Linux path separators)
    file_path = video.storage_path
    if not os.path.exists(file_path):
        normalized_name = os.path.basename(video.storage_path.replace("\\", "/"))
        candidate = os.path.join(UPLOAD_DIR, normalized_name)
        if os.path.exists(candidate):
            file_path = candidate

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail="Video file not found on server disk. (If this video was uploaded locally or in a previous session, please upload it directly via this deployed site)."
        )

    media_type, _ = mimetypes.guess_type(file_path)
    if not media_type:
        media_type = "video/mp4"

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    if range_header:
        byte_start = 0
        byte_end = None
        match = re.search(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            groups = match.groups()
            byte_start = int(groups[0])
            if groups[1]:
                byte_end = int(groups[1])

        # 2MB chunks for smooth, fast seeking
        chunk_size = 2 * 1024 * 1024
        if byte_end is None:
            byte_end = min(byte_start + chunk_size, file_size - 1)
        else:
            byte_end = min(byte_end, file_size - 1)

        content_length = byte_end - byte_start + 1

        def iterfile():
            with open(file_path, "rb") as f:
                f.seek(byte_start)
                remaining = content_length
                while remaining > 0:
                    read_size = min(64 * 1024, remaining)
                    chunk = f.read(read_size)
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        headers = {
            "Content-Range": f"bytes {byte_start}-{byte_end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": media_type,
        }
        return StreamingResponse(iterfile(), status_code=206, headers=headers)

    headers = {
        "Accept-Ranges": "bytes",
    }
    return FileResponse(file_path, media_type=media_type, filename=video.original_filename, headers=headers)


@router.post("/{video_id}/process", response_model=VideoResponse)
def process_video(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Triggers AI processing workflow:
    1. Audio extraction & Speech-to-text Transcription (Whisper)
    2. AI Summarization (Short & Detailed Executive Summaries)
    3. Key Moments & Timestamp Highlight Detection
    4. Topic Keywords Extraction
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    video.status = VideoStatus.processing
    db.commit()

    try:
        # Step 1: Transcribe
        transcription_res = transcribe_video(video.storage_path, duration_seconds=video.duration_seconds or 0)
        video.transcript_text = transcription_res["text"]
        video.transcript_segments = transcription_res["segments"]
        video.language = transcription_res["language"]
        video.status = VideoStatus.transcribed
        db.commit()

        # Step 2: Summarize & Extract Keywords
        summaries_res = generate_summaries_and_keywords(
            title=video.title,
            transcript_text=video.transcript_text,
            segments=video.transcript_segments,
        )
        video.short_summary = summaries_res["short_summary"]
        video.detailed_summary = summaries_res["detailed_summary"]
        video.keywords = summaries_res["keywords"]
        video.status = VideoStatus.summarized
        db.commit()

        # Step 3: Key Moments
        key_moments = extract_key_moments(
            segments=video.transcript_segments,
            duration_seconds=video.duration_seconds or 0,
        )
        video.key_moments = key_moments
        video.status = VideoStatus.completed
        
        # Log Activity
        log = ActivityLog(
            user_id=current_user.id,
            action="process_video",
            extra_data={"video_id": str(video.id), "title": video.title},
        )
        db.add(log)

        db.commit()
        db.refresh(video)
        return video
    except Exception as e:
        logger.error(f"Failed to process video {video_id}: {e}")
        video.status = VideoStatus.failed
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")


@router.put("/{video_id}/transcript", response_model=VideoResponse)
def update_transcript(
    video_id: uuid.UUID,
    payload: TranscriptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update/edit transcript text (available to educators, creators, and admins).
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    video.transcript_text = payload.transcript_text
    if payload.segments is not None:
        video.transcript_segments = payload.segments

    db.commit()
    db.refresh(video)
    return video


@router.get("/{video_id}/export")
def export_video_data(
    video_id: uuid.UUID,
    format: str = Query("txt", regex="^(txt|json)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export video transcript, summaries, and key moments as TXT or JSON.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if format == "json":
        export_data = {
            "title": video.title,
            "duration_seconds": video.duration_seconds,
            "short_summary": video.short_summary,
            "detailed_summary": video.detailed_summary,
            "key_moments": video.key_moments,
            "keywords": video.keywords,
            "transcript": video.transcript_text,
            "segments": video.transcript_segments,
        }
        return export_data

    # Default TXT format
    lines = [
        f"Title: {video.title}",
        f"Duration: {video.duration_seconds} seconds",
        "=" * 50,
        "SHORT SUMMARY:",
        video.short_summary or "N/A",
        "=" * 50,
        "DETAILED SUMMARY:",
        video.detailed_summary or "N/A",
        "=" * 50,
        "KEY MOMENTS:",
    ]
    for km in (video.key_moments or []):
        lines.append(f"[{km.get('timestamp')}] {km.get('title')}: {km.get('description')}")
    
    lines.extend([
        "=" * 50,
        "FULL TRANSCRIPT:",
        video.transcript_text or "N/A"
    ])

    txt_content = "\n\n".join(lines)
    return Response(
        content=txt_content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={video.title}_summary.txt"}
    )


@router.post("/{video_id}/bookmark")
def bookmark_video(
    video_id: uuid.UUID,
    note: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bookmark a video or key highlight."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    bookmark = Bookmark(user_id=current_user.id, video_id=video.id, note=note)
    db.add(bookmark)
    db.commit()
    return {"status": "bookmarked", "bookmark_id": str(bookmark.id)}


@router.delete("/{video_id}")
def delete_video(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Authorize deletion: Administrators can delete any video, non-admins can ONLY delete videos they uploaded
    if (
        str(video.uploaded_by) != str(current_user.id)
        and current_user.role != UserRole.administrator
    ):
        raise HTTPException(status_code=403, detail="Not authorized to delete this video")

    # Delete associated bookmarks first to prevent foreign key errors
    try:
        db.query(Bookmark).filter(Bookmark.video_id == video_id).delete(synchronize_session=False)

        if video.storage_path and os.path.exists(video.storage_path):
            try:
                os.remove(video.storage_path)
            except Exception as e:
                logger.warning(f"Could not delete video storage file: {e}")

        db.delete(video)
        db.commit()
        return {"message": "Video deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete video {video_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")