from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    openai_api_key: str | None = None
    groq_api_key: str | None = None
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_url: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()