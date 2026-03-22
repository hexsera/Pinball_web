# fastapi/app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """애플리케이션 설정"""
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # API Key
    API_KEY: str = os.getenv("API_KEY")

    # Admin Seeding
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL")
    ADMIN_NICKNAME: str = os.getenv("ADMIN_NICKNAME")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD")
    ADMIN_BIRTH_DATE: str = os.getenv("ADMIN_BIRTH_DATE")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "postmessage")

    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

settings = Settings()
