import random
from datetime import datetime, timedelta
from database import SessionLocal
from models import GameVisit

def create_mock_game_visits(days: int = 30):
    """게임 접속 기록 Mock 데이터 생성"""
    db = SessionLocal()
    try:
        today = datetime.now()

        for day_offset in range(days):
            visit_date = today - timedelta(days=day_offset)
            # 하루에 랜덤하게 5~20명 접속
            num_visits = random.randint(5, 20)

            for i in range(num_visits):
                # 랜덤 IP 생성
                ip = f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}"
                # 50% 확률로 user_id 할당
                user_id = random.randint(1, 10) if random.random() > 0.5 else None

                # 랜덤 시간 설정 (0~23시)
                visit_time = visit_date.replace(
                    hour=random.randint(0, 23),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )

                visit = GameVisit(
                    user_id=user_id,
                    ip_address=ip,
                    is_visits=True,
                    created_at=visit_time
                )
                db.add(visit)

        db.commit()
        print(f"Mock data created: {days}일 동안 접속 기록 생성 완료")
    except Exception as e:
        db.rollback()
        print(f"Error creating mock data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_mock_game_visits(30)
