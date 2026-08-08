from app.db.postgres import engine, Base
from app.db import models  # noqa: F401 (import so models are registered)

Base.metadata.create_all(bind=engine)
print("Tables created successfully.")