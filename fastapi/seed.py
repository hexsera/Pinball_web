import os
from datetime import datetime
from sqlalchemy.orm import Session
from models import User
from dotenv import load_dotenv

load_dotenv()


def seed_admin(db: Session) -> bool:
    """Admin 계정 시딩. 생성 시 True, 이미 존재 시 False 반환"""
    admin_email = os.getenv("ADMIN_EMAIL")

    # Admin 계정 존재 여부 확인
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    if existing_admin:
        print(f"Admin account already exists: {admin_email}")
        return False

    # Admin 계정 생성
    admin_user = User(
        email=admin_email,
        nickname=os.getenv("ADMIN_NICKNAME"),
        password=os.getenv("ADMIN_PASSWORD"),
        birth_date=datetime.strptime(os.getenv("ADMIN_BIRTH_DATE"), "%Y-%m-%d").date(),
        role="admin"
    )
    db.add(admin_user)
    db.commit()
    print(f"Admin account created: {admin_email}")
    return True
