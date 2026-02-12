from fastapi import FastAPI

# 새 구조의 모듈 import
from app.db.session import engine, SessionLocal, wait_for_db
from app.db.base import Base
from app.api.v1 import users, auth, scores, monthly_scores, high_scores, game_visits, friends

# 기존 seed.py 사용
from seed import seed_admin


# 부트스트랩
import os
def startup():
    """애플리케이션 시작 시 DB 초기화 및 시딩"""
    if not wait_for_db():
        raise Exception("Database connection failed after retries")

    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")

    print("Starting data seeding...")
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    print("Data seeding completed")


if os.getenv("TESTING") != "1":
    startup()

# FastAPI 앱 생성
app = FastAPI(title="Hexsera API", version="1.0.0")

# 라우터 등록
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(auth.router, prefix="/api/v1", tags=["Auth"])
app.include_router(scores.router, prefix="/api/v1/scores", tags=["Scores"])
app.include_router(monthly_scores.router, prefix="/api/v1/monthly-scores", tags=["Monthly Scores"])
app.include_router(high_scores.router, prefix="/api/v1/high-scores", tags=["High Scores"])
app.include_router(game_visits.router, prefix="/api/v1/game_visits", tags=["Game Visits"])
app.include_router(friends.router, prefix="/api/friend-requests", tags=["Friends"])


# 헬스 체크 엔드포인트
@app.get("/api/")
def health_check():
    return {"status": "ok", "message": "FastAPI is running"}


@app.get("/api/test")
def api_test():
    return {"status": "ok", "message": "API test endpoint"}
