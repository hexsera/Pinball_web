"""
POST /api/v1/monthly-scores 랜덤 데이터 삽입 스크립트

- DB 유저 중 최대 20명을 랜덤 선택
- 각 유저에 랜덤 점수를 2~3회 전송 (upsert 로직 검증)
- 이번 달 기존 데이터는 삽입 전 제거

사용법 (컨테이너 내부에서 실행):
  docker compose exec fastapi python scripts/mock/test_monthly_scores_post.py
  docker compose exec fastapi python scripts/mock/test_monthly_scores_post.py --count 10
"""

import sys
import random
import argparse

sys.path.insert(0, '/code')

from app.db.session import SessionLocal
from models import User, MonthlyScore
from app.api.v1.monthly_scores import create_or_update_monthly_score, get_current_month_range
from app.schemas.monthly_score import MonthlyScoreCreateRequest


def call_post(db, user_id: int, score: int):
    req = MonthlyScoreCreateRequest(user_id=user_id, score=score)
    return create_or_update_monthly_score(score_data=req, db=db)


def run(count: int):
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("[ERROR] DB에 유저가 없습니다. seed_mock_data.py 먼저 실행하세요.")
            sys.exit(1)

        targets = random.sample(users, min(count, len(users)))
        print(f"대상 유저 {len(targets)}명에게 랜덤 점수 삽입")
        print("-" * 55)

        # 이번 달 기존 데이터 일괄 제거
        start, end = get_current_month_range()
        target_ids = [u.id for u in targets]
        deleted = db.query(MonthlyScore).filter(
            MonthlyScore.user_id.in_(target_ids),
            MonthlyScore.created_at >= start,
            MonthlyScore.created_at <= end,
        ).delete(synchronize_session=False)
        db.commit()
        if deleted:
            print(f"기존 데이터 {deleted}건 제거\n")

        for user in targets:
            # 2~3회 랜덤 점수 전송 → 최고값만 남아야 함
            scores = sorted([random.randint(1000, 999999) for _ in range(random.randint(2, 3))])
            expected = scores[-1]

            for s in scores:
                call_post(db, user.id, s)

            # 실제 저장값 확인
            row = db.query(MonthlyScore).filter(
                MonthlyScore.user_id == user.id,
                MonthlyScore.created_at >= start,
                MonthlyScore.created_at <= end,
            ).first()
            saved = row.score if row else None
            ok = saved == expected
            sent_str = ", ".join(str(s) for s in scores)
            print(f"  id={user.id:<4} {user.nickname:<12} | 전송={sent_str} | DB={saved} | {'OK' if ok else 'FAIL'}")

        print("-" * 55)
        print(f"완료: {len(targets)}명 삽입")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=20, help="삽입할 유저 수 (기본: 20)")
    args = parser.parse_args()
    run(args.count)
