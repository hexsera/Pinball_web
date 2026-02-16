# pytest testDB 세션 환경 일치 실행계획

## 요구사항 요약

**요구사항**: pytest의 `db_session()` fixture가 프로덕션 DB 세션과 동일한 방식으로 동작하도록 수정한다. DB만 `hexdb_test`를 사용하고, 세션 생성 방식은 프로덕션과 동일해야 한다.

**목적**: 현재 테스트 세션이 `bind=connection`으로 생성되어 프로덕션과 다른 환경에서 동작한다. 이로 인해 프로덕션에서는 정상이지만 테스트에서만 오류가 발생하는 문제를 해결한다. 또한 SQLAlchemy 2.0 방식으로 통일한다.

## 현재상태 분석

1. **프로덕션 `get_db()`**: `SessionLocal()`로 세션을 생성한다. bind 없이 sessionmaker에 설정된 engine을 사용한다.
2. **테스트 `db_session()`**: `TestSessionLocal(bind=connection)`으로 세션을 생성한다. 이미 sessionmaker에 bind가 있는데 또 connection을 bind로 전달하여 세션의 동작이 프로덕션과 달라진다.
3. **SQLAlchemy 1.x 레거시 코드**: `declarative_base()` 함수를 사용 중이다. SQLAlchemy 2.0에서는 `DeclarativeBase` 클래스 상속 방식이 표준이다.
4. **테스트 격리 방식**: connection-level 트랜잭션 롤백 패턴을 사용하는데, `bind=connection` 때문에 세션 동작 차이가 발생한다.

## 구현 방법

SQLAlchemy 2.0 공식 문서의 "Joining a Session into an External Transaction" 패턴을 적용한다. 이 패턴은 테스트에서 connection을 열고 트랜잭션을 시작한 뒤, `Session(bind=connection)`이 아닌 `session.begin_nested()`(SAVEPOINT)를 사용하여 세션이 프로덕션과 동일하게 동작하면서도 테스트 후 롤백이 가능하다.

## 구현 단계

### 1. `session.py`에서 `declarative_base()` → `DeclarativeBase` 클래스로 변경

```python
# backend/app/db/session.py
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def wait_for_db(max_retries: int = 10, delay: int = 2) -> bool:
    """DB 연결 대기 (재시도 로직)"""
    retries = 0
    print("start Database connect")
    while retries < max_retries:
        try:
            with engine.connect() as conn:
                print("Database connected successfully")
                return True
        except Exception as e:
            retries += 1
            print(f"Database connection failed (attempt {retries}/{max_retries}): {e}")
            if retries < max_retries:
                time.sleep(delay)
    return False
```
- **무엇을 하는가**: SQLAlchemy 2.0 표준 방식으로 Base 클래스를 변경한다.
- `declarative_base()` 함수 호출 → `DeclarativeBase` 클래스 상속으로 변경
- `from sqlalchemy.ext.declarative import declarative_base` import를 제거한다
- 기존 모든 모델이 `Base`를 상속하고 있으므로 모델 코드 변경은 불필요하다

### 2. `conftest.py`의 `db_session()` fixture를 프로덕션과 동일한 세션 생성 방식으로 변경

```python
# backend/tests/conftest.py
import os
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from app.db.base import Base
from app.api.deps import get_db
from main import app

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

    # 프로덕션과 동일하게 sessionmaker로 세션 생성 (bind=connection 사용하지 않음)
    session = TestSessionLocal()

    # 세션의 connection을 외부 트랜잭션에 연결
    session.bind = connection

    # session.commit() 호출 시 실제 커밋 대신 SAVEPOINT 사용
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, trans):
        if trans.nested and not trans._parent.nested:
            session.begin_nested()

    session.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```
- **무엇을 하는가**: 세션 생성을 프로덕션 방식(`TestSessionLocal()`)과 동일하게 하되, SAVEPOINT 패턴으로 테스트 격리를 유지한다.
- `TestSessionLocal(bind=connection)` → `TestSessionLocal()`로 변경하여 프로덕션과 세션 생성 방식을 일치시킨다
- `session.begin_nested()`로 SAVEPOINT를 생성하여 테스트 내 commit이 실제 DB에 반영되지 않도록 한다
- `after_transaction_end` 이벤트로 SAVEPOINT가 끝나면 자동으로 새 SAVEPOINT를 시작한다
- 외부 트랜잭션(`transaction`)은 테스트 종료 시 rollback하여 데이터를 원복한다

### 3. `client` fixture는 동일하게 유지

```python
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
```
- **무엇을 하는가**: 기존 client fixture는 변경 없이 유지한다.
- `db_session`이 이미 프로덕션과 동일한 방식으로 생성되므로 override 로직은 그대로 사용한다

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/db/session.py` | 수정 | `declarative_base()` → `DeclarativeBase` 클래스 상속 방식으로 변경 |
| `backend/tests/conftest.py` | 수정 | `db_session()` fixture를 SAVEPOINT 패턴으로 변경 |

## 완료 체크리스트

- [ ] `docker-compose exec fastapi pytest` 실행 시 모든 테스트가 통과한다
- [ ] `db_session` fixture에서 `bind=connection` 인자가 제거되었다
- [ ] 테스트에서 `db_session.commit()` 호출이 정상 동작한다 (SAVEPOINT로 처리)
- [ ] 테스트 완료 후 `hexdb_test` DB에 테스트 데이터가 남아있지 않다 (롤백 확인)
- [ ] 프로덕션 서비스(`docker-compose up -d fastapi`)가 정상 기동된다 (Base 변경 영향 확인)
