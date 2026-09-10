from fastapi import FastAPI, Request, Depends
import os
import re
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.postgres import engine, get_db
from app.db.models import Base, Video
from app.api import auth, videos, analytics

from fastapi.middleware.cors import CORSMiddleware

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
except Exception as _db_init_err:
    import logging
    logging.getLogger(__name__).warning(f"Could not auto-create tables on startup: {_db_init_err}")

app = FastAPI(title="ClipMind AI")

@app.middleware("http")
async def normalize_double_slashes(request: Request, call_next):
    raw_path = request.scope.get("path", "")
    if "//" in raw_path:
        request.scope["path"] = re.sub(r"/+", "/", raw_path)
    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev convenience, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)

app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(analytics.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
def health_db():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    return {"postgres": "connected", "status": "healthy"}


@app.get("/debug/files")
def debug_files(db: Session = Depends(get_db)):
    upload_files = os.listdir("uploads") if os.path.exists("uploads") else []
    videos = db.query(Video).order_by(Video.created_at.desc()).limit(10).all()
    return {
        "cwd": os.getcwd(),
        "uploads_dir_exists": os.path.exists("uploads"),
        "files_in_uploads": upload_files,
        "recent_videos": [
            {
                "id": str(v.id),
                "title": v.title,
                "original_filename": v.original_filename,
                "format": v.format,
                "storage_path": v.storage_path,
                "file_exists_on_disk": os.path.exists(v.storage_path) or os.path.exists(os.path.join("uploads", os.path.basename(v.storage_path.replace("\\", "/")))),
                "created_at": str(v.created_at),
            }
            for v in videos
        ],
    }