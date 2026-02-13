import sys
import os
import random
from datetime import datetime, timedelta

sys.path.insert(0, '/code')

from faker import Faker
from app.db.session import SessionLocal
from models import User, MonthlyScore

fake = Faker('ko_KR')


def _unique_korean_nickname(used: set) -> str:
    for _ in range(100):
        nickname = fake.last_name() + fake.first_name()
        if nickname not in used:
            used.add(nickname)
            return nickname
    raise ValueError("중복되지 않는 닉네임 생성 실패")


def create_mock_users(db, count=50):
    users = []
    used_nicknames = set()
    for _ in range(count):
        user = User(
            email=fake.unique.email(),
            nickname=_unique_korean_nickname(used_nicknames),
            password="password123!",
            birth_date=fake.date_of_birth(minimum_age=15, maximum_age=60),
            role='user'
        )
        db.add(user)
    db.commit()
    db.expire_all()

    users = db.query(User).filter(User.role == 'user').order_by(User.id.desc()).limit(count).all()
    return users


def create_mock_monthly_scores(db, users):
    for user in users:
        days_ago = random.randint(0, 30)
        score = MonthlyScore(
            user_id=user.id,
            nickname=user.nickname,
            score=random.randint(1000, 59999),
            created_at=datetime.utcnow() - timedelta(days=days_ago)
        )
        db.add(score)
    db.commit()


def main():
    db = SessionLocal()
    try:
        print("Mock 사용자 50명 생성 중...")
        users = create_mock_users(db, count=50)
        print(f"사용자 {len(users)}명 생성 완료")

        print("Mock 월간 점수 생성 중...")
        create_mock_monthly_scores(db, users)
        print(f"월간 점수 {len(users)}개 생성 완료")

        print("완료!")
    except Exception as e:
        db.rollback()
        print(f"오류: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
