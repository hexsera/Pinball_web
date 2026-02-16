# conftest.py 최상단에 추가 (다른 import보다 먼저)
import os
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.api.deps import get_db
from main import app

# 테스트용 PostgreSQL 데이터베이스
TEST_DATABASE_URL = "postgresql+psycopg2://hexsera:hexpoint@postgres-server:5432/hexdb_test"

test_engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """테스트 시작 전 테이블 생성, 종료 후 삭제"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """각 테스트마다 트랜잭션 생성 및 롤백 (프로덕션과 동일한 세션 방식)"""
    connection = test_engine.connect()
    transaction = connection.begin()

    # Engine에 bind된 세션 생성 (프로덕션과 동일하게 db.get_bind()가 Engine을 반환)
    session = TestSessionLocal()

    # session.commit() 호출 시 실제 커밋 대신 SAVEPOINT로 처리
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, trans):
        if trans.nested and not trans._parent.nested:
            session.begin_nested()

    # 세션의 실제 쿼리 실행을 외부 connection으로 연결
    session.connection(bind_arguments={"bind": connection})
    session.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


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
