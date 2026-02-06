# 핀볼 방문 API 보내기 실행계획

## 요구사항 요약

**요구사항**: 핀볼 게임에 접속하면 `POST /api/v1/game_visits`에 요청을 보내도록 한다.

**목적**: 핀볼 게임의 일일 접속자 수를 추적하기 위해 게임 접속 시 방문 기록을 서버에 저장한다.

## 현재상태 분석

- **백엔드**: `POST /api/v1/game_visits` 엔드포인트가 이미 구현되어 있다 (`backend/main.py:769`).
  - 요청 스키마: `GameVisitCreateRequest` — `user_id` (Optional[int], 비로그인 사용자는 null)
  - 응답 스키마: `GameVisitCreateResponse` — `message`, `user_id`, `ip_address`, `created_at`, `is_new_record`
  - 오늘 날짜 + IP 기준 중복 방지 로직이 이미 있다.
  - user_id가 null인 기존 레코드에 로그인 사용자가 접속하면 user_id를 업데이트한다.
- **프론트엔드**: `Pinball.jsx`에 game_visits API 호출 코드가 없다.
  - axios가 이미 import되어 있다.
  - `useAuth()`로 `user` 객체에 접근 가능하다 (`user.id`로 user_id 획득).

## 구현 방법

Pinball 컴포넌트가 마운트될 때 `useEffect`를 사용하여 `POST /api/v1/game_visits`를 한 번 호출한다. 로그인 사용자는 `user_id`를 포함하고, 비로그인 사용자는 `user_id: null`로 보낸다. 백엔드에서 IP 기준 중복 방지를 처리하므로 프론트엔드에서는 별도의 중복 방지 로직이 필요하지 않다.

## 구현 단계

### 1. Pinball.jsx에 게임 방문 API 호출 useEffect 추가

```javascript
// Pinball 컴포넌트 내부, 기존 useEffect들 사이에 추가
useEffect(() => {
  const recordGameVisit = async () => {
    try {
      await axios.post('/api/v1/game_visits', {
        user_id: user?.id || null
      });
    } catch (error) {
      console.error('Game visit recording failed:', error);
    }
  };

  recordGameVisit();
}, []);
```
- **무엇을 하는가**: 핀볼 게임 컴포넌트가 화면에 표시될 때 서버에 방문 기록을 전송한다.
- 의존성 배열이 `[]`이므로 컴포넌트 마운트 시 한 번만 실행된다.
- `user?.id || null`로 로그인 여부에 관계없이 요청을 보낸다.
- API 호출 실패 시 console.error로 에러를 출력하고, 게임 플레이에는 영향을 주지 않는다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| frontend/src/Pinball.jsx | 수정 | 게임 방문 기록 API 호출 useEffect 추가 |

## 완료 체크리스트

- [o] 핀볼 게임에 접속하면 브라우저 개발자 도구 Network 탭에서 `POST /api/v1/game_visits` 요청이 발생하는지 확인
- [o] 응답 상태 코드가 201 (최초 접속) 또는 200 (같은 날 재접속)인지 확인
- [o] 로그인 상태로 접속하면 응답의 `user_id`에 본인 ID가 포함되는지 확인
- [o] 비로그인 상태로 접속하면 응답의 `user_id`가 null인지 확인
- [o] 같은 날 여러 번 접속해도 DB에 레코드가 하나만 생성되는지 확인 (백엔드 중복 방지)
