# FastAPI TDD 구조 생성 실행계획

## 요구사항 요약

**요구사항**: FastAPI 프로젝트에 TDD(Test-Driven Development)를 시행할 수 있는 테스트 프레임워크와 디렉토리 구조를 구축한다.

**목적**: 앞으로 새로운 API를 개발할 때 TDD 방식을 적용할 수 있도록 업계 표준 테스트 프레임워크(pytest)를 도입하고, 테스트 코드를 작성할 수 있는 디렉토리 구조를 만든다. 기존 API는 이미 TDD로 개발되었다고 가정한다.

## 현재상태 분석

- FastAPI 프로젝트 위치: `./backend/`
- 테스트 파일: 0개 (테스트 프레임워크 미설치)
- API 엔드포인트: 19개 (User CRUD, Login, Score, Friendship, MonthlyScore, GameVisit) - TDD로 개발되었다고 가정
- SQLAlchemy 모델: 5개 (User, Score, Friendship, MonthlyScore, GameVisit)
- 데이터베이스: PostgreSQL (psycopg2-binary 사용)
- main.py에 모듈 레벨에서 DB 연결 및 테이블 생성 코드가 실행됨 (import 시 실행)
- requirements.txt에 테스트 관련 패키지 없음
- 향후 신규 API 개발 시 TDD 적용을 위한 기반 필요

## 구현 방법

- **테스트 프레임워크**: pytest (Python 테스트 업계 표준)
- **HTTP 테스트 클라이언트**: httpx (FastAPI 공식 권장, TestClient 대체)
- **테스트 DB**: PostgreSQL (프로덕션과 동일한 DB 사용, 별도 테스트 데이터베이스)
- **테스트 격리**: 각 테스트 함수마다 트랜잭션 롤백으로 DB 초기화 (fixture 활용)
- **디렉토리 구조**: `tests/` 폴더를 backend 하위에 생성, 도메인별 테스트 파일 분리

### PostgreSQL 테스트 DB 사용 이유
- 프로덕션 환경과 동일한 DB를 사용하여 더 정확한 테스트 가능
- PostgreSQL 고유 기능(UUID, Array 등) 테스트 가능
- SQLite와 PostgreSQL의 SQL 문법 차이로 인한 문제 방지

## 구현 단계

### 1. 테스트 패키지 설치 (requirements.txt 수정)

```
# 기존 내용 유지 + 아래 추가
pytest==8.0.0
httpx==0.27.0
```
- **무엇을 하는가**: TDD에 필요한 테스트 도구들을 프로젝트 의존성에 추가한다
- `pytest`: Python 테스트 실행 프레임워크. 테스트 함수를 자동 탐색하고 실행한다
- `httpx`: FastAPI의 TestClient가 내부적으로 사용하는 HTTP 클라이언트. FastAPI 공식 문서에서 테스트용으로 권장한다
- PostgreSQL 드라이버(psycopg2-binary)는 이미 requirements.txt에 포함되어 있음

### 2. pytest 설정 파일 생성 (pytest.ini)

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```
- **무엇을 하는가**: pytest가 테스트 파일을 어디서, 어떤 규칙으로 찾을지 설정한다
- `testpaths = tests`: pytest가 `tests/` 폴더에서 테스트를 찾는다
- `python_files = test_*.py`: `test_`로 시작하는 .py 파일만 테스트 파일로 인식한다
- `python_functions = test_*`: `test_`로 시작하는 함수만 테스트 함수로 실행한다

### 3. 테스트 디렉토리 구조 생성

```
backend/
└── tests/
    ├── __init__.py
    ├── conftest.py          # 공통 테스트 설정 (DB, 클라이언트 fixture)
    └── test_example.py      # TDD 예시 테스트 (신규 API 개발 시 참고용)
```
- **무엇을 하는가**: TDD 개발을 위한 최소한의 테스트 구조를 만든다
- `conftest.py`: pytest가 자동으로 읽는 파일. 모든 테스트에서 공유할 fixture(테스트용 DB, HTTP 클라이언트)를 정의한다
- `test_example.py`: TDD 방식으로 신규 API 개발 시 참고할 수 있는 예시 테스트 파일

### 4. conftest.py 작성 (테스트 DB 및 클라이언트 설정)

```python
# conftest.py 최상단에 추가 (다른 import보다 먼저)
import os
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
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
    """각 테스트마다 트랜잭션 생성 및 롤백"""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

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
```
- **무엇을 하는가**: 테스트 실행 시 별도의 PostgreSQL 테스트 DB(hexdb_test)를 사용하도록 설정한다
- `TESTING=1` 환경변수: main.py의 startup() 함수 실행을 방지한다
- `setup_test_database` fixture: 테스트 세션 시작 시 테이블을 생성하고, 종료 시 삭제한다 (session scope)
- `db_session` fixture: 각 테스트마다 트랜잭션을 시작하고, 완료 후 롤백하여 테스트 격리를 보장한다
- 트랜잭션 롤백 방식: 테이블 삭제/생성보다 빠르고, 테스트 간 데이터 격리가 확실하다
- `client` fixture: FastAPI의 `get_db` 의존성을 테스트 DB 세션으로 교체한 HTTP 클라이언트를 제공한다

### 5. main.py 모듈 레벨 코드 분리

```python
# main.py 상단의 기존 코드
# 변경 전: 모듈 import 시 즉시 실행됨
if not wait_for_db():
    raise Exception("Database connection failed after retries")
Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    seed_admin(db)
finally:
    db.close()

# 변경 후: startup 함수로 감싸고, 조건부 실행
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

import os
if os.getenv("TESTING") != "1":
    startup()

app = FastAPI(title="Hexsera API", version="1.0.0")
```
- **무엇을 하는가**: main.py를 import할 때 DB 연결/시딩이 자동 실행되는 문제를 해결한다. 테스트 환경에서는 실행하지 않는다
- 현재 문제: `from main import app`을 하면 DB 연결, 테이블 생성, 시딩이 즉시 실행되어 테스트 시 PostgreSQL 연결 오류가 발생한다
- `TESTING=1` 환경변수가 설정되면 startup()을 건너뛴다
- Dockerfile의 CMD에서는 환경변수가 없으므로 기존과 동일하게 작동한다

### 6. 테스트용 PostgreSQL 데이터베이스 생성

```bash
# Docker 컨테이너에서 PostgreSQL에 접속
docker exec -it postgres-server psql -U hexsera -d postgres

# 테스트용 데이터베이스 생성
CREATE DATABASE hexdb_test;

# 권한 부여
GRANT ALL PRIVILEGES ON DATABASE hexdb_test TO hexsera;

# 확인
\l
```
- **무엇을 하는가**: 테스트 전용 PostgreSQL 데이터베이스를 생성한다
- `hexdb_test`: 프로덕션 DB(hexdb)와 분리된 테스트 전용 DB
- 테스트 실행 시 이 DB를 사용하여 프로덕션 데이터에 영향을 주지 않는다
- 테스트 DB는 트랜잭션 롤백으로 관리되므로, 테스트 실행 후에도 깨끗한 상태를 유지한다

### 7. TDD 예시 테스트 작성 (test_example.py)

```python
"""
TDD 방식으로 신규 API 개발 시 참고할 수 있는 예시 테스트 파일

TDD 개발 순서:
1. 테스트 작성 (실패하는 테스트)
2. 최소한의 코드로 테스트 통과
3. 리팩토링

예시: 새로운 /api/items 엔드포인트를 TDD로 개발한다면
"""

def test_health_check(client):
    """GET /api/ 헬스 체크 테스트 (테스트 환경 검증용)"""
    response = client.get("/api/")
    assert response.status_code == 200


# 신규 API 개발 시 아래와 같은 방식으로 테스트 작성
# 1단계: 실패하는 테스트 작성
# def test_create_item(client):
#     """POST /api/items 아이템 생성 테스트"""
#     response = client.post("/api/items", json={
#         "name": "Test Item",
#         "price": 1000
#     })
#     assert response.status_code == 201
#     assert response.json()["name"] == "Test Item"
#
# 2단계: main.py에 최소한의 코드로 엔드포인트 구현
# 3단계: 테스트 통과 확인
# 4단계: 코드 리팩토링 (필요시)
```
- **무엇을 하는가**: TDD 방식으로 신규 API 개발 시 참고할 수 있는 예시를 제공한다
- `test_health_check`: 테스트 환경이 정상 작동하는지 검증하는 기본 테스트
- 주석 처리된 예시 코드: 신규 API 개발 시 TDD 순서를 보여주는 가이드
- 이 테스트가 통과하면 pytest + FastAPI TestClient + 테스트 DB 설정이 모두 정상임을 확인할 수 있다

### 8. README.md 작성 (TDD 개발 가이드)

```markdown
# Tests 디렉토리

이 디렉토리는 TDD(Test-Driven Development) 방식으로 신규 API를 개발하기 위한 테스트 파일을 담는다.

## TDD 개발 순서

1. **테스트 작성**: 구현하려는 API의 동작을 테스트 코드로 먼저 작성한다 (실패하는 테스트)
2. **최소 구현**: 테스트를 통과할 수 있는 최소한의 코드만 작성한다
3. **리팩토링**: 테스트가 통과하면 코드를 개선한다
4. **반복**: 새로운 기능이 필요하면 1번부터 반복한다

## 테스트 실행 방법

```bash
cd backend
pytest                    # 모든 테스트 실행
pytest tests/test_example.py  # 특정 파일만 실행
pytest -v                 # 상세 출력
pytest -k "health"        # 특정 테스트만 실행 (이름 필터)
```

## 신규 API 개발 예시

예를 들어 `/api/items` 엔드포인트를 TDD로 개발한다면:

1. `tests/test_items.py` 파일 생성
2. 실패하는 테스트 작성:
   ```python
   def test_create_item(client):
       response = client.post("/api/items", json={"name": "Item1", "price": 100})
       assert response.status_code == 201
   ```
3. `pytest` 실행 → 실패 확인
4. `main.py`에 최소 코드 작성하여 테스트 통과
5. 리팩토리 → 재테스트

## 테스트 작성 팁

- fixture 활용: `client`, `db_session`은 conftest.py에 정의되어 있음
- 테스트 격리: 각 테스트는 독립적으로 실행되며, 트랜잭션 롤백으로 DB가 자동 초기화됨
- API Key 필요 시: `HEADERS = {"X-API-Key": "hexsera-secret-api-key-2026"}` 사용
- 테스트 DB: hexdb_test 사용 (프로덕션 hexdb와 분리)

## 테스트 DB 관리

테스트는 별도의 PostgreSQL 데이터베이스(hexdb_test)를 사용합니다.

- 각 테스트는 트랜잭션 내에서 실행되고, 완료 후 자동으로 롤백됩니다
- 테스트 간 데이터 격리가 보장됩니다
- 프로덕션 DB(hexdb)에는 영향을 주지 않습니다
```
- **무엇을 하는가**: TDD 개발 방법을 설명하는 README 파일을 tests/ 폴더에 생성한다
- TDD 개발 순서, 테스트 실행 방법, 신규 API 개발 예시, PostgreSQL 테스트 DB 관리 방법을 포함한다
- 개발자가 테스트를 작성할 때 참고할 수 있는 가이드를 제공한다

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/requirements.txt | 수정 | pytest, httpx 추가 |
| backend/pytest.ini | 생성 | pytest 설정 파일 (테스트 경로, 파일 패턴) |
| backend/tests/__init__.py | 생성 | 빈 파일 (Python 패키지 인식용) |
| backend/tests/conftest.py | 생성 | 테스트 PostgreSQL DB 설정, 트랜잭션 롤백 fixture, TESTING 환경변수 |
| backend/tests/test_example.py | 생성 | TDD 예시 테스트 (헬스 체크 + 주석 처리된 예시 코드) |
| backend/tests/README.md | 생성 | TDD 개발 가이드 (개발 순서, 테스트 실행 방법, 예시) |
| backend/main.py | 수정 | 모듈 레벨 DB 초기화 코드를 startup() 함수로 감싸고 TESTING 환경변수 조건 추가 |
| PostgreSQL | DB 생성 | hexdb_test 데이터베이스 생성 및 권한 설정 |

## 완료 체크리스트

- [ ] PostgreSQL에 hexdb_test 데이터베이스가 생성되어 있다
- [ ] `cd backend && pip install -r requirements.txt` 실행 시 pytest, httpx가 정상 설치된다
- [ ] `cd backend && pytest` 실행 시 테스트가 자동 탐색되고 실행된다
- [ ] test_example.py의 헬스 체크 테스트가 PASSED로 표시된다
- [ ] 테스트 실행 시 hexdb_test 데이터베이스를 사용한다 (프로덕션 hexdb와 분리)
- [ ] 각 테스트 실행 후 트랜잭션 롤백으로 DB가 깨끗한 상태로 복원된다
- [ ] `docker compose up -d fastapi` 실행 시 기존과 동일하게 정상 작동한다 (startup 코드 실행됨)
- [ ] tests/ 폴더에 conftest.py, test_example.py, README.md가 생성되어 있다
- [ ] README.md에 TDD 개발 가이드가 작성되어 있다
- [ ] 신규 API 개발 시 TDD 방식을 적용할 수 있는 기반이 구축되어 있다
