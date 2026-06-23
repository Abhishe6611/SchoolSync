from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGODB_URL: str
    MONGODB_DB_NAME: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 1 day
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    LICENSE_SECRET_KEY: str = "super_secret_master_license_key_for_this_deployment"

    class Config:
        env_file = ".env"


settings = Settings()
