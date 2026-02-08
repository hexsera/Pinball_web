# 개인 최고기록 조회 API - RED 계획

## 목적

GET `/api/v1/high-scores` 엔드포인트를 TDD 방식으로 구현하여 사용자의 개인 최고 기록을 조회한다.

## 요구사항 분석

### 기능 요구사항
- 사용자 ID를 쿼리 파라미터로 받아 해당 사용자의 최고 점수를 반환
- 존재하지 않는 사용자 ID에 대한 처리
- 새로운 `high_scores` 테이블 생성 및 조회

### 신규 데이터베이스 구조 (생성 예정)
```python
# models.py - HighScore 테이블 (새로 생성)
class HighScore(Base):
    __tablename__ = "high_scores"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)  # 사용자당 1개 레코드
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
```

**설계 특징**:
- `user_id`에 UNIQUE 제약: 한 사용자당 하나의 최고 기록만 저장
- `id`는 AUTO_INCREMENT PRIMARY KEY (일반적인 구조)
- `updated_at` 필드: 점수 갱신 시각 추적
- 기존 `scores` 테이블과 독립적으로 운영

## RED 계획 (실패하는 테스트 작성)

### 테스트 파일 위치
```
fastapi/tests/test_high_scores.py
```

### 테스트 케이스 목록

각 테스트는 **하나의 동작만** 검증한다. TDD 사이클(RED → RED 검증 → GREEN → GREEN 검증 → REFACTOR)을 각 테스트마다 수행한다.

#### 1. 기본 성공 케이스

**테스트 1: `test_get_high_score_returns_200_for_existing_user`**
- **목적**: 존재하는 사용자의 최고 기록 조회 시 200 상태 코드 반환
- **Given**: user_id=1인 점수 기록이 DB에 존재
- **When**: GET /api/v1/high-scores?user_id=1 요청
- **Then**: 200 OK 응답
- **예상 실패 이유**: 엔드포인트 미구현 (404 Not Found)

**테스트 2: `test_get_high_score_returns_score_data`**
- **목적**: 응답 본문에 점수 데이터 포함
- **Given**: user_id=1, score=15000 기록이 DB에 존재
- **When**: GET /api/v1/high-scores?user_id=1 요청
- **Then**: response.json()에 score 필드가 15000
- **예상 실패 이유**: 응답 본문 구조 미구현

**테스트 3: `test_get_high_score_returns_user_id`**
- **목적**: 응답 본문에 user_id 포함
- **Given**: user_id=1 기록이 DB에 존재
- **When**: GET /api/v1/high-scores?user_id=1 요청
- **Then**: response.json()에 user_id 필드가 1
- **예상 실패 이유**: 응답 본문에 user_id 필드 미포함

**테스트 4: `test_get_high_score_returns_created_at`**
- **목적**: 응답 본문에 기록 생성 시각 포함
- **Given**: user_id=1 기록이 DB에 존재
- **When**: GET /api/v1/high-scores?user_id=1 요청
- **Then**: response.json()에 created_at 필드가 존재하고 datetime 형식
- **예상 실패 이유**: 응답 본문에 created_at 필드 미포함

**테스트 5: `test_get_high_score_returns_updated_at`**
- **목적**: 응답 본문에 기록 갱신 시각 포함
- **Given**: user_id=1 기록이 DB에 존재
- **When**: GET /api/v1/high-scores?user_id=1 요청
- **Then**: response.json()에 updated_at 필드가 존재하고 datetime 형식
- **예상 실패 이유**: 응답 본문에 updated_at 필드 미포함

**테스트 6: `test_get_high_score_returns_id`**
- **목적**: 응답 본문에 고유 ID 포함
- **Given**: user_id=1 기록이 DB에 존재
- **When**: GET /api/v1/high-scores?user_id=1 요청
- **Then**: response.json()에 id 필드가 존재하고 양의 정수
- **예상 실패 이유**: 응답 본문에 id 필드 미포함

#### 2. 에러 케이스

**테스트 7: `test_get_high_score_returns_404_for_nonexistent_user`**
- **목적**: 존재하지 않는 사용자 조회 시 404 반환
- **Given**: user_id=9999 기록이 DB에 없음
- **When**: GET /api/v1/high-scores?user_id=9999 요청
- **Then**: 404 Not Found 응답
- **예상 실패 이유**: 404 처리 로직 미구현

**테스트 8: `test_get_high_score_returns_error_message_for_nonexistent_user`**
- **목적**: 404 응답에 명확한 에러 메시지 포함
- **Given**: user_id=9999 기록이 DB에 없음
- **When**: GET /api/v1/high-scores?user_id=9999 요청
- **Then**: response.json()['detail']에 "High score not found" 메시지
- **예상 실패 이유**: 에러 메시지 미구현

**테스트 9: `test_get_high_score_returns_422_for_missing_user_id`**
- **목적**: user_id 파라미터 누락 시 422 반환
- **Given**: 파라미터 없음
- **When**: GET /api/v1/high-scores 요청 (쿼리 파라미터 없음)
- **Then**: 422 Unprocessable Entity 응답
- **예상 실패 이유**: 파라미터 검증 로직 미구현

**테스트 10: `test_get_high_score_returns_422_for_invalid_user_id_type`**
- **목적**: user_id가 정수가 아닐 때 422 반환
- **Given**: user_id="abc" (문자열)
- **When**: GET /api/v1/high-scores?user_id=abc 요청
- **Then**: 422 Unprocessable Entity 응답
- **예상 실패 이유**: 타입 검증 로직 미구현

#### 3. 엣지 케이스

**테스트 11: `test_get_high_score_returns_zero_score`**
- **목적**: 점수가 0인 경우도 정상 반환
- **Given**: user_id=2, score=0 기록이 DB에 존재
- **When**: GET /api/v1/high-scores?user_id=2 요청
- **Then**: response.json()['score']가 0
- **예상 실패 이유**: 0 점수 처리 로직 미구현 또는 엔드포인트 미구현

**테스트 12: `test_get_high_score_returns_negative_user_id_422`**
- **목적**: 음수 user_id는 422 반환
- **Given**: user_id=-1
- **When**: GET /api/v1/high-scores?user_id=-1 요청
- **Then**: 422 Unprocessable Entity 응답
- **예상 실패 이유**: 음수 검증 로직 미구현

## 테스트 작성 순서

1. **test_get_high_score_returns_200_for_existing_user** (가장 기본적인 성공 케이스)
2. **test_get_high_score_returns_score_data** (응답 데이터 검증)
3. **test_get_high_score_returns_user_id** (응답 필드 확장)
4. **test_get_high_score_returns_created_at** (created_at 필드)
5. **test_get_high_score_returns_updated_at** (updated_at 필드)
6. **test_get_high_score_returns_id** (id 필드 완성)
7. **test_get_high_score_returns_404_for_nonexistent_user** (에러 처리 시작)
8. **test_get_high_score_returns_error_message_for_nonexistent_user** (에러 메시지)
9. **test_get_high_score_returns_422_for_missing_user_id** (파라미터 검증)
10. **test_get_high_score_returns_422_for_invalid_user_id_type** (타입 검증)
11. **test_get_high_score_returns_zero_score** (엣지 케이스)
12. **test_get_high_score_returns_negative_user_id_422** (엣지 케이스 완성)

## 테스트 환경 설정

### pytest fixture (conftest.py)
```python
# fastapi/tests/conftest.py에 추가 필요 여부 확인
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from fastapi.testclient import TestClient

# 테스트 DB URL (hexdb_test)
TEST_DATABASE_URL = "mysql+pymysql://hexsera:hexpoint@localhost:3306/hexdb_test"

@pytest.fixture(scope="function")
def db_session():
    """각 테스트마다 새로운 DB 세션 생성"""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient 생성"""
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

## 예상 Pydantic 스키마 (main.py에 추가 예정)

```python
class HighScoreResponse(BaseModel):
    """개인 최고 기록 응답"""
    id: int
    user_id: int
    score: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

## 예상 엔드포인트 시그니처 (구현 전)

```python
@app.get("/api/v1/high-scores", response_model=HighScoreResponse)
def get_high_score(user_id: int, db: Session = Depends(get_db)):
    """사용자의 개인 최고 기록 조회 (high_scores 테이블)"""
    # 구현 예정
    pass
```

## TDD 사이클 체크리스트

각 테스트마다 다음을 반복한다:

### RED 단계
- [ ] 실패하는 테스트 1개 작성 (하나의 동작만 검증)
- [ ] 테스트 이름이 동작을 명확히 설명
- [ ] Given-When-Then 구조로 작성

### RED 검증 단계
- [ ] `cd fastapi && pytest tests/test_high_scores.py -v` 실행
- [ ] 테스트가 **실패(fail)** 하는지 확인 (에러 아님)
- [ ] 실패 이유가 **기능 미구현** 때문인지 확인 (오타 아님)
- [ ] 실패 메시지가 예상대로인지 확인

### GREEN 단계
- [ ] 테스트를 통과하는 **최소한의 코드** 작성
- [ ] 기능 추가나 리팩토링 금지
- [ ] 테스트 범위 외 코드 수정 금지

### GREEN 검증 단계
- [ ] `cd fastapi && pytest tests/test_high_scores.py -v` 실행
- [ ] 현재 테스트 통과 확인
- [ ] 모든 이전 테스트도 통과 확인
- [ ] 에러, 경고 없음 확인

### REFACTOR 단계
- [ ] 중복 제거
- [ ] 이름 개선
- [ ] 헬퍼 함수 추출 (필요시)
- [ ] 테스트는 계속 GREEN 유지

### 반복
- [ ] 다음 테스트로 이동
- [ ] RED부터 다시 시작

## 최종 완료 체크리스트

모든 테스트 작성 후 확인:

- [ ] 모든 12개 테스트가 존재
- [ ] 각 테스트의 실패를 확인한 후 구현
- [ ] 각 테스트가 예상된 이유로 실패 (기능 미구현)
- [ ] 각 테스트마다 최소한의 코드만 작성
- [ ] 모든 테스트 통과
- [ ] 출력에 에러, 경고 없음
- [ ] 테스트가 실제 코드 사용 (mock 최소화)
- [ ] 엣지 케이스와 에러 상황 포함
- [ ] HighScore 모델이 models.py에 생성됨
- [ ] high_scores 테이블이 DB에 생성됨

## 주의사항

### 절대 금지
1. **테스트 전에 프로덕션 코드 작성 금지**
   - 엔드포인트를 먼저 만들고 테스트 작성하지 않는다
   - 스키마를 먼저 만들고 테스트 작성하지 않는다

2. **테스트 건너뛰기 금지**
   - "간단하니까 테스트 없이" 금지
   - "나중에 테스트 추가" 금지
   - "이번만" 금지

3. **실패 확인 생략 금지**
   - 테스트 작성 후 반드시 실행하여 실패 확인
   - 실패 이유가 예상대로인지 검증

### 레드 플래그

다음 상황이 발생하면 중단하고 처음부터 시작:

- 테스트가 즉시 통과했다 → 이미 구현된 기능을 테스트하고 있음
- 테스트가 왜 실패했는지 설명 못 함 → 테스트가 잘못됨
- 여러 동작을 한 테스트에서 검증 → 테스트 분리 필요
- 테스트 이름에 "and"가 있음 → 테스트 분리 필요

## 다음 단계 (이 문서 완료 후)

1. `fastapi/tests/test_high_scores.py` 파일 생성
2. conftest.py에 필요한 fixture 추가 (없다면)
3. 첫 번째 테스트 작성 (`test_get_high_score_returns_200_for_existing_user`)
4. TDD 사이클 시작 (RED → RED 검증 → GREEN → GREEN 검증 → REFACTOR)
5. 12개 테스트 모두 완료할 때까지 반복

## 참고

- 현재 프로젝트 구조: `/home/hexsera/Pinball_web/`
- FastAPI 메인 파일: `fastapi/main.py`
- 데이터베이스 모델: `fastapi/models.py`
- 기존 Score 테이블: `scores` (핀볼 게임 점수 저장용)
- 신규 HighScore 테이블: `high_scores` (개인 최고 기록 전용)
- 테스트 DB: `hexdb_test` (프로덕션 `hexdb`와 분리)

## 기존 테이블과의 차이점

| 항목 | scores 테이블 | high_scores 테이블 |
|------|--------------|-------------------|
| 목적 | 핀볼 게임 점수 저장 | 개인 최고 기록 저장 |
| PRIMARY KEY | id (user_id 값 사용) | id (AUTO_INCREMENT) |
| user_id 제약 | 없음 | UNIQUE (사용자당 1개) |
| updated_at | 없음 | 있음 (갱신 추적) |
| 사용 API | POST /api/v1/scores | GET /api/v1/high-scores |
