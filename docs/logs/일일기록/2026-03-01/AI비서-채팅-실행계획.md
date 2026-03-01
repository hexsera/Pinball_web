# AI 비서 채팅 (OpenClaw 스타일) 실행계획

## 요구사항 요약

**요구사항**: OpenClaw 스타일의 AI 비서 채팅 기능 구현 — 채팅창(프론트엔드) + LLM API 연동 서버(백엔드)

**목적**: 사용자가 웹 UI에서 AI와 자유롭게 대화할 수 있는 범용 AI 비서 페이지를 만든다.
현재 ChatPanel은 핀볼 게임 전용 AI 대화(게임 말투, 핀볼 주제 한정)로만 동작하므로, 범용 AI 비서 기능이 없다.

---

## 현재상태 분석

- **프론트엔드**: `ChatPanel`, `ChatMessage`, `ChatInput` 컴포넌트가 이미 구현되어 있음
  - AIPinball 페이지 내 패널로만 사용 중 (핀볼 대화 전용)
  - `App.jsx`에 독립 AI 채팅 페이지(`/chat`) 라우트 없음
- **백엔드**: `POST /api/v1/chat` 엔드포인트가 이미 구현됨
  - Gemini `gemini-2.5-flash` 모델 사용, 시스템 프롬프트가 핀볼 게임 전용으로 고정
  - 세션을 서버 메모리(`_sessions` dict)에 저장 (재시작 시 초기화됨)
- **LLM SDK**: `google-genai` 패키지가 이미 설치되어 있음
- **추가 필요**: 범용 AI 비서 전용 엔드포인트 + 독립 채팅 페이지

---

## 구현 방법

**OpenClaw 아키텍처 참조**:
- Gateway (채팅 UI) → Agent Runtime (FastAPI) → LLM Provider (Gemini)
- 세션 기반 멀티턴 대화: `chat_id`로 서버 메모리의 Chat 객체를 식별
- 모델 선택: 기존 `gemini-2.5-flash` 유지 (빠르고 저렴)
- 시스템 프롬프트: 게임 한정 → 범용 AI 비서로 교체

**최소 구현 범위**:
1. 백엔드: `/api/v1/assistant` 엔드포인트 추가 (범용 시스템 프롬프트)
2. 프론트엔드: `/chat` 라우트에 독립 채팅 페이지 생성 (기존 ChatPanel 재사용)

---

## 구현 단계

### 1. 백엔드 — 범용 AI 비서 엔드포인트 추가

`backend/app/api/v1/chat.py`에 새 라우터 추가:

```python
ASSISTANT_SYSTEM_PROMPT = (
    "너는 유능한 AI 비서다. "
    "사용자의 질문에 정확하고 친절하게 답한다. "
    "한국어로 대화하되, 사용자가 영어로 물으면 영어로 답한다. "
    "모르는 것은 모른다고 말한다."
)

_assistant_sessions: dict = {}

@router.post("/assistant", response_model=ChatResponse)
def assistant_chat(request: ChatRequest):
    client = _get_client()
    if request.chat_id and request.chat_id in _assistant_sessions:
        chat_session = _assistant_sessions[request.chat_id]
        chat_id = request.chat_id
    else:
        chat_session = client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=ASSISTANT_SYSTEM_PROMPT,
            ),
        )
        chat_id = str(uuid.uuid4())
        _assistant_sessions[chat_id] = chat_session

    response = chat_session.send_message(request.message)
    return ChatResponse(chat_id=chat_id, reply=response.text)
```

- **무엇을 하는가**: 핀볼 전용 `/chat`과 분리된 범용 AI 비서 엔드포인트
- 기존 `_sessions`(핀볼용)과 `_assistant_sessions`(비서용)을 분리하여 대화 맥락 혼용 방지
- `ChatRequest`, `ChatResponse` 스키마를 그대로 재사용하므로 스키마 변경 없음
- 시스템 프롬프트에 언어 전환 규칙 포함

---

### 2. 프론트엔드 — 독립 AI 채팅 페이지 생성

`frontend/src/pages/ChatPage/ChatPage.jsx` 신규 생성:

```jsx
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import axios from 'axios';
import ChatMessage from '../../components/ChatPanel/ChatMessage';
import ChatInput from '../../components/ChatPanel/ChatInput';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMsg = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    try {
      const { data } = await axios.post('/api/v1/assistant', {
        chat_id: chatId,
        message: userMsg.content,
      });
      setChatId(data.chat_id);
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A' }}>
      <AppBar position="static" sx={{ backgroundColor: '#1E293B' }}>
        <Toolbar>
          <SmartToyIcon sx={{ mr: 1 }} />
          <Typography variant="h6">AI 비서</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <Typography sx={{ color: '#64748B', textAlign: 'center', mt: 4 }}>
            무엇이든 물어보세요
          </Typography>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        <div ref={bottomRef} />
      </Box>
      <ChatInput
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onSend={handleSend}
        disabled={!inputValue.trim() || isLoading}
      />
    </Box>
  );
}
```

- **무엇을 하는가**: 전체 화면을 차지하는 독립 AI 비서 채팅 페이지
- `ChatMessage`, `ChatInput` 기존 컴포넌트를 그대로 재사용
- `/api/v1/assistant` 엔드포인트 호출 (핀볼 Chat과 분리)
- 상태: `messages`, `chatId`, `isLoading` — ChatPanel 구조와 동일하게 유지

---

### 3. 프론트엔드 — 라우트 등록 및 index.js 생성

`frontend/src/pages/ChatPage/index.js`:

```js
export { default } from './ChatPage';
```

`frontend/src/App.jsx`에 라우트 추가:

```jsx
import ChatPage from './pages/ChatPage';

// Routes 안에 추가
<Route path="/chat" element={<ChatPage />} />
```

- **무엇을 하는가**: `/chat` URL로 접근하면 AI 비서 페이지가 렌더링됨
- 기존 라우트 패턴(`import → Route 추가`)과 동일한 방식으로 등록

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/chat.py` | 수정 | `POST /api/v1/assistant` 라우터 + 시스템 프롬프트 추가 |
| `frontend/src/pages/ChatPage/ChatPage.jsx` | 생성 | 독립 AI 비서 채팅 페이지 |
| `frontend/src/pages/ChatPage/index.js` | 생성 | re-export |
| `frontend/src/App.jsx` | 수정 | `/chat` 라우트 추가 |

---

## 완료 체크리스트

- [ ] `http://localhost:5173/chat` 접근 시 AI 비서 채팅 화면이 표시된다
- [ ] 메시지 입력 후 전송 시 AI 응답이 채팅 말풍선으로 표시된다
- [ ] 여러 번 대화 시 이전 대화 맥락을 유지한다 (멀티턴)
- [ ] 핀볼 게임 AI 채팅(`/pinball` 내 ChatPanel)은 기존 동작을 유지한다
- [ ] Docker 재시작 후 새 대화가 정상적으로 시작된다 (세션 초기화 허용)
- [ ] 백엔드 로그에 에러 없이 `/api/v1/assistant` 요청이 처리된다
