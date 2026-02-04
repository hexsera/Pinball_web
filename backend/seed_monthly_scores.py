import os
import random
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from models import User, MonthlyScore

load_dotenv()

# DB 연결
DATABASE_URL = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DATABASE')}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_monthly_scores():
    """users 테이블의 ID를 기반으로 MonthlyScore Mock 데이터 생성"""
    db = SessionLocal()
    try:
        # users 테이블에서 모든 사용자 조회
        users = db.query(User).all()

        if not users:
            print("No users found in the database")
            return

        print(f"Found {len(users)} users")

        # 각 사용자마다 랜덤 점수 생성
        for user in users:
            # 기존 점수가 있는지 확인
            existing = db.query(MonthlyScore).filter(
                MonthlyScore.user_id == user.id
            ).first()

            if existing:
                print(f"User {user.id} ({user.nickname}) already has a score: {existing.score}")
                continue

            # 랜덤 점수 생성 (1000 ~ 50000)
            random_score = random.randint(1000, 50000)

            # MonthlyScore 생성
            monthly_score = MonthlyScore(
                user_id=user.id,
                nickname=user.nickname,
                score=random_score
            )
            db.add(monthly_score)
            print(f"Created score for user {user.id} ({user.nickname}): {random_score}")

        db.commit()
        print("Monthly scores seeding completed")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_monthly_scores()
