import sys
import random
from datetime import datetime, timedelta

sys.path.insert(0, '/code')

from faker import Faker
from app.db.session import SessionLocal
from models import User, Friendship, GameVisit

fake = Faker('ko_KR')


def create_mock_friendships(db, count=80):
    users = db.query(User).all()
    user_ids = [u.id for u in users]
    existing_pairs = set()
    created = 0

    while created < count:
        a, b = random.sample(user_ids, 2)
        pair = (min(a, b), max(a, b))
        if pair in existing_pairs:
            continue
        existing_pairs.add(pair)
        days_ago = random.randint(0, 90)
        friendship = Friendship(
            requester_id=a,
            receiver_id=b,
            status=random.choice(['pending', 'accepted', 'rejected']),
            created_at=datetime.utcnow() - timedelta(days=days_ago)
        )
        db.add(friendship)
        created += 1
    db.commit()


def create_mock_game_visits(db, count=200):
    users = db.query(User).all()
    user_ids = [u.id for u in users]

    for _ in range(count):
        uid = None if random.random() < 0.3 else random.choice(user_ids)
        days_ago = random.randint(0, 60)
        created = datetime.utcnow() - timedelta(days=days_ago)
        visit = GameVisit(
            user_id=uid,
            ip_address=fake.ipv4(),
            is_visits=True,
            created_at=created,
            updated_at=created
        )
        db.add(visit)
    db.commit()


def main():
    db = SessionLocal()
    try:
        print("Mock friendships 80건 생성 중...")
        create_mock_friendships(db, count=80)
        print("friendships 생성 완료")

        print("Mock game_visits 200건 생성 중...")
        create_mock_game_visits(db, count=200)
        print("game_visits 생성 완료")

        print("완료!")
    except Exception as e:
        db.rollback()
        print(f"오류: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
