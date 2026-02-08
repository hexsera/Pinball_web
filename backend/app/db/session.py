# backend/app/db/session.py
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# DATABASE_URL을 settings에서 가져옴
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def wait_for_db(max_retries: int = 10, delay: int = 2) -> bool:
    """DB 연결 대기 (재시도 로직)"""
    retries = 0
    print("start Database connect")
    while retries < max_retries:
        try:
            with engine.connect() as conn:
                print("Database connected successfully")
                return True
        except Exception as e:
            retries += 1
            print(f"Database connection failed (attempt {retries}/{max_retries}): {e}")
            if retries < max_retries:
                time.sleep(delay)
    return False
