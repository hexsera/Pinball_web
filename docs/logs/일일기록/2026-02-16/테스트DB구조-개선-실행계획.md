# 테스트 DB 구조 개선 실행계획

## 요구사항 요약

**요구사항**: 테스트 환경을 프로덕션 환경과 동일한 세션 구조로 동작하도록 `conftest.py`를 재작성한다.

**목적**: 현재 SAVEPOINT 트릭 기반 구조가 프로덕션 코드의 `db.commit() → db.refresh()` 패턴과 충돌하여 테스트가 실패한다. 프로덕션과 동일하게 실제 `commit()`이 실행되는 환경에서 테스트 격리를 보장해야 한다.

---

## 현재상태 분석

현재 `conftest.py`의 `db_session` fixture는 SAVEPOINT(`begin_nested`) 기반으로 동작한다:
- 외부 트랜잭션을 열고, 세션을 그 connection에 바인딩한 뒤, `begin_nested()`로 SAVEPOINT를 생성
- `after_transaction_end` 이벤트로 `commit()` 호출 시 SAVEPOINT를 재시작하여 실제 커밋을 막음
- 테스트 종료 후 외부 트랜잭션을 `rollback()`하여 데이터를 초기화

**실패 원인**: 프로덕션 API가 `db.commit()` 직후 즉시 `db.refresh()`를 호출한다. `after_transaction_end` 이벤트는 비동기적으로 발생하므로, 새 SAVEPOINT 시작 전에 `refresh()`가 호출되면 인스턴스가 expired 상태로 `InvalidRequestError`가 발생한다. `friends.py`, `users.py`, `scores.py`, `monthly_scores.py` 전체에 이 패턴이 존재하여 근본적으로 해결 불가능하다.

---

## 구현 방법

**TRUNCATE 기반 테스트 격리**로 전환한다:
- 각 테스트 전에 모든 테이블을 `TRUNCATE ... RESTART IDENTITY CASCADE`로 비운다
- 세션은 프로덕션과 동일하게 `SessionLocal()`로 생성하고, `commit()`이 실제로 DB에 반영된다
- 테스트 종료 후 다시 TRUNCATE하여 다음 테스트를 위한 깨끗한 상태를 만든다
- 이 방식은 SQLAlchemy 공식 문서 및 FastAPI 공식 테스트 가이드에서 권장하는 표준 방식이다

**SAVEPOINT 방식 대비 차이**:
- SAVEPOINT: 실제 커밋이 일어나지 않아 프로덕션 코드와 동작 차이 발생
- TRUNCATE: 실제 커밋이 일어나며 프로덕션 코드와 100% 동일한 세션 동작 보장

---

## 구현 단계

### 1. `conftest.py` 전면 재작성

```python
# backend/tests/conftest.py
import os
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.api.deps import get_db
from main import app

TEST_DATABASE_URL = "postgresql+psycopg2://hexsera:hexpoint@postgres-server:5432/hexdb_test"

test_engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# 테이블 생성/삭제 순서 (FK 의존성 역순으로 삭제)
TABLES_TO_TRUNCATE = [
    "friendships",
    "monthly_scores",
    "game_visits",
    "scores",
    "users",
]


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """세션 시작 시 테이블 생성, 종료 시 삭제"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function", autouse=True)
def truncate_tables():
    """각 테스트 전후로 테이블 초기화"""
    yield
    with test_engine.connect() as conn:
        for table in TABLES_TO_TRUNCATE:
            conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
        conn.commit()


@pytest.fixture(scope="function")
def db_session():
    """프로덕션과 동일한 독립 세션 - commit()이 실제로 반영됨"""
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
```

- **무엇을 하는가**: SAVEPOINT 구조를 제거하고 실제 commit/refresh가 동작하는 독립 세션으로 전환
- `truncate_tables` fixture가 `autouse=True`이므로 모든 테스트 함수 이후 자동으로 실행됨
- `TRUNCATE ... RESTART IDENTITY CASCADE`: 데이터 삭제 + auto-increment 시퀀스 초기화 + FK 연관 테이블 연쇄 삭제
- `sample_users`에서 `commit() + refresh()` 정상 동작 — 이제 실제 커밋이 실행되므로 문제 없음
- `test_friend_requests.py`의 `db_session.flush()` → `db_session.commit()`으로 되돌려야 함 (프로덕션과 동일)

### 2. `test_friend_requests.py` 내 `flush()` → `commit()`으로 복원

```python
# backend/tests/test_friend_requests.py
# 변경 전 (이전에 잘못 수정된 상태)
db_session.add(friendship)
db_session.flush()

# 변경 후 (프로덕션과 동일하게)
db_session.add(friendship)
db_session.commit()
```

- **무엇을 하는가**: SAVEPOINT 구조에서 임시 우회용으로 사용하던 `flush()`를 실제 `commit()`으로 복원
- TRUNCATE 방식에서는 commit이 실제로 실행되므로 이후 API 호출 시 DB에서 데이터를 정상 조회 가능
- 총 4곳 (`test_cannot_send_duplicate_friend_request`, `test_cannot_send_reverse_friend_request_when_pending`, `test_cannot_send_reverse_friend_request_when_accepted`, `test_cannot_send_reverse_friend_request_when_rejected`)

### 3. pytest 전체 실행으로 검증

```bash
docker compose exec fastapi pytest -v
```

- **무엇을 하는가**: 11개 전체 테스트가 PASSED인지 확인
- 각 테스트 종료 후 `truncate_tables` fixture가 자동 실행되어 다음 테스트를 위한 초기 상태 보장
- `sample_users`의 `commit() + refresh()` 정상 동작 확인

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/tests/conftest.py` | 수정 | SAVEPOINT 구조 제거 → TRUNCATE 기반 독립 세션으로 전면 재작성 |
| `backend/tests/test_friend_requests.py` | 수정 | `db_session.flush()` 4곳 → `db_session.commit()`으로 복원 |

---

## 완료 체크리스트

- [ ] `docker compose exec fastapi pytest -v` 실행 시 11개 전체 PASSED
- [ ] `test_friend_requests.py` 8개 테스트 모두 PASSED
- [ ] `test_example.py`, `test_monthly_scores_fk.py`, `test_testdb.py` 기존 3개 PASSED 유지
- [ ] 각 테스트가 독립적으로 실행 가능한지 확인: `pytest tests/test_friend_requests.py -v --count=2` 반복 실행 시 동일 결과
- [ ] `sample_users` fixture에서 `commit() + refresh()` 오류 없음
