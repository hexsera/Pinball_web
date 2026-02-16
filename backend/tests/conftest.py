# conftest.py 최상단에 추가 (다른 import보다 먼저)
import os
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.api.deps import get_db
from main import app

# 테스트용 PostgreSQL 데이터베이스
TEST_DATABASE_URL = "postgresql+psycopg2://hexsera:hexpoint@postgres-server:5432/hexdb_test"

test_engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# FK 의존성 역순으로 TRUNCATE (자식 테이블 먼저)
TABLES_TO_TRUNCATE = [
    "friendships",
    "monthly_scores",
    "game_visits",
    "users",
]


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """테스트 시작 전 테이블 생성, 종료 후 삭제"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function", autouse=True)
def truncate_tables():
    """각 테스트 종료 후 모든 테이블 초기화 (auto-increment 시퀀스 포함)"""
    yield
    with test_engine.connect() as conn:
        for table in TABLES_TO_TRUNCATE:
            conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
        conn.commit()


@pytest.fixture(scope="function")
def db_session():
    """프로덕션과 동일한 독립 세션 - commit()이 실제로 DB에 반영됨"""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """테스트용 FastAPI 클라이언트 (테스트 DB 사용)"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def sample_users(db_session):
    """테스트용 사용자 2명 생성"""
    from models import User
    from datetime import date

    user1 = User(
        email="user1@test.com",
        nickname="User1",
        password="password1",
        birth_date=date(2000, 1, 1),
        role="user"
    )
    user2 = User(
        email="user2@test.com",
        nickname="User2",
        password="password2",
        birth_date=date(2000, 1, 2),
        role="user"
    )

    db_session.add(user1)
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user1)
    db_session.refresh(user2)

    return [user1, user2]
