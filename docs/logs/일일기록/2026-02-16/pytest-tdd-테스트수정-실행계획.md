# HighScore 삭제 실행계획

## 요구사항 요약

**요구사항**: HighScore API, 테이블(모델), 테스트 코드를 프로젝트에서 완전히 제거한다.

**목적**: 사용하지 않거나 유지할 필요가 없는 HighScore 기능을 코드베이스에서 삭제하여 불필요한 코드와 실패 테스트를 제거한다.

---

## 현재상태 분석

삭제 대상 파일 및 코드:

- `backend/app/api/v1/high_scores.py` — HighScore POST/GET 엔드포인트
- `backend/app/schemas/high_score.py` — `HighScoreCreate`, `HighScoreResponse` 스키마
- `backend/tests/test_high_scores.py` — 15 FAILED + 1 ERROR 상태의 테스트 파일
- `backend/models.py` — `HighScore` 클래스 정의 (파일 내 해당 블록만 제거)
- `backend/main.py` — `high_scores` import 및 `app.include_router()` 등록 제거
- `backend/alembic/versions/60a77f2baf38_initial_schema.py` — 현재 `pass`만 있음. 실제 DB에 `high_scores` 테이블이 존재하므로 새 마이그레이션으로 drop 처리 필요

---

## 구현 방법

- 파일 삭제: `high_scores.py`(API), `high_score.py`(스키마), `test_high_scores.py`(테스트)
- 코드 수정: `models.py`에서 `HighScore` 클래스 제거, `main.py`에서 import 및 라우터 등록 제거
- DB 마이그레이션: `models.py`에서 `HighScore`가 제거된 상태에서 `--autogenerate`를 실행하면 Alembic이 `op.drop_table("high_scores")`를 자동 감지하여 마이그레이션 파일 생성

---

## 구현 단계

### 1. `models.py`에서 `HighScore` 클래스 제거

```python
# backend/models.py — 아래 블록 전체 삭제

class HighScore(Base):
    __tablename__ = "high_scores"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
```

- **무엇을 하는가**: SQLAlchemy ORM 모델에서 `high_scores` 테이블 매핑을 제거
- `Base.metadata`에서 `high_scores`가 사라지므로 autogenerate 실행 시 drop을 감지할 수 있음
- `ForeignKey`, `UniqueConstraint` 등 관련 제약조건도 함께 제거됨

### 2. `main.py`에서 high_scores 라우터 제거

```python
# backend/main.py

# 변경 전
from app.api.v1 import users, auth, scores, monthly_scores, high_scores, game_visits, friends
app.include_router(high_scores.router, prefix="/api/v1/high-scores", tags=["High Scores"])

# 변경 후
from app.api.v1 import users, auth, scores, monthly_scores, game_visits, friends
# include_router 줄 삭제
```

- **무엇을 하는가**: FastAPI 앱에서 `/api/v1/high-scores` 엔드포인트 등록을 제거
- import와 include_router 두 줄을 모두 제거해야 `ModuleNotFoundError` 방지
- 이 단계는 파일 삭제(단계 3) 전에 수행해야 함

### 3. 파일 삭제

```bash
rm backend/app/api/v1/high_scores.py
rm backend/app/schemas/high_score.py
rm backend/tests/test_high_scores.py
```

- **무엇을 하는가**: API 구현 파일, 스키마 파일, 테스트 파일을 파일시스템에서 완전히 제거
- `main.py` 수정(단계 2) 완료 후 실행해야 컨테이너 재시작 시 import 오류 없음
- `test_high_scores.py` 삭제로 15 FAILED + 1 ERROR가 테스트 결과에서 사라짐

### 4. Alembic 마이그레이션 생성 및 적용

```bash
# 마이그레이션 파일 생성 (models.py에 HighScore 없으므로 drop_table 감지)
docker compose exec fastapi alembic revision --autogenerate -m "drop high_scores table"

# 생성된 파일 확인 후 적용
docker compose exec fastapi alembic upgrade head
```

- **무엇을 하는가**: 실제 DB에서 `high_scores` 테이블을 삭제
- autogenerate가 `op.drop_table("high_scores")`를 생성하는지 확인 후 apply
- 생성된 파일에 drop_table이 없으면 수동으로 `op.drop_table("high_scores")` 추가

### 5. 테스트 실행으로 최종 검증

```bash
docker compose exec fastapi pytest -v
```

- **무엇을 하는가**: `test_high_scores.py` 제거 후 남은 테스트가 모두 통과하는지 확인
- 예상 결과: 기존 통과 5개(`test_example.py`, `test_monthly_scores_fk.py`, `test_testdb.py`)가 계속 PASSED

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/models.py` | 수정 | `HighScore` 클래스 블록 삭제 |
| `backend/main.py` | 수정 | `high_scores` import 제거, `include_router` 줄 제거 |
| `backend/app/api/v1/high_scores.py` | 삭제 | 파일 전체 삭제 |
| `backend/app/schemas/high_score.py` | 삭제 | 파일 전체 삭제 |
| `backend/tests/test_high_scores.py` | 삭제 | 파일 전체 삭제 |
| `backend/alembic/versions/[새 revision].py` | 생성 | `high_scores` 테이블 drop 마이그레이션 |

---

## 완료 체크리스트

- [ ] `docker compose exec fastapi pytest -v` 실행 시 `test_high_scores.py` 관련 항목이 결과에 없음
- [ ] `docker compose exec fastapi pytest -v` 실행 시 기존 통과 테스트(`test_example.py`, `test_monthly_scores_fk.py`, `test_testdb.py`)가 여전히 PASSED
- [ ] `curl http://localhost:8000/api/v1/high-scores` 요청 시 404 반환 (엔드포인트 제거 확인)
- [ ] `docker compose exec fastapi alembic upgrade head` 실행 시 오류 없음
- [ ] DB에서 `\dt` 또는 `SELECT tablename FROM pg_tables WHERE tablename='high_scores';` 실행 시 결과 없음
- [ ] `docker compose logs fastapi` 확인 시 컨테이너 시작 오류 없음
