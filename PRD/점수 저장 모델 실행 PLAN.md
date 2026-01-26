# 점수 저장 모델 실행 PLAN

## 1. 개요

- **목적**: 핀볼 게임 점수를 영구 저장하기 위한 DB 테이블 구축
- **배경**: Docker 재시작 시에도 점수 데이터 유지 필요
- **기반**: 기존 User 테이블과 동일한 SQLAlchemy 구조 활용

---

## 2. 데이터베이스 설계

### 2.1 Score 테이블 구조

| 필드 | 타입 | 설명 | 제약 조건 |
|------|------|------|----------|
| id | INTEGER | 점수 기록 고유 번호 | PRIMARY KEY, AUTO_INCREMENT, INDEX |
| score | INTEGER | 획득 점수 | NOT NULL |
| created_at | DATETIME | 기록 생성 시각 | NOT NULL, DEFAULT: CURRENT_TIMESTAMP |

### 2.2 인덱스 설계

- **PRIMARY KEY**: id (고유 식별)
- **INDEX**: created_at (시간순 정렬 성능 향상)
- **INDEX**: score (점수순 정렬 성능 향상)

---

## 3. SQLAlchemy 모델 구현

### 3.1 models.py 수정

**파일**: `/home/hexsera/Pinball_web/fastapi/models.py`

**추가 내용**:
```python
from sqlalchemy import Column, Integer, String, Date, DateTime
from sqlalchemy.sql import func
from database import Base


class User(Base):
    # 기존 코드 유지
    ...


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
```

**주요 특징**:
- `func.now()`: SQLAlchemy의 현재 시각 함수 (DB 서버 시간 사용)
- `server_default`: DB 레벨에서 기본값 설정
- User 테이블과 독립적으로 운영 (외래키 없음)

---

## 4. Pydantic 스키마 구현

### 4.1 main.py에 스키마 추가

**파일**: `/home/hexsera/Pinball_web/fastapi/main.py`

**추가 내용**:
```python
from datetime import datetime

# Score 관련 스키마
class ScoreCreateRequest(BaseModel):
    """점수 기록 생성 요청"""
    score: int


class ScoreResponse(BaseModel):
    """점수 기록 응답"""
    id: int
    score: int
    created_at: datetime

    class Config:
        from_attributes = True


class ScoreListResponse(BaseModel):
    """점수 기록 목록 응답"""
    scores: List[ScoreResponse]
    total: int
```

---

## 5. API 엔드포인트 구현

### 5.1 엔드포인트 목록

| 메서드 | 경로 | 설명 | 인증 | 상태 코드 |
|--------|------|------|------|----------|
| POST | /api/v1/scores | 점수 기록 생성 | 불필요 | 201 |


### 5.2 엔드포인트 구현 예시

**POST /api/v1/scores** (점수 기록 생성):
```python
from models import Score

@app.post("/api/v1/scores", response_model=ScoreResponse, status_code=201)
def create_score(score_data: ScoreCreateRequest, db: Session = Depends(get_db)):
    """점수 기록 생성"""
    # 점수 기록 생성
    db_score = Score(**score_data.dict())
    db.add(db_score)
    db.commit()
    db.refresh(db_score)
    return db_score
```

---

## 6. 데이터베이스 마이그레이션

### 6.1 Alembic 마이그레이션 실행

```bash
# 1. 마이그레이션 파일 생성
docker exec fastapi-server alembic revision --autogenerate -m "Add Score table"

# 2. 마이그레이션 적용
docker exec fastapi-server alembic upgrade head

# 3. 테이블 생성 확인
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "DESCRIBE scores;"
```

### 6.2 Base.metadata.create_all() 방식

**현재 상태**: `main.py`에서 `Base.metadata.create_all(bind=engine)` 실행 중

**동작**:
- FastAPI 재시작 시 자동으로 Score 테이블 생성
- models.py에 Score 클래스를 추가하면 자동 반영

---

## 7. 테스트 시나리오

### 7.1 점수 기록 생성 테스트

```bash
# 점수 기록 생성
curl -X POST "http://localhost:8000/api/v1/scores" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 12500
  }'
```

**예상 응답** (201 Created):
```json
{
  "id": 1,
  "score": 12500,
  "created_at": "2026-01-26T12:34:56"
}
```



---

## 8. 구현 체크리스트



### Phase 2: API 엔드포인트 구현
- [ ] POST /api/v1/scores (점수 기록 생성)

### Phase 3: 테스트 및 검증
- [ ] FastAPI 재시작 후 테이블 자동 생성 확인
- [ ] 점수 기록 생성 테스트
- [ ] Docker 재시작 후 데이터 유지 확인


---

## 9. 주요 설계 결정 사항

### 9.1 User 테이블과의 독립성

**선택**: User 테이블과 연결하지 않음 (외래키 없음)

**이유**:
- 비회원도 게임 플레이 가능
- 단순한 점수 기록 시스템 구현
- 향후 회원 연동 기능은 별도 테이블로 확장 가능

### 9.2 최고 점수 vs 전체 기록

**선택**: 전체 기록 저장

**이유**:
- 시간대별 점수 분석 가능
- 랭킹 시스템 구현 시 유연성 확보
- 필요시 최고 점수는 쿼리로 추출 가능

### 9.3 created_at 타입

**선택**: DATETIME (서버 시간 기준)

**이유**:
- 클라이언트 시간대 의존성 제거
- 점수 기록 순서 보장
- 시간대별 통계 분석 가능

### 9.4 인증 정책

**점수 기록 생성**: 인증 불필요
- 게임 플레이 중 점수 저장이 원활하게 진행되어야 함
- 비회원도 점수 저장 가능

---

## 10. 향후 확장 가능성

### 10.1 추가 필드 고려사항

- `user_id`: 회원 연동 시 사용자 ID 추가 (선택적)
- `game_duration`: 게임 플레이 시간 (초)
- `level`: 도달한 레벨
- `is_verified`: 점수 검증 여부 (부정 방지)

### 10.2 추가 기능 고려사항

- 회원별 점수 히스토리 (user_id 추가 시)
- 일별/주별/월별 랭킹
- 점수 기반 업적 시스템

---

## 11. 예상 소요 시간

| 작업 | 예상 시간 |
|------|----------|
| 모델 및 스키마 구현 | 5분 |
| API 엔드포인트 구현 (1개) | 10분 |
| 테스트 및 검증 | 10분 |
| 문서화 | 5분 |
| **총 예상 시간** | **약 30분** |

---

## 12. 참고 문서

- `CLAUDE.md` - 프로젝트 전체 구조
- `PRD/SQLAlchemy-사용방법과-작동과정.md` - SQLAlchemy 사용법
- `fastapi/models.py` - 기존 User 모델 참고
- `fastapi/main.py` - 기존 API 엔드포인트 패턴 참고
