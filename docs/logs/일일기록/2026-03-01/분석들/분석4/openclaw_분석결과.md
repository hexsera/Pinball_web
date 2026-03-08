# OpenClaw 대화창 & LLM 연결 분석

> 목표: OpenClaw의 기초적인 대화창과 LLM 연결 구조를 이해하고, 나만의 프로젝트로 따라 만들기 위한 분석

---

## 전체 흐름도 (ASCII)

```
사용자 입력
    │
    ▼
┌─────────────────────────────────────┐
│          openclaw.mjs               │  ← 실행 파일 (Node.js 진입점)
│  dist/entry.js 를 불러와서 실행      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         src/cli/program.ts          │  ← CLI 명령어 등록
│  (Commander.js 라이브러리 사용)      │
│                                     │
│  - openclaw tui    → TUI 대화창     │
│  - openclaw agent  → 에이전트 실행  │
│  - openclaw gateway→ 서버 시작      │
└──────────────┬──────────────────────┘
               │  "tui" 명령어 입력시
               ▼
┌─────────────────────────────────────┐
│       src/cli/tui-cli.ts            │  ← TUI 명령어 파서
│  --url, --token, --session 옵션 처리│
│  runTui() 함수 호출                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         src/tui/tui.ts              │  ← 터미널 대화창 핵심
│  @mariozechner/pi-tui 라이브러리    │
│                                     │
│  구성요소:                          │
│  ┌────────────┐ ┌─────────────────┐ │
│  │ ChatLog    │ │ CustomEditor    │ │
│  │(채팅 기록) │ │(입력창)         │ │
│  └────────────┘ └─────────────────┘ │
│                                     │
│  GatewayChatClient 연결             │
└──────────────┬──────────────────────┘
               │ WebSocket 연결
               ▼
┌─────────────────────────────────────┐
│    src/tui/gateway-chat.ts          │  ← 게이트웨이 통신 클라이언트
│    GatewayChatClient 클래스         │
│                                     │
│  sendChat(message) ──────────────┐  │
│  loadHistory()                   │  │
│  abortChat()                     │  │
└──────────────────────────────────┼──┘
                                   │ WebSocket (ws://)
                                   ▼
┌─────────────────────────────────────┐
│       src/gateway/ (서버)           │  ← 게이트웨이 서버
│                                     │
│  포트: 18789 (WebSocket)            │
│  포트: 18790 (HTTP)                 │
│                                     │
│  chat.send 요청 수신                │
│  세션 관리                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    src/agents/ (에이전트 레이어)    │  ← LLM 연결 핵심
│                                     │
│  pi-embedded-runner/run.ts          │
│    └── runEmbeddedPiAgent()         │
│         ├── 모델 선택               │
│         ├── API 키 확인             │
│         ├── 시스템 프롬프트 생성    │
│         └── LLM API 호출           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  @mariozechner/pi-agent             │  ← LLM SDK (핵심 라이브러리)
│  @mariozechner/pi-ai                │
│                                     │
│  streamSimple() ← AI 스트리밍 함수  │
│                                     │
│  지원 제공자:                        │
│  - Anthropic (Claude)               │
│  - OpenAI (GPT)                     │
│  - Google (Gemini)                  │
│  - Ollama (로컬 모델)               │
│  - AWS Bedrock                      │
│  - OpenRouter (여러 모델 통합)      │
└──────────────┬──────────────────────┘
               │ AI 응답 (스트리밍)
               ▼
┌─────────────────────────────────────┐
│  pi-embedded-subscribe.ts           │  ← 응답 스트림 처리
│                                     │
│  subscribeEmbeddedPiSession()       │
│  - 텍스트 조각(chunk) 수집          │
│  - thinking 태그 필터링             │
│  - 완성된 메시지 조립               │
└──────────────┬──────────────────────┘
               │ 완성된 응답
               ▼
         사용자 화면 출력
```

---

## 핵심 파일 설명

### 1단계: 실행 시작

**파일: `openclaw.mjs`** (루트 디렉토리)

```javascript
// 빌드된 파일(dist/entry.js)을 불러와서 실행하는 부트스트랩
await import("./dist/entry.js")
```
- 사용자가 `openclaw` 명령어를 치면 이 파일이 먼저 실행됩니다
- 빌드된 결과물을 불러오는 단순한 "시작점"입니다

---

### 2단계: 명령어 처리

**파일: `src/cli/tui-cli.ts`**

```typescript
// "openclaw tui" 명령어를 등록하고 처리
program.command("tui")
  .option("--url <url>", "게이트웨이 WebSocket 주소")
  .option("--session <key>", "세션 키")
  .action(async (opts) => {
    await runTui({ url, session, ... })  // 대화창 실행
  })
```
- Commander.js 라이브러리로 터미널 명령어를 만드는 파일입니다
- `--url`, `--session` 같은 옵션을 처리합니다

---

### 3단계: 터미널 대화창 (TUI)

**파일: `src/tui/tui.ts`**

```typescript
// 대화창의 핵심 - 입력창과 채팅 기록을 화면에 그림
import { TUI, Container, Text } from "@mariozechner/pi-tui"

export async function runTui(opts: TuiOptions) {
  const config = loadConfig()         // 설정 파일 로드
  const chat = new GatewayChatClient() // 게이트웨이 연결

  // 입력 처리: 사용자가 엔터 누르면
  function handleSubmit(text: string) {
    if (text.startsWith("/")) {
      handleCommand(text)  // /help, /model 같은 명령어
    } else {
      sendMessage(text)    // 일반 메시지 전송
    }
  }
}
```
- `@mariozechner/pi-tui` 라이브러리로 터미널 UI를 그립니다
- 채팅 기록(ChatLog)과 입력창(CustomEditor)으로 구성됩니다
- `/명령어`와 일반 메시지를 구분해서 처리합니다

---

### 4단계: 게이트웨이 연결

**파일: `src/tui/gateway-chat.ts`**

```typescript
// WebSocket으로 게이트웨이 서버와 통신하는 클라이언트
export class GatewayChatClient {

  // 메시지 전송
  async sendChat(opts: ChatSendOptions) {
    await this.client.request("chat.send", {
      sessionKey: opts.sessionKey,  // 어느 대화인지
      message: opts.message,        // 보낼 메시지
    })
  }

  // 대화 기록 불러오기
  async loadHistory(opts: { sessionKey: string }) {
    return await this.client.request("chat.history", { ... })
  }
}
```
- WebSocket(실시간 양방향 통신)으로 게이트웨이 서버에 연결합니다
- `chat.send` 요청으로 메시지를 보내고, 이벤트로 응답을 받습니다

---

### 5단계: LLM 호출 (가장 중요!)

**파일: `src/agents/pi-embedded-runner/run/attempt.ts`**

```typescript
// LLM API를 실제로 호출하는 핵심 함수
import { streamSimple } from "@mariozechner/pi-ai"
import { createAgentSession, SessionManager } from "@mariozechner/pi-coding-agent"

export async function runEmbeddedAttempt(params) {
  // 1. 세션 준비 (대화 기록 불러오기)
  const sessionManager = new SessionManager(...)

  // 2. 시스템 프롬프트 생성
  const systemPrompt = buildEmbeddedSystemPrompt(...)

  // 3. LLM API 호출 (스트리밍)
  const agentSession = createAgentSession({
    model: "claude-3-5-sonnet",  // 사용할 모델
    apiKey: "sk-...",            // API 키
    systemPrompt: "...",         // 시스템 프롬프트
  })

  // 4. 응답 스트리밍 처리
  subscribeEmbeddedPiSession({
    onText: (text) => { /* 텍스트 조각 수신 */ },
    onEnd: (result) => { /* 완료 */ },
  })
}
```

---

### 6단계: 응답 스트림 처리

**파일: `src/agents/pi-embedded-subscribe.ts`**

```typescript
// AI의 응답을 조각조각 받아서 완성된 메시지로 조립
export function subscribeEmbeddedPiSession(params) {
  // AI가 텍스트를 조금씩 보낼 때마다 처리
  // <thinking>태그(AI의 사고과정)는 걸러냄
  // 완성되면 onEnd 콜백 호출
}
```
- AI는 한번에 답을 보내지 않고 조금씩(스트리밍) 보냅니다
- 이 파일이 그 조각들을 모아서 완성된 답변을 만듭니다

---

## 모델 설정 구조

**파일: `src/agents/models-config.ts`**

```typescript
// AI 모델 제공자 설정
{
  "models": {
    "mode": "merge",         // 기본값과 합침
    "providers": {
      "anthropic": {
        "apiKey": "sk-ant-...",
        "models": ["claude-3-5-sonnet"]
      },
      "openai": {
        "apiKey": "sk-...",
        "models": ["gpt-4o"]
      },
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "models": ["llama3"]
      }
    }
  }
}
```

---

## 내가 따라 만들 때 필요한 최소 구성

```
내 프로젝트/
├── index.ts          ← 진입점 (Commander로 명령어 등록)
├── tui.ts            ← 터미널 대화창 (입력창 + 채팅 기록)
├── llm-client.ts     ← LLM API 연결 (Anthropic/OpenAI SDK 직접 사용)
└── config.ts         ← 설정 (API 키, 모델 이름)
```

### 핵심 의존성 라이브러리

| 라이브러리 | 역할 | 대체 방법 |
|-----------|------|----------|
| `@mariozechner/pi-tui` | 터미널 UI | `blessed`, `ink` (React 기반) |
| `@mariozechner/pi-agent` | LLM 에이전트 | Anthropic SDK 직접 사용 |
| `commander` | CLI 명령어 | `yargs`, `meow` |

### 가장 단순한 흐름 (내 프로젝트 기준)

```
1. 사용자가 터미널에 텍스트 입력
        ↓
2. Anthropic API 호출
   fetch("https://api.anthropic.com/v1/messages", {
     model: "claude-3-5-sonnet",
     messages: [{ role: "user", content: "안녕!" }]
   })
        ↓
3. 스트리밍 응답 받기
   for await (const chunk of stream) {
     process.stdout.write(chunk.text)
   }
        ↓
4. 터미널에 출력
```

---

## OpenClaw가 복잡한 이유

OpenClaw는 단순 대화 앱이 아니라 "AI 비서 플랫폼"이기 때문에:

```
텔레그램 ──┐
디스코드 ──┤
슬랙     ──┼──→ Gateway 서버 ──→ AI 에이전트
카카오   ──┤
웹       ──┘
```

- 여러 메신저에서 동일한 AI와 대화할 수 있게 설계됨
- `gateway` 서버가 중간에서 모든 채널을 통합 관리
- TUI는 그 중 하나의 클라이언트일 뿐

따라 만들 때는 **게이트웨이 없이** 직접 LLM API를 호출하는 방식으로 단순화하면 됩니다.

---

## 참고: 주요 파일 경로 요약

| 역할 | 파일 경로 |
|------|-----------|
| 실행 진입점 | `openclaw.mjs` |
| CLI 명령어 등록 | `src/cli/tui-cli.ts` |
| 터미널 대화창 메인 | `src/tui/tui.ts` |
| 게이트웨이 WebSocket 클라이언트 | `src/tui/gateway-chat.ts` |
| LLM 실행 핵심 | `src/agents/pi-embedded-runner/run/attempt.ts` |
| 응답 스트림 처리 | `src/agents/pi-embedded-subscribe.ts` |
| 모델 설정 | `src/agents/models-config.ts` |
| 게이트웨이 서버 시작 | `src/gateway/boot.ts` |
