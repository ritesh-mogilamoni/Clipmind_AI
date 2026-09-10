from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

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
    Returns role-specific analytics and activity summary.
    """
    # Total videos user has access to
    if current_user.role == UserRole.administrator:
        video_query = db.query(Video)
    else:
        video_query = db.query(Video).filter(
            (Video.uploaded_by == current_user.id) | (Video.status == VideoStatus.completed)
        )

    total_videos = video_query.count()
    completed_videos = video_query.filter(Video.status == VideoStatus.completed).count()
    processing_videos = video_query.filter(Video.status == VideoStatus.processing).count()

    total_duration_sec = video_query.with_entities(func.sum(Video.duration_seconds)).scalar() or 0.0

    # User activity logs
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
        .all()
    )

    activities = [
        {
            "id": str(log.id),
            "action": log.action,
            "extra_data": log.extra_data,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]

    return {
        "user_role": current_user.role,
        "total_videos": total_videos,
        "completed_videos": completed_videos,
        "processing_videos": processing_videos,
        "total_duration_minutes": round(total_duration_sec / 60.0, 1),
        "recent_activities": activities,
    }


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
            "role": u.role,
            "videos_count": v_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return results
