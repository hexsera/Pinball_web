# OpenClaw AI 비서 (Node.js + WebSocket) 실행계획

## 요구사항 요약

**요구사항**: 독립 채팅 페이지(React) + Node.js AI 서버(Docker) + WebSocket 연결 + LLM API 통신

**목적**: 기존 FastAPI와 분리된 전용 AI 비서 서버를 Node.js로 구축하고, HTTP 폴링 대신 WebSocket으로 실시간 스트리밍 응답을 제공한다.

---

## 현재상태 분석

- **프론트엔드**: `ChatPanel`, `ChatMessage`, `ChatInput` 컴포넌트 존재. `/chat` 라우트 없음
- **현재 AI 채팅**: `POST /api/v1/chat` (FastAPI, HTTP, 핀볼 전용 시스템 프롬프트)
- **Docker**: traefik, nginx, fastapi, postgres, mysql 5개 서비스 운영 중. Node.js 서버 없음
- **Traefik 라우팅**: `/api` 경로 → FastAPI. Node.js 서버용 경로(`/ws`) 미존재
- **신규 추가 필요**: Node.js 서버 컨테이너, WebSocket 라우팅, React 채팅 페이지

---

## 구현 방법

- **Node.js 서버**: `ws` 패키지로 WebSocket 서버 구현. LLM은 OpenAI SDK(또는 Google Generative AI)로 API 호출
- **WebSocket 통신**: 클라이언트가 메시지 전송 → Node.js가 수신 → LLM API 호출 → 응답을 WebSocket으로 전송
- **Traefik 라우팅**: `PathPrefix(/ws-chat)` 규칙으로 Node.js 컨테이너로 라우팅. WebSocket 업그레이드 헤더 통과 설정
- **React 채팅 페이지**: `useRef`로 WebSocket 연결 유지. 기존 `ChatMessage`, `ChatInput` 컴포넌트 재사용

---

## 구현 단계

### 1. Node.js AI 서버 디렉토리 및 패키지 초기화

```
ai-server/
├── Dockerfile
├── package.json
└── src/
    └── index.js
```

```json
{
  "name": "ai-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "start": "node src/index.js" },
  "dependencies": {
    "ws": "^8.18.0",
    "@google/genai": "^1.0.0",
    "dotenv": "^16.0.0"
  }
}
```

- **무엇을 하는가**: Node.js AI 서버의 패키지 구성 파일 생성
- `ws`: Node.js용 WebSocket 서버 라이브러리 (표준 WS 프로토콜 지원)
- `@google/genai`: 기존 FastAPI에서 사용 중인 Gemini API와 동일 모델 사용
- `"type": "module"`: ES Module 방식으로 `import/export` 문법 사용

---

### 2. Node.js WebSocket 서버 구현

```javascript
// ai-server/src/index.js
import { WebSocketServer } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3001;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `너는 유능한 AI 비서다.
사용자의 질문에 정확하고 친절하게 답한다.
한국어로 대화하되, 사용자가 영어로 물으면 영어로 답한다.
모르는 것은 모른다고 말한다.`;

const sessions = new Map(); // chatId → chat 객체

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    const { chatId, message } = JSON.parse(raw);

    let chat = sessions.get(chatId);
    if (!chat) {
      chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: SYSTEM_PROMPT },
      });
      sessions.set(chatId, chat);
    }

    const response = await chat.sendMessage({ message });
    ws.send(JSON.stringify({ chatId, reply: response.text }));
  });
});

console.log(`AI WebSocket server running on ws://localhost:${PORT}`);
```

- **무엇을 하는가**: WebSocket 연결을 수신하고 메시지를 Gemini API에 전달한 뒤 응답을 반환하는 서버
- `sessions Map`: 접속자별 멀티턴 대화 세션을 메모리에 보관 (`chatId` 키)
- 클라이언트는 `JSON.stringify({ chatId, message })` 형태로 메시지 전송
- 서버는 `JSON.stringify({ chatId, reply })` 형태로 응답 반환

---

### 3. Node.js 서버 Dockerfile 작성

```dockerfile
# ai-server/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY src/ ./src/
EXPOSE 3001
CMD ["node", "src/index.js"]
```

- **무엇을 하는가**: Node.js 서버를 Docker 이미지로 패키징
- `node:22-alpine`: 경량 Alpine 기반 LTS Node.js 이미지
- `--omit=dev`: 프로덕션 의존성만 설치하여 이미지 크기 최소화
- `EXPOSE 3001`: 컨테이너 내부 포트 명시 (Traefik이 이 포트로 프록시)

---

### 4. docker-compose.yml에 ai-server 서비스 추가

```yaml
  ai-server:
    build: ./ai-server
    container_name: ai-server
    restart: always
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - PORT=3001
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ai-server.rule=Host(`hexsera.com`) && PathPrefix(`/ws-chat`)"
      - "traefik.http.routers.ai-server.entrypoints=websecure"
      - "traefik.http.routers.ai-server.tls.certresolver=cloudflare"
      - "traefik.http.services.ai-server.loadbalancer.server.port=3001"
```

- **무엇을 하는가**: ai-server 컨테이너를 Docker 네트워크에 등록하고 Traefik 라우팅 규칙 적용
- `PathPrefix(/ws-chat)`: 브라우저의 `wss://hexsera.com/ws-chat` 요청을 이 컨테이너로 라우팅
- `GEMINI_API_KEY`: `.env` 파일 또는 배포 환경 변수에서 주입 (소스코드에 키 노출 방지)

---

### 5. Traefik WebSocket 업그레이드 헤더 설정

```yaml
# traefik.yml 또는 docker-compose.yml의 ai-server labels에 추가
- "traefik.http.middlewares.ws-headers.headers.customrequestheaders.Connection=Upgrade"
- "traefik.http.middlewares.ws-headers.headers.customrequestheaders.Upgrade=websocket"
- "traefik.http.routers.ai-server.middlewares=ws-headers"
```

- **무엇을 하는가**: HTTP → WebSocket 프로토콜 업그레이드 요청이 Traefik을 통과하도록 헤더 설정
- WebSocket 연결 시 브라우저는 `Upgrade: websocket` 헤더를 보내며, 프록시가 이를 그대로 전달해야 연결 성공
- 미설정 시 Traefik이 업그레이드 헤더를 제거하여 WebSocket 연결 실패

---

### 6. React AI 채팅 페이지 생성

```jsx
// frontend/src/pages/AIChatPage/AIChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { v4 as uuidv4 } from 'uuid';
import ChatMessage from '../../components/ChatPanel/ChatMessage';
import ChatInput from '../../components/ChatPanel/ChatInput';

const WS_URL = import.meta.env.PROD
  ? 'wss://hexsera.com/ws-chat'
  : 'ws://localhost:3001';

export default function AIChatPage() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatIdRef = useRef(uuidv4());
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const { reply } = JSON.parse(event.data);
      setMessages(prev => [...prev, { role: 'ai', content: reply }]);
      setIsLoading(false);
    };
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading || !wsRef.current) return;
    const userMsg = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    wsRef.current.send(JSON.stringify({ chatId: chatIdRef.current, message: inputValue }));
    setInputValue('');
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
          <Typography sx={{ color: '#64748B', textAlign: 'center', mt: 4 }}>무엇이든 물어보세요</Typography>
        )}
        {messages.map((msg, i) => <ChatMessage key={i} role={msg.role} content={msg.content} />)}
        <div ref={bottomRef} />
      </Box>
      <ChatInput value={inputValue} onChange={e => setInputValue(e.target.value)} onSend={handleSend} disabled={!inputValue.trim() || isLoading} />
    </Box>
  );
}
```

- **무엇을 하는가**: WebSocket으로 ai-server와 통신하는 독립 AI 채팅 전용 페이지
- `useEffect`에서 컴포넌트 마운트 시 WebSocket 연결, 언마운트 시 자동 종료
- `chatIdRef`: 페이지 새로고침 전까지 동일 세션 ID 유지 (멀티턴 대화 보장)
- 개발 환경(`ws://localhost:3001`)과 프로덕션(`wss://hexsera.com/ws-chat`) URL 자동 분기

---

### 7. App.jsx 라우트 등록 및 index.js 생성

```js
// frontend/src/pages/AIChatPage/index.js
export { default } from './AIChatPage';
```

```jsx
// frontend/src/App.jsx에 추가
import AIChatPage from './pages/AIChatPage';
// Routes 안에 추가
<Route path="/chat" element={<AIChatPage />} />
```

- **무엇을 하는가**: `/chat` URL로 접근 시 AI 채팅 페이지가 렌더링되도록 라우터에 등록
- 기존 페이지 라우트 패턴(`import → Route 추가`)과 동일한 방식 사용

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `ai-server/package.json` | 생성 | Node.js 서버 패키지 정의 (`ws`, `@google/genai`) |
| `ai-server/src/index.js` | 생성 | WebSocket 서버 + Gemini LLM 통신 로직 |
| `ai-server/Dockerfile` | 생성 | Node.js 서버 Docker 이미지 빌드 설정 |
| `docker-compose.yml` | 수정 | `ai-server` 서비스 추가, Traefik 라우팅 레이블 추가 |
| `frontend/src/pages/AIChatPage/AIChatPage.jsx` | 생성 | WebSocket 기반 AI 채팅 페이지 |
| `frontend/src/pages/AIChatPage/index.js` | 생성 | re-export |
| `frontend/src/App.jsx` | 수정 | `/chat` 라우트 추가 |
| `.env` (루트 또는 ai-server/) | 수정 | `GEMINI_API_KEY` 환경변수 추가 |

---

## 완료 체크리스트

- [ ] `docker compose up -d ai-server` 실행 후 컨테이너가 `Up` 상태로 표시된다
- [ ] 브라우저에서 `/chat` 접근 시 AI 비서 채팅 화면이 표시된다
- [ ] 메시지 전송 시 AI 응답이 말풍선으로 표시된다
- [ ] 여러 번 대화 시 이전 대화 맥락이 유지된다 (멀티턴)
- [ ] 개발 환경에서 `ws://localhost:3001` WebSocket 연결이 성공한다
- [ ] 프로덕션에서 `wss://hexsera.com/ws-chat` WebSocket 연결이 성공한다
- [ ] 기존 핀볼 AI 채팅(`/pinball`)은 영향 없이 정상 동작한다
- [ ] `docker compose logs ai-server`에 에러 없이 요청 처리 로그가 출력된다
