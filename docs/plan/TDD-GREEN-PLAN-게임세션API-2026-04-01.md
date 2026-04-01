# TDD GREEN 계획: 게임 세션 API

## 통과시킬 테스트 목록

1. `test_put_game_session_saves_data`: PUT 200 + score/lives/stage/user_id/updated_at 포함
2. `test_put_game_session_overwrites_existing`: 두 번째 PUT이 기존 값 덮어쓰기
3. `test_get_game_session_returns_saved_data`: GET으로 저장된 값 조회
4. `test_get_game_session_returns_404_when_not_found`: 세션 없으면 GET 404 (이미 통과)
5. `test_delete_game_session_removes_data`: DELETE 후 GET 404 (이미 통과)
6. `test_delete_game_session_returns_success_message`: DELETE 200 + message
7. `test_delete_game_session_is_idempotent`: 세션 없어도 DELETE 200

## 구현 계획

| 테스트 | 작성할 코드 | 파일 위치 |
|--------|------------|----------|
| PUT 관련 3개 | `PUT /{user_id}` — Redis `set(key, json, ex=7200)` | `app/api/v1/game_sessions.py` |
| GET 관련 2개 | `GET /{user_id}` — Redis `get(key)`, 없으면 404 | `app/api/v1/game_sessions.py` |
| DELETE 관련 2개 | `DELETE /{user_id}` — Redis `delete(key)`, 항상 200 | `app/api/v1/game_sessions.py` |
| 스키마 | `GameSessionSaveRequest`, `GameSessionResponse`, `GameSessionDeleteResponse` | `app/schemas/game_session.py` |
| export | 스키마 3개 export 추가 | `app/schemas/__init__.py` |
| 라우터 등록 | `game_sessions` import + `include_router` | `main.py` |

## 구현 원칙

- 각 테스트를 통과하는 데 필요한 최소한의 코드만 작성
- 리팩토링, 최적화, 기능 추가 없음
- 실행 계획의 코드 그대로 사용
