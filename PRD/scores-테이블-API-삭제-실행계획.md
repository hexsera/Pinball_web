# scores 테이블 및 API 삭제 실행계획

## 요구사항 요약

**요구사항**: `scores` 테이블, 관련 API 엔드포인트(`POST /api/v1/scores`), 스키마 파일, 라우터 등록을 모두 제거한다.

**목적**: `scores` 테이블은 현재 어떤 프론트엔드 코드에서도 호출되지 않는 미사용 상태이므로 코드베이스를 정리한다.

---

## 현재상태 분석

- `backend/models.py`: `Score` 클래스로 `scores` 테이블 정의
- `backend/app/api/v1/scores.py`: `POST /api/v1/scores` 엔드포인트 1개
- `backend/app/api/v1/__init__.py`: `scores` 모듈 import 및 `__all__` 등록
- `backend/main.py`: `scores.router`를 `/api/v1/scores`로 등록
- `backend/app/schemas/score.py`: `ScoreCreateRequest`, `ScoreResponse`, `ScoreListResponse` 3개 스키마
- `backend/tests/conftest.py`: `TABLES_TO_TRUNCATE` 목록에 `"scores"` 포함
- 프론트엔드: `submitScore()`는 `/api/v1/monthly-scores`를 호출 — `scores` API를 직접 호출하는 코드 없음
- DB에 `scores` 테이블이 실제로 존재하므로 Alembic 마이그레이션으로 DROP 필요

---

## 구현 방법

1. DB 테이블은 Alembic `drop_table` 마이그레이션으로 제거한다.
2. 백엔드 코드(모델, API, 스키마, 라우터 등록)는 직접 파일 수정/삭제로 제거한다.
3. 테스트 conftest에서 `scores` 참조를 제거한다.
4. 프론트엔드는 `/api/v1/scores`를 호출하는 코드가 없으므로 변경 없음.

---

## 구현 단계

### 1. Alembic 마이그레이션 생성 및 적용

```bash
docker compose exec fastapi alembic revision --autogenerate -m "drop_scores_table"
docker compose exec fastapi alembic upgrade head
```

- **무엇을 하는가**: DB에서 `scores` 테이블을 실제로 삭제하는 마이그레이션 파일을 생성하고 적용
- `--autogenerate`는 현재 모델과 DB 상태를 비교해 변경사항을 자동 감지
- 단계 2(모델 삭제) 이후에 실행해야 `Score` 클래스가 없어진 것을 감지해 `drop_table`을 생성

### 2. models.py에서 Score 클래스 삭제

```python
# 삭제 대상 코드 (models.py)
class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
```

- **무엇을 하는가**: SQLAlchemy ORM에서 `scores` 테이블 매핑을 제거
- 이 클래스를 삭제한 뒤 alembic이 `scores` 테이블이 모델에 없다고 판단해 `drop_table` 마이그레이션을 생성

### 3. app/api/v1/scores.py 파일 삭제

```bash
rm backend/app/api/v1/scores.py
```

- **무엇을 하는가**: `POST /api/v1/scores` 엔드포인트 라우터 파일 제거
- 이 파일이 남아 있으면 import 오류가 발생하므로 반드시 삭제

### 4. app/api/v1/__init__.py에서 scores 참조 제거

```python
# 변경 후 (scores 관련 import, __all__ 항목 제거)
from app.api.v1 import (
    auth,
    users,
    friends,
    monthly_scores,
    game_visits,
)

__all__ = [
    "auth",
    "users",
    "friends",
    "monthly_scores",
    "game_visits",
]
```

- **무엇을 하는가**: 삭제된 `scores.py` 모듈을 import하지 않도록 수정
- `scores`가 남아 있으면 `ModuleNotFoundError` 발생

### 5. main.py에서 scores 라우터 등록 제거

```python
# 변경 후 (scores 관련 import, include_router 제거)
from app.api.v1 import users, auth, monthly_scores, game_visits, friends

app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(auth.router, prefix="/api/v1", tags=["Auth"])
app.include_router(monthly_scores.router, prefix="/api/v1/monthly-scores", tags=["Monthly Scores"])
app.include_router(game_visits.router, prefix="/api/v1/game_visits", tags=["Game Visits"])
app.include_router(friends.router, prefix="/api/friend-requests", tags=["Friends"])
```

- **무엇을 하는가**: FastAPI 앱에 scores 라우터를 등록하는 코드를 제거
- import 줄과 `include_router` 줄 2곳을 모두 제거해야 함

### 6. app/schemas/score.py 파일 삭제

```bash
rm backend/app/schemas/score.py
```

- **무엇을 하는가**: 더 이상 사용하지 않는 Pydantic 스키마 파일 제거
- `ScoreCreateRequest`, `ScoreResponse`, `ScoreListResponse` 3개 클래스가 모두 미사용 상태

### 7. tests/conftest.py에서 scores 참조 제거

```python
# 변경 후
TABLES_TO_TRUNCATE = [
    "friendships",
    "monthly_scores",
    "game_visits",
    "users",
]
```

- **무엇을 하는가**: 테스트 초기화 시 존재하지 않는 `scores` 테이블을 TRUNCATE하려는 시도를 제거
- `scores` 테이블이 DB에 없는데 TRUNCATE를 시도하면 테스트 전체가 실패

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/models.py` | 수정 | `Score` 클래스 삭제 |
| `backend/app/api/v1/scores.py` | 삭제 | 파일 전체 삭제 |
| `backend/app/api/v1/__init__.py` | 수정 | `scores` import 및 `__all__` 항목 제거 |
| `backend/main.py` | 수정 | `scores` import 및 `include_router` 제거 |
| `backend/app/schemas/score.py` | 삭제 | 파일 전체 삭제 |
| `backend/tests/conftest.py` | 수정 | `TABLES_TO_TRUNCATE`에서 `"scores"` 제거 |
| `backend/alembic/versions/xxxx_drop_scores_table.py` | 생성 | Alembic이 자동 생성 — `scores` 테이블 DROP |

---

## 완료 체크리스트

- [ ] `docker compose exec fastapi alembic upgrade head` 실행 후 오류가 없다
- [ ] `docker compose exec fastapi pytest` 실행 시 모든 테스트가 통과한다
- [ ] `docker compose logs fastapi`에서 서버 시작 시 `ModuleNotFoundError` 또는 import 오류가 없다
- [ ] `GET /api/` 헬스체크 응답이 `{"status": "ok"}`를 반환한다
- [ ] `POST /api/v1/scores`로 요청 시 `404 Not Found`가 반환된다 (엔드포인트 삭제 확인)
- [ ] DB에서 `\dt` 명령으로 `scores` 테이블이 존재하지 않는다
