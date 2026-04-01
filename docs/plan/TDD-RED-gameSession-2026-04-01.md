# TDD RED 계획: gameSession.js

## 구현 목표

`frontend/src/utils/gameSession.js`의 세 함수 구현:
- `saveGameSession(userId, { score, lives, stage })` — PUT 요청
- `loadGameSession(userId)` — GET 요청, 없으면 null 반환
- `deleteGameSession(userId)` — DELETE 요청

## RED 테스트 목록

### saveGameSession
1. `saveGameSession은 올바른 URL로 PUT 요청을 보낸다`: `/api/v1/game-sessions/{userId}`로 PUT 호출
2. `saveGameSession은 score, lives, stage를 요청 body에 포함한다`: 전달한 값이 그대로 body에 담김
3. `saveGameSession은 PUT 요청이 실패하면 에러를 throw한다`: axios 오류가 호출부로 전파됨

### loadGameSession
4. `loadGameSession은 올바른 URL로 GET 요청을 보낸다`: `/api/v1/game-sessions/{userId}`로 GET 호출
5. `loadGameSession은 세션이 있으면 데이터를 반환한다`: 서버 응답 data를 그대로 반환
6. `loadGameSession은 404면 null을 반환한다`: 404 응답 시 null 반환 (에러 throw 안 함)
7. `loadGameSession은 404 외 오류는 에러를 throw한다`: 500 등 다른 오류는 호출부로 전파

### deleteGameSession
8. `deleteGameSession은 올바른 URL로 DELETE 요청을 보낸다`: `/api/v1/game-sessions/{userId}`로 DELETE 호출
9. `deleteGameSession은 DELETE 요청이 실패하면 에러를 throw한다`: axios 오류가 호출부로 전파됨

## 테스트 파일 위치

`frontend/src/test/gameSession.test.js`
