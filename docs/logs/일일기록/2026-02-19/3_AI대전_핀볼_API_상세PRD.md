# AI 대전 핀볼 - API 부분 상세 PRD

## 목표

AI 대전 핀볼 모드(`/ai-pinball`)에서 필요한 백엔드 API를 구현한다. 1가지 기능을 제공한다:
1. **AI 채팅 API**: 게임 화면 옆 채팅 패널에서 플레이어가 LLM AI와 대화할 수 있는 엔드포인트

## 현재상태 분석

- **백엔드 스택**: FastAPI + PostgreSQL + SQLAlchemy ORM + Alembic 마이그레이션
- **기존 API 구조**: `/api/v1/` 접두사 사용 (예외: 헬스체크 `/api/`, 친구 요청 `/api/friend-requests/`)
- **기존 라우터**: auth, users, monthly_scores, game_visits, friends 총 5개
- **인증**: API Key(`X-API-Key` 헤더) 의존성이 정의되어 있으나 실제 적용된 엔드포인트 없음. 로그인 시 `localStorage`에 `{user_id, email, nickname, role}` 저장
- **채팅 관련 코드**: 없음. `POST /api/v1/chat` 엔드포인트와 `backend/services/llm_service.py`가 기존 PRD에 계획되어 있으나 미구현
- **라우터 등록 방식**: `main.py`에서 `app.include_router()`로 등록
- **스키마 패턴**: `app/schemas/` 디렉토리에 Pydantic v2 모델 정의, `app/schemas/__init__.py`에서 re-export
- **HTTPS 이슈 대응**: `redirect_slashes=False`, 라우터 경로 끝에 `/` 대신 `""` 사용

## 실행 방법 및 단계

### 1단계: AI 채팅 API 구현

#### 1-1. LLM 서비스 모듈 생성

파일: `backend/app/services/llm_service.py`

```python
# Google Gemini SDK를 사용하여 Gemini API를 호출하는 서비스 모듈

import google.generativeai as genai
from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = (
    "너는 핀볼 게임에서 플레이어와 대전 중인 AI다. "
    "게임 중 플레이어와 가볍게 대화한다. "
    "응답은 2~3문장 이내로 짧게 한다."
)

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction=SYSTEM_PROMPT
)

def chat_with_ai(messages: list[dict]) -> str:
    """
    messages: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}, ...]
    최근 대화 히스토리를 포함하여 Gemini API에 전달하고, AI 응답 텍스트를 반환한다.
    Gemini는 role을 "user"/"model"로 사용하므로 "assistant"를 "model"로 변환한다.
    """
    history = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": m["content"]}
        for m in messages[:-1]  # 마지막 메시지를 제외한 히스토리
    ]
    chat = model.start_chat(history=history)
    response = chat.send_message(messages[-1]["content"])
    return response.text
```

#### 1-2. 채팅 스키마 생성

파일: `backend/app/schemas/chat.py`

```python
from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str       # "user" 또는 "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]   # 대화 히스토리 (최근 N개)

class ChatResponse(BaseModel):
    message: str    # AI 응답 텍스트
```

#### 1-3. 채팅 라우터 생성

파일: `backend/app/api/v1/chat.py`

| 메서드 | 경로 | 요청 | 응답 | 설명 |
|--------|------|------|------|------|
| POST | `/api/v1/chat` | `ChatRequest` | `ChatResponse` | 대화 히스토리를 받아 AI 응답 반환 |

```python
from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.llm_service import chat_with_ai

router = APIRouter(prefix="/api/v1", tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
def send_chat(request: ChatRequest):
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        ai_response = chat_with_ai(messages)
        return ChatResponse(message=ai_response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 응답 생성 실패: {str(e)}")
```

#### 1-4. 환경변수 추가

`backend/.env`에 추가:
```
GEMINI_API_KEY=AIzaSy-xxxxx
```

`backend/app/core/config.py`의 `Settings` 클래스에 추가:
```python
GEMINI_API_KEY: str = ""
```

---

### 2단계: 라우터 등록

`backend/main.py`에 추가:
```python
from app.api.v1.chat import router as chat_router

app.include_router(chat_router)
```

---

### 3단계: 프론트엔드 API 연동

파일: `frontend/src/api/` 또는 `frontend/src/pages/AIPinball/` 내에서 Axios 호출

```javascript
// 채팅 전송
const sendChat = async (messages) => {
  const response = await axios.post('/api/v1/chat', { messages });
  return response.data.message;
};
```

프론트엔드 대화 히스토리 관리:
- `useState`로 `messages` 배열을 관리한다
- 유저 메시지 추가 → API 호출 → AI 응답을 배열에 추가
- API에 전송할 때 최근 20개 메시지만 포함한다 (토큰 비용 제한)

#### AI 자율 발화 (사람처럼 자연스러운 채팅)

탁구식 1:1 응답 구조가 아니라, AI가 자율적으로 먼저 말을 걸기도 한다. 두 가지 시점에서 AI 자율 발화가 발생한다.

**1. 게임 시작 시 (확률 기반)**

게임 마운트 시 50% 확률로 AI가 먼저 인사한다. 나머지 50%는 플레이어가 먼저 말을 거는 상황이 된다.

```javascript
useEffect(() => {
  const maybeGreet = async () => {
    if (Math.random() < 0.5) return; // 50% 확률로 AI가 먼저 말하지 않음
    const response = await axios.post('/api/v1/chat', {
      messages: [{ role: 'user', content: '게임이 시작됐어. 상대방에게 한마디 해줘.' }]
    });
    setMessages([{ role: 'assistant', content: response.data.message }]);
  };
  maybeGreet();
}, []);
```

**2. 게임 중 AI 자율 발화 (주기적 확률)**

플레이어가 말하지 않아도, 일정 주기마다 확률적으로 AI가 먼저 말을 건다. 게임 상황(점수 변화, 목숨 변화 등)을 트리거로 활용한다.

```javascript
// 게임 이벤트(점수 변화, 목숨 변화) 발생 시 30% 확률로 AI 자율 발화
const maybeAISpeak = async (eventContext) => {
  if (Math.random() > 0.3) return; // 70%는 침묵

  const response = await axios.post('/api/v1/chat', {
    messages: [
      ...messages.slice(-10), // 최근 대화 히스토리
      { role: 'user', content: eventContext } // 게임 상황을 AI에게 전달
    ]
  });
  setMessages(prev => [...prev, { role: 'assistant', content: response.data.message }]);
};

// 사용 예시
// 점수 증가 시: maybeAISpeak('상대방이 방금 점수를 올렸어. 반응해줘.')
// 목숨 감소 시: maybeAISpeak('상대방이 방금 목숨을 잃었어. 반응해줘.')
```

**동작 정리**

| 시점 | 트리거 | 발화 확률 |
|------|--------|----------|
| 게임 시작 | 마운트 | 50% |
| 점수 변화 | 점수 state 변경 | 30% |
| 목숨 변화 | 목숨 state 변경 | 30% |
| 플레이어 메시지 | 플레이어 전송 | 100% (항상 응답) |

- AI 자율 발화와 플레이어 발화가 동시에 겹치지 않도록 `isAISpeaking` 플래그로 중복 호출을 방지한다
- 연속 자율 발화를 막기 위해 마지막 자율 발화로부터 최소 15초 쿨다운을 둔다

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|-------------|------|
| FastAPI (기존) | API 엔드포인트 생성 |
| Pydantic v2 (기존) | 요청/응답 스키마 검증 |
| Google Generative AI SDK (신규) | Gemini API 호출 (`pip install google-generativeai`) |
| Axios (기존, 프론트엔드) | 프론트엔드에서 채팅 API 호출 |

`backend/requirements.txt`에 추가:
```
google-generativeai>=0.8.0
```

## 테스트 방법

1. **채팅 API 단위 테스트**: `POST /api/v1/chat`에 메시지 배열을 전송하고 AI 응답이 반환되는지 확인한다
2. **채팅 API 에러 테스트**: 빈 메시지 배열, 잘못된 role 값 등 비정상 요청에 대해 적절한 에러가 반환되는지 확인한다
3. **프론트엔드 연동 테스트**: 게임 화면에서 채팅 전송 시 AI 응답이 표시되는지 확인한다

## 체크리스트

- [ ] `POST /api/v1/chat`에 대화 히스토리를 전송하면 Gemini AI 응답 텍스트가 반환된다
- [ ] 빈 메시지 배열 전송 시 적절한 에러 응답이 반환된다
- [ ] 게임 시작 시 50% 확률로 AI가 먼저 인사 메시지를 표시한다
- [ ] 점수/목숨 변화 이벤트 발생 시 30% 확률로 AI가 자율적으로 말을 건다
- [ ] AI 자율 발화는 마지막 발화로부터 15초 쿨다운이 지난 후에만 발생한다
- [ ] 채팅 패널에서 메시지를 입력하고 전송하면 AI가 항상 응답한다
