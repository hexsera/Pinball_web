# TDD GREEN 계획: gameSession.js

## 통과시킬 테스트 목록

1. `saveGameSession은 올바른 URL로 PUT 요청을 보낸다`
2. `saveGameSession은 score, lives, stage를 요청 body에 포함한다`
3. `saveGameSession은 PUT 요청이 실패하면 에러를 throw한다`
4. `loadGameSession은 올바른 URL로 GET 요청을 보낸다`
5. `loadGameSession은 세션이 있으면 데이터를 반환한다`
6. `loadGameSession은 404면 null을 반환한다`
7. `loadGameSession은 404 외 오류는 에러를 throw한다`
8. `deleteGameSession은 올바른 URL로 DELETE 요청을 보낸다`
9. `deleteGameSession은 DELETE 요청이 실패하면 에러를 throw한다`

## 구현 계획

| 테스트 | 작성할 코드 | 파일 위치 |
|--------|------------|----------|
| 1, 2, 3 | `axios.put('/api/v1/game-sessions/${userId}', { score, lives, stage })` | `gameSession.js` |
| 4, 5, 6, 7 | `axios.get(...)`, 404면 null 반환, 그 외 throw | `gameSession.js` |
| 8, 9 | `axios.delete('/api/v1/game-sessions/${userId}')` | `gameSession.js` |

## 구현 원칙

- 각 테스트를 통과하는 데 필요한 최소한의 코드만 작성
- 리팩토링, 최적화, 기능 추가 없음
