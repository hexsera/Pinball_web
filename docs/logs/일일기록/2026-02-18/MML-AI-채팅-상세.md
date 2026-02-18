# AI 채팅 연결 상세 명세

## 개요

핀볼 게임 옆 채팅창에서 사용자가 AI와 대화할 수 있는 기능이다.
사용자가 메시지를 입력하면 FastAPI 백엔드가 LLM API에 요청을 보내고, AI 응답을 채팅창에 표시한다.

---

## LLM API 비교 및 추천

### 비교표 (4종)

| 항목 | Gemini 2.5 Flash | Gemini 2.5 Flash-Lite | OpenAI GPT-4o mini | Claude Haiku 4.5 |
|---|---|---|---|---|
| 입력 토큰 가격 | $0.30 / 1M | **$0.10 / 1M** | $0.15 / 1M | $1.00 / 1M |
| 출력 토큰 가격 | $2.50 / 1M | **$0.40 / 1M** | $0.60 / 1M | $5.00 / 1M |
| 무료 티어 | 신용카드 불필요, 15 RPD | 신용카드 불필요, 1,000 RPD | 없음 (결제 필수) | 없음 |
| 분당 요청 제한 (Tier 1) | 500~1,000 RPM | 500~1,000 RPM | ~500 RPM | 50 RPM |
| 응답 첫 토큰 속도 | **210~370 ms** | 250~400 ms | 500~800 ms | 490~700 ms |
| 한국어 품질 | **최우수** | 우수 | 우수 | 우수 |
| FastAPI 연동 난이도 | 쉬움 (`google-genai` SDK) | 쉬움 (`google-genai` SDK) | 쉬움 (`openai` SDK) | 쉬움 (`anthropic` SDK) |
| 스트리밍(SSE) | 지원 | 지원 | 지원 | 지원 |
| 비고 | 균형 최우수 | 최저가 | 안정적 | 고품질·고비용 |

> Gemini 2.0 Flash는 **2026년 3월 3일 서비스 종료** 예정이므로 신규 개발에 사용하지 않는다.

---

### 항목별 승자

| 항목 | 승자 | 이유 |
|---|---|---|
| 가격 | Gemini 2.5 Flash-Lite | 입력 $0.10, 출력 $0.40 — 4종 중 최저가 |
| 무료 티어 | Gemini | 신용카드 없이 사용 가능, 1,000 RPD |
| 응답 속도 | Gemini 2.5 Flash | TTFT 210~370ms, GPT-4o mini 대비 2배 빠름 |
| 한국어 품질 | Gemini | Google 검색/유튜브 한국어 데이터 학습량 우세 |
| 생태계·예제 | GPT-4o mini | FastAPI 연동 예제가 가장 많음 |
| 안정성 | GPT-4o mini | 장기 운영 이력, 예측 가능한 서비스 |

---

### 추천: Gemini 2.5 Flash (aistudio.google.com)

게임 채팅 용도에서 Gemini 2.5 Flash를 최우선 추천하는 이유:

1. **무료 개발**: 신용카드 없이 바로 API 키 발급 가능. 개발·테스트 단계를 0원으로 진행할 수 있다.
2. **속도**: TTFT 210~370ms로 GPT-4o mini 대비 약 2배 빠르다. 게임 중 채팅에서 체감 속도가 중요하다.
3. **한국어**: Google의 방대한 한국어 데이터 학습으로 자연스러운 한국어 대화가 가능하다.
4. **비용**: 비용이 중요해지면 Flash-Lite($0.10/$0.40)로 전환하면 GPT-4o mini보다 33% 저렴하다.
5. **SDK**: `google-genai` Python SDK가 async/streaming을 모두 지원하며 FastAPI와 자연스럽게 연동된다.

**차선책**: 이미 OpenAI 크레딧이 있거나, 기존 `openai` SDK를 활용하고 싶다면 GPT-4o mini를 사용한다.
**비추천**: Claude Haiku 4.5는 게임 채팅 목적에서 비용 대비 이점이 없다.

---

## WebSocket 개념

### WebSocket이란

WebSocket은 클라이언트(브라우저)와 서버 사이에 **연결을 끊지 않고 유지**하면서 양쪽이 언제든지 메시지를 주고받을 수 있는 통신 방식이다.

일반 HTTP와의 차이:

| 구분 | HTTP | WebSocket |
|---|---|---|
| 연결 방식 | 요청할 때마다 연결-응답-종료 반복 | 한 번 연결하면 계속 유지 |
| 통신 방향 | 클라이언트 → 서버 (단방향 요청) | 양방향 (서버도 먼저 전송 가능) |
| 속도 | 매 요청마다 연결 수립 오버헤드 발생 | 연결 유지로 오버헤드 없음 |
| 적합한 용도 | 파일 업로드, 로그인 등 단발성 요청 | 채팅, 실시간 게임, 알림 |

### WebSocket 연결 흐름

```
브라우저                        FastAPI 서버
   │                                │
   │── HTTP Upgrade 요청 ──────────▶│  (첫 연결 시 1회만)
   │◀── 101 Switching Protocols ────│
   │                                │
   │── 메시지 전송 ────────────────▶│  (언제든 가능)
   │◀── 메시지 수신 ────────────────│  (서버도 먼저 보낼 수 있음)
   │                                │
   │── 연결 종료 ──────────────────▶│  (탭 닫기 등)
```

### 이 프로젝트에서 WebSocket을 쓰는 이유

채팅창은 사용자 간 채팅과 AI 채팅을 모두 지원한다.
사용자 간 채팅은 **상대방이 먼저 메시지를 보낼 수 있으므로** 반드시 WebSocket이 필요하다.
AI 채팅도 같은 채팅창에서 동작하므로 연결을 하나로 통일해 코드를 단순하게 유지한다.

---

## 아키텍처

```
브라우저 (React)
    │
    │  ws://... (WebSocket 연결 1개, 상시 유지)
    │
    ▼
FastAPI WebSocket 핸들러
    │
    ├── type: "user_msg"  → 같은 방 사용자들에게 브로드캐스트
    │
    └── type: "ai_msg"   → Gemini API 호출
                               │
                               ▼
                         Gemini API (외부 HTTP)
                               │
                         토큰 단위로 WS를 통해 브라우저로 전송
                         { type: "ai_chunk", content: "안" }
                         { type: "ai_chunk", content: "녕" }
                         { type: "ai_done" }
```

### 메시지 타입 규격

채팅창에서 주고받는 모든 메시지는 JSON 형식이며 `type` 필드로 구분한다.

| type | 방향 | 설명 |
|---|---|---|
| `user_msg` | 클라이언트 → 서버 → 전체 브로드캐스트 | 사용자 간 일반 채팅 |
| `ai_msg` | 클라이언트 → 서버 | AI에게 질문 요청 |
| `ai_chunk` | 서버 → 클라이언트 | AI 응답 토큰 1개씩 스트리밍 |
| `ai_done` | 서버 → 클라이언트 | AI 응답 완료 신호 |
| `system` | 서버 → 클라이언트 | 입장/퇴장 알림 등 |

---

## Gemini API 키 발급 방법

### 1단계: Google AI Studio 접속

브라우저에서 [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) 에 접속한다.
Google 계정(Gmail)으로 로그인한다. Google 계정이 없으면 먼저 계정을 만들어야 한다.

### 2단계: 이용약관 동의

최초 접속 시 Google AI Studio 이용약관 동의 화면이 나타난다.
내용을 확인하고 동의 버튼을 클릭한다. 동의 후 자동으로 기본 Google Cloud 프로젝트가 생성된다.

### 3단계: API 키 생성

API Keys 페이지에서 **"Create API key"** 버튼을 클릭한다.
기존 Google Cloud 프로젝트가 있으면 선택하고, 없으면 "Create API key in new project"를 선택한다.
생성된 키(`AIza...` 로 시작하는 문자열)를 복사한다.

### 4단계: 환경 변수에 저장

복사한 키를 `backend/.env` 파일에 아래와 같이 저장한다.

```
GEMINI_API_KEY=AIza여기에붙여넣기
```

> **주의**: 이 키를 Git에 커밋하면 안 된다. `.env` 파일이 `.gitignore`에 포함되어 있는지 반드시 확인한다.

### 5단계 (선택): API 키 제한 설정

API 키가 외부에 노출될 경우를 대비해 사용 제한을 설정할 수 있다.
Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → 생성한 키 클릭 → **"애플리케이션 제한"** 에서 특정 IP 또는 도메인만 허용하도록 설정한다.

### 무료 티어 한도 (2026년 2월 기준)

| 모델 | 분당 요청(RPM) | 일일 요청(RPD) | 분당 토큰(TPM) |
|---|---|---|---|
| Gemini 2.5 Flash | 10 | 250 | 250,000 |
| Gemini 2.5 Flash-Lite | 15 | 1,000 | 250,000 |

무료 티어는 신용카드 없이 사용할 수 있다. 한도를 초과하면 429 에러가 반환된다.
한도를 초과할 경우 Google AI Studio에서 결제 정보를 등록하면 유료 티어로 자동 전환된다.

---

## 백엔드 구현

### 환경 변수 추가 (`backend/.env`)

```
GEMINI_API_KEY=AIza...
AI_CHAT_MODEL=gemini-2.5-flash
AI_CHAT_MAX_TOKENS=300
AI_CHAT_SYSTEM_PROMPT=너는 핀볼 게임 채팅창의 AI 친구야. 짧고 유쾌하게 대화해줘.
```

### 패키지 추가 (`backend/requirements.txt`)

```
google-genai>=1.0.0
websockets>=12.0
```

### WebSocket 엔드포인트 구조

- `GET /api/v1/ws/chat/{room_id}` — WebSocket 업그레이드 엔드포인트
- 클라이언트는 페이지 진입 시 이 주소로 WebSocket 연결을 맺는다.
- 서버는 `room_id` 별로 연결된 클라이언트 목록을 메모리에서 관리한다 (ConnectionManager).
- 수신한 메시지의 `type` 필드를 보고 사용자 채팅 또는 AI 채팅으로 분기한다.

### ConnectionManager (연결 관리자)

방마다 연결된 WebSocket 목록을 딕셔너리로 관리한다.
클라이언트가 연결되면 해당 방 목록에 추가하고, 연결이 끊기면 제거한다.
브로드캐스트는 같은 방의 모든 연결에 메시지를 전송하는 동작이다.

```python
# backend/app/api/v1/chat_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types
from backend.app.core.config import settings
import json

router = APIRouter()
gemini = genai.Client(api_key=settings.GEMINI_API_KEY)

# room_id → [WebSocket, ...] 형태로 연결 관리
class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, room_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(room_id, []).append(ws)

    def disconnect(self, room_id: str, ws: WebSocket):
        self.rooms.get(room_id, []).remove(ws)

    async def broadcast(self, room_id: str, message: dict):
        for ws in self.rooms.get(room_id, []):
            await ws.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/chat/{room_id}")
async def chat_ws(ws: WebSocket, room_id: str):
    await manager.connect(room_id, ws)
    try:
        while True:
            data = await ws.receive_json()

            if data["type"] == "user_msg":
                # 사용자 간 채팅: 같은 방 전체에 브로드캐스트
                await manager.broadcast(room_id, {
                    "type": "user_msg",
                    "nickname": data["nickname"],
                    "content": data["content"],
                })

            elif data["type"] == "ai_msg":
                # AI 채팅: Gemini 스트리밍 호출 후 토큰 단위로 전송
                history = data.get("history", [])[-10:]
                contents = [
                    types.Content(role=h["role"], parts=[types.Part(text=h["content"])])
                    for h in history
                ]
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part(text=data["content"])]
                ))
                async for chunk in await gemini.aio.models.generate_content_stream(
                    model=settings.AI_CHAT_MODEL,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=settings.AI_CHAT_SYSTEM_PROMPT,
                        max_output_tokens=settings.AI_CHAT_MAX_TOKENS,
                        temperature=0.8,
                    )
                ):
                    if chunk.text:
                        await ws.send_json({"type": "ai_chunk", "content": chunk.text})
                await ws.send_json({"type": "ai_done"})

    except WebSocketDisconnect:
        manager.disconnect(room_id, ws)
        await manager.broadcast(room_id, {
            "type": "system",
            "content": f"{data.get('nickname', '누군가')}가 퇴장했습니다.",
        })
```

---

## 프론트엔드 구현

### WebSocket 연결 및 메시지 처리 흐름

1. 채팅창 컴포넌트가 마운트될 때 `new WebSocket(...)` 으로 서버에 연결한다.
2. `ws.onmessage` 이벤트에서 수신한 메시지의 `type`을 확인해 화면에 표시한다.
3. 사용자가 메시지를 입력하면 `ws.send(JSON.stringify({...}))` 로 서버에 전송한다.
4. AI 탭에서 전송 시 `type: "ai_msg"` 와 최근 history 10개를 함께 전송한다.
5. `ai_chunk` 메시지가 도착할 때마다 AI 메시지 말풍선에 텍스트를 이어 붙인다. `ai_done` 수신 시 완료 처리한다.

### WebSocket 연결 코드

```js
// 컴포넌트 마운트 시
const ws = new WebSocket(`wss://도메인/api/v1/ws/chat/${roomId}`);

ws.onopen = () => console.log('채팅 연결됨');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'user_msg') {
    // 사용자 메시지 채팅창에 추가
    addMessage({ sender: msg.nickname, content: msg.content, isAi: false });

  } else if (msg.type === 'ai_chunk') {
    // AI 응답 말풍선에 텍스트 이어붙이기 (타이핑 효과)
    appendToLastAiMessage(msg.content);

  } else if (msg.type === 'ai_done') {
    // AI 응답 완료 — 로딩 인디케이터 제거
    setAiLoading(false);

  } else if (msg.type === 'system') {
    // 시스템 메시지 표시
    addSystemMessage(msg.content);
  }
};

ws.onclose = () => console.log('채팅 연결 종료');

// 사용자 메시지 전송
const sendUserMessage = (content) => {
  ws.send(JSON.stringify({ type: 'user_msg', nickname, content }));
};

// AI 메시지 전송
const sendAiMessage = (content) => {
  setAiLoading(true);
  ws.send(JSON.stringify({ type: 'ai_msg', content, history: aiHistory.slice(-10) }));
};
```

---

## 비용 추정

- 평균 사용자 메시지: 30 토큰 입력 / 80 토큰 출력
- 하루 1,000회 AI 채팅 기준
  - 입력: 30,000 토큰 → $0.0045
  - 출력: 80,000 토큰 → $0.048
  - **하루 합계: 약 $0.05 (약 70원)**

---

## 주의사항

- `GEMINI_API_KEY`는 절대로 프론트엔드 코드에 포함하지 않는다. 반드시 백엔드에서만 호출한다.
- 사용자 입력을 Gemini에 그대로 전달하므로 악성 프롬프트 인젝션 가능성이 있다. `system_instruction`으로 역할을 명확히 제한한다.
- 대화 history를 무한정 누적하면 토큰이 급증한다. 최근 10개 메시지로 제한한다.
- WebSocket 연결이 끊겼을 때(`onclose`) 자동 재연결 로직을 프론트엔드에 구현해야 한다. 그렇지 않으면 새로고침 없이 채팅이 불가능해진다.
- 서버 재시작 시 ConnectionManager의 연결 목록이 초기화된다. 클라이언트는 재연결 시 자동으로 방에 다시 입장하도록 처리한다.

---

## 체크리스트

- [ ] `GEMINI_API_KEY`가 `backend/.env`에 설정되어 있음
- [ ] `wss://도메인/api/v1/ws/chat/{room_id}` 에 WebSocket 연결 성공 확인
- [ ] 사용자 A가 메시지 전송 시 같은 방의 사용자 B 화면에 실시간 표시됨
- [ ] AI 탭에서 질문 전송 시 타이핑 효과로 AI 응답이 스트리밍 표시됨
- [ ] 한국어 메시지 입력 시 한국어로 응답
- [ ] 탭을 닫으면 서버에서 해당 연결이 제거되고 퇴장 시스템 메시지가 표시됨
- [ ] 네트워크 끊김 후 재연결 시 채팅 기능 정상 복구됨
- [ ] Gemini 무료 티어(15 RPM) 초과 시 AI 오류 메시지가 채팅창에 표시됨
- [ ] API 키가 브라우저 개발자 도구 어디에도 노출되지 않음
