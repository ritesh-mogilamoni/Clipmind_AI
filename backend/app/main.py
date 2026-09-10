from fastapi import FastAPI
from sqlalchemy import text
from app.db.postgres import engine
from app.db.models import Base
from app.api import auth, videos, analytics

from fastapi.middleware.cors import CORSMiddleware

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
except Exception as _db_init_err:
    import logging
    logging.getLogger(__name__).warning(f"Could not auto-create tables on startup: {_db_init_err}")

app = FastAPI(title="ClipMind AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev convenience, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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