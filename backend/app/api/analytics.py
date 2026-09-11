from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from collections import Counter
from datetime import datetime, timezone, timedelta

from app.db.postgres import get_db
from app.db.models import User, Video, VideoStatus, ActivityLog, UserRole
from app.core.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns role-specific analytics, weekly processing velocity, AI content insights,
    video reports catalog, and platform utilization metrics.
    """
    if current_user.role == UserRole.administrator:
        video_query = db.query(Video)
    elif current_user.role == UserRole.content_creator:
        video_query = db.query(Video).filter(Video.uploaded_by == current_user.id)
    elif current_user.role == UserRole.educator:
        video_query = db.query(Video).filter(Video.uploaded_by == current_user.id)
    else:
        video_query = db.query(Video).filter(
            (Video.visibility == "public") & (Video.status == VideoStatus.completed)
        )

    all_videos = video_query.order_by(Video.created_at.desc()).all()

    total_videos = len(all_videos)
    completed_videos = sum(1 for v in all_videos if v.status == VideoStatus.completed)
    processing_videos = sum(1 for v in all_videos if v.status == VideoStatus.processing)
    failed_videos = sum(1 for v in all_videos if v.status == VideoStatus.failed)

    total_duration_sec = sum(v.duration_seconds or 0.0 for v in all_videos)
    total_storage_bytes = sum(v.file_size_bytes or 0 for v in all_videos)

    total_transcripts = sum(1 for v in all_videos if v.transcript_text and v.transcript_text.strip())
    total_summaries = sum(1 for v in all_videos if v.short_summary and v.short_summary.strip())
    total_key_moments = sum(
        len(v.key_moments) for v in all_videos if v.key_moments and isinstance(v.key_moments, list)
    )

    avg_video_duration_seconds = round(total_duration_sec / total_videos, 1) if total_videos > 0 else 0.0
    success_rate = round((completed_videos / total_videos * 100.0), 1) if total_videos > 0 else 100.0

    # 1. Weekly timeline: Last 7 days processing velocity
    now = datetime.now(timezone.utc)
    days_map = {}
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_str = day_date.strftime("%Y-%m-%d")
        day_label = day_date.strftime("%a")
        days_map[day_str] = {"date": day_str, "day": day_label, "count": 0, "completed": 0}

    for v in all_videos:
        if v.created_at:
            v_date = v.created_at.date() if hasattr(v.created_at, "date") else None
            if v_date:
                d_str = v_date.strftime("%Y-%m-%d")
                if d_str in days_map:
                    days_map[d_str]["count"] += 1
                    if v.status == VideoStatus.completed:
                        days_map[d_str]["completed"] += 1

    weekly_timeline = list(days_map.values())

    # 2. AI Content Insights: Top Topics & Keywords
    kw_counter = Counter()
    for v in all_videos:
        if v.keywords and isinstance(v.keywords, list):
            for kw in v.keywords:
                if isinstance(kw, str) and kw.strip():
                    clean_kw = kw.strip().title()
                    kw_counter[clean_kw] += 1

    top_keywords = [{"keyword": k, "count": c} for k, c in kw_counter.most_common(12)]

    # 3. Processed Video Summary Reports Catalog
    video_reports = []
    for v in all_videos:
        km_count = len(v.key_moments) if v.key_moments and isinstance(v.key_moments, list) else 0
        km_samples = []
        if v.key_moments and isinstance(v.key_moments, list):
            for km in v.key_moments[:4]:
                if isinstance(km, dict):
                    km_samples.append({
                        "timestamp": km.get("timestamp", "0:00"),
                        "title": km.get("title", ""),
                    })

        video_reports.append({
            "id": str(v.id),
            "title": v.title,
            "duration_seconds": v.duration_seconds or 0,
            "has_transcript": bool(v.transcript_text and v.transcript_text.strip()),
            "has_summary": bool(v.short_summary and v.short_summary.strip()),
            "key_moments_count": km_count,
            "status": v.status.value if hasattr(v.status, "value") else str(v.status),
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "keywords": (v.keywords or [])[:4] if isinstance(v.keywords, list) else [],
            "key_moments_preview": km_samples,
        })

    # 4. Activity Logs
    if current_user.role == UserRole.administrator:
        logs_query = db.query(ActivityLog)
    else:
        logs_query = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id)

    logs = logs_query.order_by(ActivityLog.created_at.desc()).limit(20).all()

    activities = []
    for log in logs:
        u = db.query(User).filter(User.id == log.user_id).first()
        activities.append({
            "id": str(log.id),
            "user_id": str(log.user_id),
            "user_name": u.name if u else "User",
            "user_email": u.email if u else "",
            "action": log.action,
            "extra_data": log.extra_data,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    # 5. Admin System Metrics
    admin_metrics = None
    if current_user.role == UserRole.administrator:
        total_users = db.query(User).count()
        users_by_role = {
            role.value: db.query(User).filter(User.role == role).count()
            for role in UserRole
        }
        total_system_storage = db.query(func.sum(Video.file_size_bytes)).scalar() or 0
        admin_metrics = {
            "total_users": total_users,
            "users_by_role": users_by_role,
            "total_storage_mb": round(total_system_storage / (1024 * 1024), 2),
            "total_system_videos": db.query(Video).count(),
        }

    classroom_engagement = []
    if current_user.role in {UserRole.educator, UserRole.administrator}:
        my_video_ids = {str(v.id) for v in all_videos}
        study_logs = (
            db.query(ActivityLog)
            .filter(ActivityLog.action == "study_video")
            .order_by(ActivityLog.created_at.desc())
            .limit(50)
            .all()
        )
        for log in study_logs:
            vid_id = (log.extra_data or {}).get("video_id")
            if current_user.role == UserRole.administrator or (vid_id and vid_id in my_video_ids):
                student = db.query(User).filter(User.id == log.user_id).first()
                classroom_engagement.append({
                    "student_name": student.name if student else "Anonymous Learner",
                    "student_email": student.email if student else "N/A",
                    "lecture_title": (log.extra_data or {}).get("title", "Course Lecture"),
                    "studied_at": log.created_at.isoformat() if log.created_at else None,
                })

    from app.services.cloudinary_service import is_cloudinary_configured
    system_settings = {
        "storage_provider": "Cloudinary CDN (Active & Connected)" if is_cloudinary_configured() else "Local Filesystem Storage (uploads/)",
        "stt_engine": "Whisper Large V3 (via Groq Cloud)",
        "nlp_engine": "Meta LLaMA 3.3 70B Versatile (via Groq Cloud)",
        "database": "PostgreSQL (Neon Serverless)",
        "max_upload_size": "500 MB",
        "supported_formats": "MP4, MOV, AVI, WEBM, MKV",
        "version": "v1.0.0 Production",
        "system_status": "All Systems Operational & Healthy",
    }

    return {
        "user_role": current_user.role,
        "total_videos": total_videos,
        "completed_videos": completed_videos,
        "processing_videos": processing_videos,
        "failed_videos": failed_videos,
        "total_duration_minutes": round(total_duration_sec / 60.0, 1),
        "total_transcripts": total_transcripts,
        "total_summaries": total_summaries,
        "total_key_moments": total_key_moments,
        "success_rate": success_rate,
        "avg_video_duration_seconds": avg_video_duration_seconds,
        "total_storage_mb": round(total_storage_bytes / (1024 * 1024), 2),
        "weekly_timeline": weekly_timeline,
        "top_keywords": top_keywords,
        "video_reports": video_reports,
        "recent_activities": activities,
        "classroom_engagement": classroom_engagement,
        "admin_metrics": admin_metrics,
        "system_settings": system_settings,
    }


from pydantic import BaseModel

class RoleUpdateRequest(BaseModel):
    role: UserRole


@router.get("/admin/users")
def get_admin_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Administrator endpoint to view all system users and platform utilization.
    """
    if current_user.role != UserRole.administrator:
        raise HTTPException(status_code=403, detail="Administrator access required")

    users = db.query(User).all()
    results = []
    for u in users:
        v_count = db.query(Video).filter(Video.uploaded_by == u.id).count()
        results.append({
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, "value") else str(u.role),
            "videos_count": v_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return results


@router.patch("/admin/users/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Administrator endpoint to change or elevate any user's role.
    """
    if current_user.role != UserRole.administrator:
        raise HTTPException(status_code=403, detail="Administrator access required")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.role = payload.role
    db.commit()
    db.refresh(target_user)
    return {
        "status": "success",
        "message": f"Updated {target_user.name}'s role to {payload.role.value}",
        "user": {
            "id": str(target_user.id),
            "name": target_user.name,
            "email": target_user.email,
            "role": target_user.role.value if hasattr(target_user.role, "value") else str(target_user.role),
        }
    }


@router.get("/admin/jobs")
def get_admin_processing_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Administrator endpoint to monitor all AI video processing jobs.
    """
    if current_user.role != UserRole.administrator:
        raise HTTPException(status_code=403, detail="Administrator access required")

    videos = db.query(Video).order_by(Video.created_at.desc()).limit(50).all()
    results = []
    for v in videos:
        uploader = db.query(User).filter(User.id == v.uploaded_by).first()
        results.append({
            "id": str(v.id),
            "title": v.title,
            "uploader_name": uploader.name if uploader else "Unknown",
            "uploader_email": uploader.email if uploader else "Unknown",
            "status": v.status.value if hasattr(v.status, "value") else str(v.status),
            "duration_seconds": v.duration_seconds or 0,
            "has_transcript": bool(v.transcript_text and v.transcript_text.strip()),
            "has_summary": bool(v.short_summary and v.short_summary.strip()),
            "key_moments_count": len(v.key_moments) if v.key_moments and isinstance(v.key_moments, list) else 0,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        })
    return results
