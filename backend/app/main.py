from fastapi import FastAPI
from sqlalchemy import text
from app.db.postgres import engine
from app.db.mongo import mongo_db
from app.api import auth, videos

from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/db")
async def health_db():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    await mongo_db.command("ping")

    return {"postgres": "connected", "mongo": "connected"}