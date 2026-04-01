# TDD GREEN 완료: gameSession.js

## 구현 완료 항목

- `saveGameSession`: PUT `/api/v1/game-sessions/{userId}` 호출
- `loadGameSession`: GET `/api/v1/game-sessions/{userId}` 호출, 404면 null 반환
- `deleteGameSession`: DELETE `/api/v1/game-sessions/{userId}` 호출

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/utils/gameSession.js` | 신규 생성 |

## 통과한 테스트 목록

1. saveGameSession은 올바른 URL로 PUT 요청을 보낸다
2. saveGameSession은 score, lives, stage를 요청 body에 포함한다
3. saveGameSession은 PUT 요청이 실패하면 에러를 throw한다
4. loadGameSession은 올바른 URL로 GET 요청을 보낸다
5. loadGameSession은 세션이 있으면 데이터를 반환한다
6. loadGameSession은 404면 null을 반환한다
7. loadGameSession은 404 외 오류는 에러를 throw한다
8. deleteGameSession은 올바른 URL로 DELETE 요청을 보낸다
9. deleteGameSession은 DELETE 요청이 실패하면 에러를 throw한다

## 다음 단계

- REFACTOR 단계 (필요 시)
- Pinball.jsx에 세션 복원·저장·삭제 로직 추가
