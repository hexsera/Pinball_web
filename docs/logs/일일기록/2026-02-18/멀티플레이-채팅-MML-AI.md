# 멀티플레이 + 채팅 + MML AI 연결 PRD

## 목표

핀볼 게임에 실시간 멀티플레이 기능을 추가하고, 게임 화면 옆에 채팅창을 배치한다.
채팅창은 다른 플레이어와의 대화 및 MML API를 통한 AI 대화를 모두 지원한다.

---

## 현재상태 분석

- 프론트엔드: React + Matter.js 단일 플레이어 핀볼 게임 (`Pinball.jsx` 약 1,300줄)
- 백엔드: FastAPI + PostgreSQL, REST API만 존재 (WebSocket 없음)
- 실시간 통신 인프라: 전혀 없음 (WebSocket, Socket.IO 미구현)
- 채팅 관련 DB 테이블: 없음
- 친구 시스템은 존재 (멀티플레이 룸 초대에 활용 가능)
- MML 연결: 없음

---

## 실행 방법 및 단계

### Phase 1: WebSocket 인프라 구축 (백엔드)

1. `requirements.txt`에 `websockets`, `python-multipart` 추가
2. `backend/models.py`에 `GameRoom` 테이블 추가 (room_code, host_id, status, created_at)
4. Alembic 마이그레이션 실행
5. `backend/app/api/v1/chat.py` 생성: WebSocket 엔드포인트 `/api/v1/ws/chat/{room_id}` 구현
6. `backend/app/api/v1/rooms.py` 생성: 방 생성/참여/조회 REST API 구현
7. `backend/main.py`에 신규 라우터 등록

### Phase 2: 멀티플레이 게임 상태 동기화

8. `backend/app/api/v1/game_ws.py` 생성: WebSocket 엔드포인트 `/api/v1/ws/game/{room_id}` 구현
9. 서버에서 ConnectionManager 클래스로 방별 연결 관리 (dict로 room_id → [connections])
10. 게임 이벤트 메시지 형식 정의: `{type: "score"|"life"|"stage"|"end", data: {...}}`
11. `Pinball.jsx`에서 WebSocket 연결 추가, 점수/스테이지 변경 시 서버로 전송
12. 상대방 점수를 게임 UI 내 오버레이로 실시간 표시

### Phase 3: 채팅 UI 구현 (프론트엔드)

13. `frontend/src/components/Chat/ChatPanel.jsx` 생성 (채팅 패널 컴포넌트)
14. `frontend/src/components/Chat/ChatMessage.jsx` 생성 (개별 메시지 컴포넌트)
15. `PinballPage.jsx`에서 레이아웃을 flex row로 수정: 게임 영역 + 채팅 패널 배치
16. 채팅 패널에 일반 채팅 / AI 채팅 탭 UI 구현
17. 채팅 WebSocket 클라이언트 로직 구현 (연결, 재연결, 메시지 전송/수신)

### Phase 4: MML AI 연결

18. MML API 키를 `backend/.env`에 `MML_API_KEY` 형태로 추가
19. `backend/app/api/v1/ai_chat.py` 생성: `POST /api/v1/ai-chat` 엔드포인트 구현
20. 프론트엔드 AI 탭에서 메시지 입력 시 `/api/v1/ai-chat`로 HTTP POST 요청 전송
21. AI 응답을 채팅창에 AI 메시지 형태로 표시

### Phase 5: 방 관리 UI

22. `frontend/src/pages/Lobby/LobbyPage.jsx` 생성: 방 목록, 방 생성, 방 입장 UI
23. React Router에 `/lobby` 경로 추가
24. Dashboard 또는 네비게이션에 멀티플레이 진입 버튼 추가

---

## 멀티플레이 게임 구조

### 기본 방식

- **같은 게임판 공유**: 두 플레이어가 하나의 핀볼 게임판을 함께 조작
- **물리 계산**: 방장(host) 클라이언트의 Matter.js가 공의 물리를 계산하고, 상대방에게 공 위치/속도를 WebSocket으로 전송
- **상대방 클라이언트**: 물리 계산 없이 수신한 위치 데이터로 공을 렌더링만 함

### 플리퍼 역할 분담

```
┌─────────────────────────┐
│         범퍼 구역         │
│                         │
│   [상단 플리퍼] ← 상대방  │
│   ─────────────         │
│         공               │
│   ─────────────         │
│   [하단 플리퍼] ← 나       │
│                         │
└─────────────────────────┘
```

- **방장(host)**: 하단 플리퍼 조작 (기존 키: `Z`, `X` 또는 좌/우 방향키)
- **게스트(guest)**: 상단 플리퍼 조작 (별도 키 할당 필요, 예: `A`, `D`)
- 각자 자신의 플리퍼 입력을 WebSocket으로 서버에 전송 → 서버가 상대방에게 중계
- 방장 클라이언트는 상대방 플리퍼 입력을 받아 Matter.js 상에서 직접 적용

### WebSocket 메시지 형식

```json
// 방장 → 서버 → 게스트: 공 상태 동기화 (60fps 목표)
{ "type": "ball_state", "data": { "x": 400, "y": 600, "vx": -2.3, "vy": 5.1 } }

// 게스트 → 서버 → 방장: 플리퍼 입력 중계
{ "type": "flipper", "data": { "side": "left" | "right", "action": "press" | "release" } }

// 양방향: 점수/목숨/스테이지 변경 알림
{ "type": "score", "data": { "score": 1200 } }
{ "type": "life", "data": { "lives": 2 } }
{ "type": "stage", "data": { "stage": 2 } }

// 게임 종료
{ "type": "game_over", "data": { "loser": "guest" } }
```

### 승패 판정

- 먼저 목숨 3개를 모두 잃은 쪽이 **패배**
- 게임 오버 발생 시 `game_over` 메시지를 서버가 양쪽에 브로드캐스트
- 양쪽 화면에 승/패 결과 오버레이 표시 후 로비로 복귀

### Pinball.jsx 수정 포인트

| 수정 항목 | 내용 |
|----------|------|
| 역할 분기 | `isHost` prop으로 방장/게스트 구분 |
| 플리퍼 위치 | 게스트용 상단 플리퍼 추가 (Matter.js body 추가) |
| 물리 루프 | 방장만 Matter.js Runner 실행, 게스트는 수신 좌표로 공 위치 강제 설정 |
| 입력 처리 | 게스트 키 입력 → WebSocket 전송 (로컬 물리 적용 X) |
| 네트워크 레이턴시 | 게스트 화면에서 공 위치 보간(interpolation) 처리 |

---

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|---|---|
| FastAPI WebSocket | 실시간 양방향 통신 엔드포인트 |
| `websockets` (Python) | WebSocket 연결 처리 라이브러리 |
| Browser WebSocket API | 프론트엔드 WebSocket 클라이언트 (추가 패키지 불필요) |
| MML API (HTTP) | AI 대화 응답 생성 |
| Alembic | GameRoom 테이블 마이그레이션 |
| MUI (기존) | 채팅 UI 컴포넌트 (TextField, Button, List 등) |

---

## 테스트 방법

1. **WebSocket 연결 테스트**: Postman 또는 `wscat` 도구로 `/api/v1/ws/chat/{room_id}`에 직접 연결하여 메시지 송수신 확인
2. **멀티플레이 동기화 테스트**: 브라우저 2개에서 같은 방에 입장, 한쪽에서 게임 진행 시 다른 쪽에 점수 표시 확인
3. **채팅 테스트**: 두 브라우저에서 채팅 메시지 전송 후 양쪽 모두 수신 확인
4. **AI 채팅 테스트**: AI 탭에서 메시지 입력 후 MML API 응답 수신 확인
5. **백엔드 단위 테스트**: `docker compose exec fastapi pytest tests/test_chat.py -v`

---

## 체크리스트

- [ ] WebSocket 연결 시 콘솔 오류 없이 연결 성공 메시지 출력
- [ ] 방 1개에 2명 입장 후 한쪽 점수가 실시간으로 상대방 화면에 표시
- [ ] 채팅 메시지 전송 시 같은 방의 모든 사용자에게 1초 이내 수신
- [ ] AI 탭에서 질문 입력 후 3초 이내 AI 응답 표시
- [ ] 연결 끊김(탭 닫기) 시 서버에서 해당 연결 정상 제거 (로그 확인)
- [ ] `pytest` 실행 시 기존 테스트 모두 통과 + 신규 chat 테스트 통과
- [ ] 모바일 화면에서 채팅 패널이 게임 아래로 배치되어 정상 표시
