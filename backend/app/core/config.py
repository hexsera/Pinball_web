# fastapi/app/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """애플리케이션 설정"""
    # Database
    MYSQL_HOST: str = os.getenv("MYSQL_HOST")
    MYSQL_PORT: str = os.getenv("MYSQL_PORT")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE")
    MYSQL_USER: str = os.getenv("MYSQL_USER")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD")

    # API Key
    API_KEY: str = os.getenv("API_KEY")

    # Admin Seeding
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL")
    ADMIN_NICKNAME: str = os.getenv("ADMIN_NICKNAME")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD")
    ADMIN_BIRTH_DATE: str = os.getenv("ADMIN_BIRTH_DATE")

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"

settings = Settings()
