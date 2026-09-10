import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

try:
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    # Test connection
    with engine.connect() as conn:
        pass
    logger.info("Successfully connected to PostgreSQL database.")
except Exception as e:
    logger.warning(f"Could not connect to PostgreSQL ({e}). Falling back to SQLite database...")
    engine = create_engine(
        "sqlite:///./clipmind.db",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()