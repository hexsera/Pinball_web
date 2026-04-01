# TDD RED 계획: 게임 세션 API

## 구현 목표

Redis를 저장소로 사용하는 `/api/v1/game-sessions/{user_id}` GET/PUT/DELETE 엔드포인트 구현

## RED 테스트 목록

1. `test_put_game_session_saves_data`: PUT 요청 시 200 반환 + score/lives/stage/user_id/updated_at 포함 확인
2. `test_put_game_session_overwrites_existing`: 같은 user_id로 PUT 두 번 시 최신 값으로 덮어쓰기 확인
3. `test_get_game_session_returns_saved_data`: PUT 후 GET 요청 시 동일한 값 반환 확인
4. `test_get_game_session_returns_404_when_not_found`: 세션 없는 user_id로 GET 시 404 반환 확인
5. `test_delete_game_session_removes_data`: DELETE 후 GET 요청 시 404 반환 확인
6. `test_delete_game_session_returns_success_message`: DELETE 요청 시 200 + `{"message": "session deleted"}` 반환 확인
7. `test_delete_game_session_is_idempotent`: 세션 없는 user_id로 DELETE 시에도 200 반환 확인 (멱등성)

## 테스트 파일 위치

`backend/tests/test_game_sessions.py`

## 테스트 격리 전략

- Redis는 실제 `redis-server` 컨테이너에 연결 (mock 사용 안 함)
- 각 테스트 전후로 `game_session:{user_id}` key를 삭제하는 fixture 사용
- `client` fixture는 기존 conftest.py 것 재사용 (DB 세션은 필요 없지만 앱 자체 로딩에 필요)
