from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    mongo_uri: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = ".env"

settings = Settings()