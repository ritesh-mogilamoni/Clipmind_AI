import logging
from app.db.postgres import engine
from app.db.models import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_all_tables():
    logger.info("Connecting to database and creating tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")

if __name__ == "__main__":
    create_all_tables()
