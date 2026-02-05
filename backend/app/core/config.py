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

settings = Settings()
