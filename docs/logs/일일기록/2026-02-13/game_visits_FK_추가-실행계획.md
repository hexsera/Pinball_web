# game_visits FK 추가 실행계획

## 요구사항 요약

**요구사항**: `game_visits.user_id`에 `users.id`를 참조하는 Foreign Key 제약을 추가한다. User 삭제 시 해당 `game_visits` 레코드를 삭제하는 것이 아니라 `user_id`를 NULL로 업데이트한다.

**목적**: 데이터 무결성 보장 — `game_visits.user_id`에 존재하지 않는 `users.id` 값이 저장되는 것을 DB 레벨에서 방지한다. 방문 기록(통계 데이터)은 사용자 삭제 후에도 보존하고, FK 위반 오류는 NULL로 변환해 회피한다.

## 현재상태 분석

- `backend/models.py` 57-66행: `GameVisit.user_id`는 `Column(Integer, nullable=True)`로 정의. ForeignKey 선언 없음.
- `backend/app/api/v1/users.py` 122-152행: User 삭제 시 Friendship → MonthlyScore → HighScore 순으로 먼저 삭제. GameVisit 삭제 로직 없음.
- `backend/alembic/versions/`: 최신 revision은 `0ceb423c2879` (MonthlyScore FK 추가).
- `game_visits.user_id`는 익명 사용자를 위해 `nullable=True`이므로 FK 추가 후에도 NULL 허용을 유지해야 한다.

## 구현 방법

- **모델 수정**: SQLAlchemy `ForeignKey` 선언을 `GameVisit.user_id` 컬럼에 추가한다.
- **마이그레이션**: Alembic `op.create_foreign_key()`로 DB에 실제 제약을 추가하는 마이그레이션 파일을 생성한다.
- **NULL 처리 로직 추가**: User 삭제 엔드포인트에서 해당 `user_id`를 가진 `game_visits` 레코드의 `user_id`를 NULL로 업데이트한다. FK 제약을 위반하지 않으면서 방문 기록을 보존한다.

## 구현 단계

### 1. models.py — GameVisit.user_id에 ForeignKey 추가

```python
# backend/models.py, GameVisit 클래스 (57-66행 근처)
user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
```

- **무엇을 하는가**: SQLAlchemy ORM 레벨에서 `game_visits.user_id → users.id` 참조를 선언한다.
- `ForeignKey("users.id")`를 추가하면 ORM이 관계를 인식하고 Alembic autogenerate 시 변경 사항을 감지한다.
- `nullable=True` 유지 — 익명 방문자의 `user_id`는 NULL로 저장되므로 제거하면 안 된다.

### 2. Alembic 마이그레이션 파일 생성

```bash
docker-compose exec fastapi alembic revision --autogenerate -m "add_foreign_key_to_game_visits_user_id"
```

- **무엇을 하는가**: 모델 변경 사항을 감지해 DB에 FK 제약을 추가하는 마이그레이션 파일을 자동 생성한다.
- 생성된 파일의 `upgrade()`에 `op.create_foreign_key(...)` 구문이 포함된다.
- `down_revision`이 `0ceb423c2879`로 설정되었는지 확인해야 한다.

### 3. 마이그레이션 파일 내용 확인 후 적용

```python
# 생성된 파일 upgrade() 예시
def upgrade() -> None:
    op.create_foreign_key(None, 'game_visits', 'users', ['user_id'], ['id'])

def downgrade() -> None:
    op.drop_constraint(None, 'game_visits', type_='foreignkey')
```

```bash
docker-compose exec fastapi alembic upgrade head
```

- **무엇을 하는가**: DB의 `game_visits` 테이블에 실제 FK 제약을 적용한다.
- 적용 전 `game_visits.user_id`에 `users.id`에 없는 값이 존재하면 마이그레이션이 실패한다 — 적용 전 반드시 확인한다.

### 4. users.py — 삭제 로직에 GameVisit user_id NULL 처리 추가

```python
# backend/app/api/v1/users.py, delete_user 함수 (136행 근처)
# GameVisit의 user_id를 NULL로 설정 (방문 기록 보존, FK 위반 방지)
db.query(GameVisit).filter(GameVisit.user_id == user_id)\
    .update({"user_id": None}, synchronize_session=False)

# 기존 순서 유지: Friendship → MonthlyScore → HighScore → User
```

- **무엇을 하는가**: FK 제약이 생긴 후 User 삭제 시 발생하는 FK 위반 오류를 방지하면서, 방문 기록 데이터는 익명 상태로 보존한다.
- `.update({"user_id": None})`으로 레코드를 삭제하지 않고 `user_id`만 NULL로 변환한다.
- User 삭제 전 (Friendship, MonthlyScore, HighScore 삭제보다 먼저) 실행해야 한다.
- import 목록에 `GameVisit` 모델이 포함되어 있는지 확인해야 한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/models.py` | 수정 | `GameVisit.user_id` 컬럼에 `ForeignKey("users.id")` 추가 |
| `backend/alembic/versions/[hash]_add_foreign_key_to_game_visits_user_id.py` | 생성 | DB FK 제약 추가 마이그레이션 |
| `backend/app/api/v1/users.py` | 수정 | `delete_user`에 `GameVisit.user_id → NULL` 업데이트 쿼리 추가, import 추가 |

## 완료 체크리스트

- [ ] `backend/models.py`의 `GameVisit.user_id`에 `ForeignKey("users.id")`가 선언되어 있다.
- [ ] `alembic upgrade head` 실행 후 오류 없이 완료된다.
- [ ] DB에서 `\d game_visits` (psql) 또는 `SHOW CREATE TABLE game_visits`로 FK 제약이 존재함을 확인한다.
- [ ] `DELETE /api/v1/users/{user_id}` 호출 시 해당 user_id를 가진 `game_visits` 레코드의 `user_id`가 NULL로 변경되고 User가 삭제된다.
- [ ] User 삭제 후 해당 방문 기록 레코드가 DB에 남아 있고 `user_id` 컬럼이 NULL인 것을 확인한다.
- [ ] 존재하지 않는 `users.id`를 참조하는 `game_visits.user_id` 값을 삽입하면 DB에서 FK 오류가 발생한다.
