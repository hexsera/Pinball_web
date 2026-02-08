# backend/app/api/deps.py
from sqlalchemy.orm import Session
from app.db.session import SessionLocal


def get_db():
    """DB 세션 의존성 - 모든 라우터에서 재사용"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
