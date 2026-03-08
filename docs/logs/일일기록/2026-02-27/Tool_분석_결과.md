# OpenClaw — LLM과 Tool 사용 흐름 분석

> 분석 대상: `/openclaw_git/src/agents/` 디렉토리 핵심 코드
> 목표: LLM에 Tool을 입력하고, LLM이 Tool을 사용하며, 결과를 다시 LLM에 넣는 전체 과정

---

## 1. 핵심 개념 먼저 이해하기

**Tool이란?**
AI가 스스로 할 수 없는 일(파일 읽기, 명령어 실행, 검색 등)을 대신 해주는 "기능 함수"입니다.
예: `exec` (명령어 실행), `read` (파일 읽기), `write` (파일 쓰기)

**흐름 한 줄 요약:**
사용자 메시지 → [Tool 목록과 함께] LLM에 전달 → LLM이 "이 Tool을 써줘"라고 응답 → openclaw가 Tool 실행 → 결과를 다시 LLM에 전달 → LLM이 최종 답변

---

## 2. 전체 흐름도 (ASCII)

```
사용자 메시지
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 1: Tool 생성                               │
│  createOpenClawCodingTools()                     │
│  → exec, read, write, apply-patch 등 Tool 배열  │
│  파일: src/agents/pi-tools.ts                    │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 2: Tool 변환 (AgentTool → ToolDefinition) │
│  splitSdkTools() → toToolDefinitions()           │
│  모든 Tool을 "실행 가능한 형태"로 포장           │
│  파일: src/agents/pi-embedded-runner/            │
│       tool-split.ts                              │
│       pi-tool-definition-adapter.ts              │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 3: Agent Session 생성                      │
│  createAgentSession({                            │
│    tools: builtInTools,                          │
│    customTools: allCustomTools, ← Tool이 여기!  │
│    sessionManager,                               │
│    model,                                        │
│  })                                              │
│  파일: src/agents/pi-embedded-runner/            │
│       run/attempt.ts (line 666~678)              │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 4: LLM API 호출                            │
│  activeSession.prompt(effectivePrompt)           │
│                                                  │
│  내부적으로 streamSimple()이 호출됨:             │
│  POST /v1/messages 에 다음 전달:                 │
│  {                                               │
│    model: "claude-sonnet-...",                   │
│    system: "시스템 프롬프트...",                 │
│    messages: [히스토리 메시지들],                │
│    tools: [Tool 정의 목록],  ← LLM에 전달       │
│    max_tokens: 4096                              │
│  }                                               │
│  파일: src/agents/pi-embedded-runner/            │
│       run/attempt.ts (line 1155~1158)            │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 5: LLM 응답 (Tool 사용 결정)               │
│                                                  │
│  LLM 응답 메시지 구조:                           │
│  {                                               │
│    role: "assistant",                            │
│    content: [                                    │
│      { type: "text", text: "실행할게요." },      │
│      {                                           │
│        type: "tool_use",   ← "이 Tool 써줘!"    │
│        id: "toolu_abc123",                       │
│        name: "exec",                             │
│        input: { command: "ls -la" }              │
│      }                                           │
│    ]                                             │
│  }                                               │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 6: Tool 실행 이벤트 감지                   │
│  subscribeEmbeddedPiSession() 이 이벤트 수신     │
│                                                  │
│  이벤트 종류:                                    │
│  tool_execution_start  → handleToolExecutionStart│
│  tool_execution_update → handleToolExecutionUpdate│
│  tool_execution_end    → handleToolExecutionEnd  │
│                                                  │
│  파일:                                           │
│  src/agents/pi-embedded-subscribe.ts             │
│  src/agents/pi-embedded-subscribe.handlers.ts    │
│  src/agents/pi-embedded-subscribe.handlers.tools.ts│
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 7: 실제 Tool 실행                          │
│  toToolDefinitions() 에서 포장된 execute() 호출  │
│                                                  │
│  순서:                                           │
│  1. before_tool_call hook 실행 (허용 여부 확인)  │
│  2. tool.execute(toolCallId, params, signal)     │
│  3. after_tool_call hook 실행 (사후 처리)        │
│  4. 결과 반환                                    │
│                                                  │
│  파일:                                           │
│  src/agents/pi-tool-definition-adapter.ts        │
│  (line 99~186)                                   │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 8: Tool 결과를 LLM에 다시 전달             │
│                                                  │
│  Tool Result 메시지 구조:                        │
│  {                                               │
│    role: "user",     ← user 역할로 전달!         │
│    content: [{                                   │
│      type: "tool_result",                        │
│      tool_use_id: "toolu_abc123",  ← 연결 ID    │
│      content: "total 48\ndrwxr-xr-x ..."        │
│    }]                                            │
│  }                                               │
│                                                  │
│  오류 시:                                        │
│  {                                               │
│    type: "tool_result",                          │
│    tool_use_id: "toolu_abc123",                  │
│    is_error: true,                               │
│    content: "Command failed: permission denied"  │
│  }                                               │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  STEP 9: 루프 반복 (자동)                        │
│  pi-agent-core 내부 에이전트가 자동으로           │
│  다시 LLM API 호출 → STEP 4로 돌아감            │
│                                                  │
│  루프 종료 조건:                                 │
│  - LLM이 stop_reason: "end_turn" 반환            │
│  - 응답에 tool_use 블록이 없을 때                │
│  - 최대 턴 수 초과                               │
└─────────────────────────────────────────────────┘
     │
     ▼
   최종 답변 반환
```

---

## 3. 핵심 파일 구조

```
src/agents/
│
├── pi-tools.ts                          ← Tool 목록 생성
├── pi-tools.types.ts                    ← Tool 타입 정의
├── pi-tool-definition-adapter.ts        ← Tool 실행 래퍼
├── tool-call-id.ts                      ← Tool ID 관리
│
├── pi-embedded-runner/
│   ├── run/
│   │   └── attempt.ts                   ← 핵심 실행 루프
│   └── tool-split.ts                    ← builtIn vs custom 분리
│
└── pi-embedded-subscribe.handlers.tools.ts ← Tool 이벤트 처리
```

---

## 4. 코드로 보는 핵심 흐름

### 4-1. Tool 타입 정의

**파일:** [pi-tools.types.ts](openclaw_git/src/agents/pi-tools.types.ts)

```typescript
// @mariozechner/pi-agent-core 라이브러리의 AgentTool 타입을 사용
import type { AgentTool } from "@mariozechner/pi-agent-core";

// "어떤 타입이든 들어올 수 있는 Tool"이라는 뜻
export type AnyAgentTool = AgentTool<any, unknown>;
```

> **초보자 설명:** `AgentTool`은 Tool의 설계도입니다. 이름, 설명, 파라미터, 실행 함수를 포함합니다.

---

### 4-2. Tool을 실행 가능하게 포장

**파일:** [pi-tool-definition-adapter.ts](openclaw_git/src/agents/pi-tool-definition-adapter.ts) (line 89~189)

```typescript
export function toToolDefinitions(tools: AnyAgentTool[]): ToolDefinition[] {
  return tools.map((tool) => {
    const name = tool.name || "tool";

    return {
      name,                          // Tool 이름 (예: "exec")
      label: tool.label ?? name,     // 사람이 읽을 수 있는 이름
      description: tool.description, // LLM에게 "이 Tool은 이런 거야" 설명
      parameters: tool.parameters,   // 입력값 스키마 (JSON Schema)

      // 실제 실행 함수
      execute: async (...args) => {
        const { toolCallId, params, signal } = splitToolExecuteArgs(args);

        // 1단계: 실행 전 허용 여부 확인 (hook)
        const hookOutcome = await runBeforeToolCallHook({
          toolName: name,
          params,
          toolCallId,
        });
        if (hookOutcome.blocked) {
          throw new Error(hookOutcome.reason); // 차단됨
        }

        // 2단계: 실제 Tool 실행
        const result = await tool.execute(toolCallId, params, signal, onUpdate);

        // 3단계: 실행 후 처리 (hook)
        await hookRunner.runAfterToolCall({ toolName: name, params, result });

        return result; // 결과 반환
      },
    };
  });
}
```

> **초보자 설명:** 각 Tool 주변에 "안전 장치(hook)"를 추가하는 포장지입니다.

---

### 4-3. Session 생성과 Tool 등록

**파일:** [run/attempt.ts](openclaw_git/src/agents/pi-embedded-runner/run/attempt.ts) (line 639~678)

```typescript
// Tool을 builtIn(SDK 내장)과 custom(우리 Tool)으로 분리
const { builtInTools, customTools } = splitSdkTools({
  tools,              // createOpenClawCodingTools()로 만든 Tool 배열
  sandboxEnabled: !!sandbox?.enabled,
});

// client Tool (외부에서 실행되는 Tool)도 추가
const allCustomTools = [...customTools, ...clientToolDefs];

// Agent Session 생성 - 여기서 Tool이 LLM과 연결됨
({ session } = await createAgentSession({
  cwd: resolvedWorkspace,
  model: params.model,           // 어떤 AI 모델 쓸지
  tools: builtInTools,           // SDK 내장 Tool
  customTools: allCustomTools,   // 우리가 만든 Tool ← 핵심!
  sessionManager,
  settingsManager,
}));
```

> **초보자 설명:** `createAgentSession`은 AI와의 대화 세션을 열면서, 사용할 수 있는 Tool 목록을 함께 등록합니다.

---

### 4-4. LLM API에 보내는 실제 데이터 구조

**파일:** [run/attempt.ts](openclaw_git/src/agents/pi-embedded-runner/run/attempt.ts) (line 1155~1158)

```typescript
// 이미지 없을 때
await activeSession.prompt(effectivePrompt);

// 이미지 있을 때
await activeSession.prompt(effectivePrompt, { images: imageResult.images });
```

내부적으로 `streamSimple()` 함수가 LLM API에 보내는 실제 JSON:

```json
{
  "model": "claude-sonnet-4-5",
  "system": "당신은 도움이 되는 AI 비서입니다...",
  "messages": [
    {
      "role": "user",
      "content": "현재 디렉토리의 파일 목록을 보여줘"
    }
  ],
  "tools": [
    {
      "name": "exec",
      "description": "셸 명령어를 실행합니다",
      "input_schema": {
        "type": "object",
        "properties": {
          "command": {
            "type": "string",
            "description": "실행할 명령어"
          }
        },
        "required": ["command"]
      }
    },
    {
      "name": "read",
      "description": "파일 내용을 읽습니다",
      "input_schema": { ... }
    }
  ],
  "max_tokens": 4096
}
```

> **초보자 설명:** LLM에게 "이런 Tool들을 쓸 수 있어"라고 알려주는 목록입니다.

> **이 스키마가 LLM에 들어가는 시점:** 대화 시작 시 및 **매 LLM 호출마다** 항상 포함됩니다. Tool 실행 성공/실패 여부와 무관하게, Tool 결과를 포함한 다음 LLM 호출에도 동일한 `tools` 목록이 다시 전달됩니다.

---

### 4-5. LLM이 Tool을 사용하겠다고 응답하는 구조

```json
{
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "현재 디렉토리 파일을 확인해볼게요."
    },
    {
      "type": "tool_use",
      "id": "toolu_01XYZ123456789",
      "name": "exec",
      "input": {
        "command": "ls -la"
      }
    }
  ],
  "stop_reason": "tool_use"
}
```

> **초보자 설명:** LLM이 "나는 `exec` Tool을 `ls -la` 명령어로 쓸거야. ID는 `toolu_01XYZ`야"라고 알려주는 것입니다.

> **이 스키마가 LLM에 들어가는 시점:** 이 응답 자체는 LLM이 **출력**한 것입니다. 그러나 Tool 실행 후 다음 번 LLM 호출 시, 이 `assistant` 메시지 전체가 `messages` 배열에 그대로 포함되어 LLM에 다시 전달됩니다. 즉 LLM은 "내가 이전에 이 Tool을 요청했었다"는 사실을 기억한 상태에서 결과를 받게 됩니다.

**코드에서 Tool call 감지:**

**파일:** [tool-call-id.ts](openclaw_git/src/agents/tool-call-id.ts) (line 44~68)

```typescript
// 지원하는 Tool call 타입들 (다양한 AI 제공자마다 이름이 다름)
const TOOL_CALL_TYPES = new Set(["toolCall", "toolUse", "functionCall"]);

export function extractToolCallsFromAssistant(msg) {
  const toolCalls = [];
  for (const block of msg.content) {
    // tool_use 타입 블록을 찾아서 ID와 이름 추출
    if (TOOL_CALL_TYPES.has(block.type)) {
      toolCalls.push({
        id: block.id,   // 나중에 결과와 매칭하는 데 사용
        name: block.name,
      });
    }
  }
  return toolCalls;
}
```

---

### 4-6. Tool 실행 이벤트 처리

**파일:** [pi-embedded-subscribe.handlers.tools.ts](openclaw_git/src/agents/pi-embedded-subscribe.handlers.tools.ts) (line 170~259)

```typescript
// Tool이 시작될 때 호출되는 함수
export async function handleToolExecutionStart(ctx, evt) {
  const toolName = evt.toolName;   // 예: "exec"
  const toolCallId = evt.toolCallId; // 예: "toolu_01XYZ"
  const args = evt.args;           // 예: { command: "ls -la" }

  // 시작 시간 기록 (나중에 실행 시간 계산에 사용)
  toolStartData.set(toolCallId, { startTime: Date.now(), args });

  // 이벤트 발행 (UI나 다른 컴포넌트에 알림)
  emitAgentEvent({
    runId: ctx.params.runId,
    stream: "tool",
    data: {
      phase: "start",      // 시작!
      name: toolName,
      toolCallId,
      args: args,
    },
  });
}
```

> **이 스키마가 LLM에 들어가는 시점:** 이벤트 처리 단계는 **openclaw 내부 처리**입니다. LLM에 직접 전달되지 않습니다. 이 이벤트들은 UI 업데이트, 로깅, 훅 실행 등 사이드 처리를 위한 것이며, 실제로 LLM에게 가는 것은 다음 4-7 단계의 `tool_result` 메시지입니다.

---

### 4-7. Tool 결과를 LLM에 다시 넣는 구조

Tool이 실행된 후, 그 결과는 `user` 역할의 메시지로 대화 기록에 추가됩니다:

**성공한 경우:**

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01XYZ123456789",
      "content": "total 48\ndrwxr-xr-x  8 user group 4096 Feb 27 10:00 .\ndrwxr-xr-x 15 user group 4096 Feb 26 09:00 .."
    }
  ]
}
```

**오류가 발생한 경우:**

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01XYZ123456789",
      "is_error": true,
      "content": "Command failed: bash: ls: command not found"
    }
  ]
}
```

> **초보자 설명:** `tool_use_id`가 LLM이 요청한 ID와 같아야 합니다. 이것으로 "어떤 Tool 요청의 결과인지" 연결합니다.

> **이 스키마가 LLM에 들어가는 시점:** Tool 실행이 끝난 직후, **다음 LLM 호출 시 반드시 포함**됩니다. 성공(`is_error` 없음)이든 실패(`is_error: true`)든 **형태는 동일**하며, 항상 이 `tool_result` 구조로 LLM에 전달됩니다. LLM은 `is_error: true`를 보고 "Tool이 실패했다"는 사실을 인식하여 재시도하거나 다른 방법을 선택합니다.
>
> **중요:** Anthropic API 규칙상 `tool_use` 블록이 포함된 `assistant` 메시지 바로 다음에는 반드시 대응하는 `tool_result`가 있는 `user` 메시지가 와야 합니다. 하나라도 빠지면 API 오류가 발생합니다.

---

## 5. AI 제공자별 메시지 형식 차이

openclaw는 여러 AI를 지원하기 때문에 Tool 관련 메시지 형식이 다릅니다:

| AI 제공자 | Tool 요청 타입 | Tool ID 특징 |
|-----------|---------------|-------------|
| Anthropic (Claude) | `tool_use` | 자유 형식 |
| Google (Gemini) | `functionCall` | 자유 형식 |
| OpenAI (GPT) | `function_call` | 자유 형식 |
| Mistral | `toolCall` | **9자 영숫자 필수** |

이 차이를 처리하는 코드:

**파일:** [tool-call-id.ts](openclaw_git/src/agents/tool-call-id.ts) (line 4~7)

```typescript
// 다양한 제공자의 Tool call 타입 이름을 모두 인식
const TOOL_CALL_TYPES = new Set(["toolCall", "toolUse", "functionCall"]);

// Mistral은 Tool ID가 9자 영숫자여야 함
export type ToolCallIdMode = "strict" | "strict9";
```

---

## 6. Hook 시스템 (확장 지점)

Tool 실행 전후에 플러그인이 개입할 수 있습니다:

```
Tool 실행 요청
     │
     ▼
[before_tool_call hook]  ← 플러그인이 차단하거나 파라미터 수정 가능
     │
     ▼
실제 Tool 실행
     │
     ▼
[after_tool_call hook]   ← 플러그인이 결과를 기록하거나 추가 처리
     │
     ▼
결과 반환
```

**파일:** [pi-tool-definition-adapter.ts](openclaw_git/src/agents/pi-tool-definition-adapter.ts) (line 103~136)

```typescript
// before_tool_call: 실행 전에 허용 여부 확인
const hookOutcome = await runBeforeToolCallHook({
  toolName: name,
  params,
  toolCallId,
});
if (hookOutcome.blocked) {
  throw new Error(hookOutcome.reason);  // 플러그인이 차단함
}

// after_tool_call: 실행 후 처리
await hookRunner.runAfterToolCall({
  toolName: name,
  params,
  result,
});
```

---

## 7. 전체 메시지 기록 예시

하나의 대화에서 실제로 쌓이는 메시지 배열:

```json
[
  // 1. 사용자 질문
  {
    "role": "user",
    "content": "현재 디렉토리 파일 목록 보여줘"
  },

  // 2. LLM이 Tool을 쓰겠다고 결정
  {
    "role": "assistant",
    "content": [
      { "type": "text", "text": "파일 목록을 확인해볼게요." },
      {
        "type": "tool_use",
        "id": "toolu_01ABC",
        "name": "exec",
        "input": { "command": "ls -la" }
      }
    ]
  },

  // 3. Tool 실행 결과 (user 역할로 전달)
  {
    "role": "user",
    "content": [{
      "type": "tool_result",
      "tool_use_id": "toolu_01ABC",
      "content": "total 48\n-rw-r--r-- 1 user group 1234 Feb 27 10:00 README.md"
    }]
  },

  // 4. LLM 최종 답변
  {
    "role": "assistant",
    "content": "현재 디렉토리에는 README.md 파일이 있습니다."
  }
]
```

---

## 8. 핵심 파일 위치 요약

| 역할 | 파일 경로 |
|------|---------|
| Tool 목록 생성 | [src/agents/pi-tools.ts](openclaw_git/src/agents/pi-tools.ts) |
| Tool 타입 정의 | [src/agents/pi-tools.types.ts](openclaw_git/src/agents/pi-tools.types.ts) |
| Tool 실행 래퍼 | [src/agents/pi-tool-definition-adapter.ts](openclaw_git/src/agents/pi-tool-definition-adapter.ts) |
| Tool ID 관리 | [src/agents/tool-call-id.ts](openclaw_git/src/agents/tool-call-id.ts) |
| 메인 실행 루프 | [src/agents/pi-embedded-runner/run/attempt.ts](openclaw_git/src/agents/pi-embedded-runner/run/attempt.ts) |
| Tool 이벤트 구독 | [src/agents/pi-embedded-subscribe.ts](openclaw_git/src/agents/pi-embedded-subscribe.ts) |
| Tool 이벤트 처리 | [src/agents/pi-embedded-subscribe.handlers.tools.ts](openclaw_git/src/agents/pi-embedded-subscribe.handlers.tools.ts) |
| Tool/builtIn 분리 | [src/agents/pi-embedded-runner/tool-split.ts](openclaw_git/src/agents/pi-embedded-runner/tool-split.ts) |

---

## 9. 한 눈에 보는 요약

```
[사용자] "파일 목록 보여줘"
   ↓
[openclaw] Tool 목록과 함께 LLM에 전달
   → "exec, read, write 등 Tool을 쓸 수 있어"
   ↓
[LLM] "exec Tool로 ls -la 실행해줘" (tool_use 응답)
   ↓
[openclaw] exec Tool 실제 실행 → "ls -la" 명령어 실행
   ↓
[openclaw] 결과를 tool_result로 LLM에 다시 전달
   → "실행 결과: README.md, src/, docs/ ..."
   ↓
[LLM] "파일 목록입니다: README.md, src, docs"
   ↓
[사용자] 최종 답변 수신
```

---

## 10. Tool 정의 — 어디에 있고 어떻게 생겼나

### 10-1. Tool 하나의 해부학

모든 Tool은 `AgentTool` 타입을 따릅니다. 구조는 아래 4가지 필드로 이루어집니다:

```
┌──────────────────────────────────────────┐
│  AgentTool (Tool 한 개의 설계도)          │
│                                          │
│  name        → "exec"                   │
│               LLM이 호출할 때 쓰는 이름  │
│                                          │
│  description → "Execute shell commands…" │
│               LLM에게 "이 Tool은 뭐야"   │
│               를 설명하는 자연어 문장    │
│                                          │
│  parameters  → JSON Schema 객체          │
│               LLM이 넣어야 할 입력값     │
│               형식 정의                  │
│                                          │
│  execute()   → async 함수               │
│               실제로 일을 처리하는 코드  │
└──────────────────────────────────────────┘
```

**파일:** [pi-tools.types.ts](openclaw_git/src/agents/pi-tools.types.ts)

```typescript
// @mariozechner/pi-agent-core 라이브러리가 제공하는 기본 타입
import type { AgentTool } from "@mariozechner/pi-agent-core";

// openclaw 전체에서 쓰는 Tool 타입 별칭
// <any, unknown> = 입력/출력 타입을 느슨하게 허용
export type AnyAgentTool = AgentTool<any, unknown>;
```

---

### 10-2. exec Tool 정의 — 실제 코드

가장 핵심적인 Tool인 `exec` (셸 명령어 실행)의 실제 정의입니다.

**파일:** [bash-tools.exec.ts](openclaw_git/src/agents/bash-tools.exec.ts) (line 199~220)

```typescript
return {
  name: "exec",            // ← LLM이 이 이름으로 호출
  label: "exec",           // ← 사람이 읽는 표시명
  description:             // ← LLM에게 전달되는 설명 (중요!)
    "Execute shell commands with background continuation. " +
    "Use yieldMs/background to continue later via process tool. " +
    "Use pty=true for TTY-required commands (terminal UIs, coding agents).",

  parameters: execSchema,  // ← 입력 파라미터 스키마 (아래 참고)

  execute: async (_toolCallId, args, signal, onUpdate) => {
    // 실제 명령어 실행 로직
    const params = args as {
      command: string;    // 실행할 명령어
      workdir?: string;   // 작업 디렉토리
      env?: Record<string, string>; // 환경변수
      yieldMs?: number;   // 백그라운드 전환 대기 시간
      background?: boolean; // 즉시 백그라운드 실행
      timeout?: number;   // 타임아웃 (초)
      pty?: boolean;      // TTY 모드 여부
      elevated?: boolean; // 권한 상승 실행
    };
    // ... 실행 로직
  },
};
```

**파라미터 스키마 정의:**

**파일:** [bash-tools.exec-runtime.ts](openclaw_git/src/agents/bash-tools.exec-runtime.ts) (line 75~100)

```typescript
// @sinclair/typebox 라이브러리로 JSON Schema를 TypeScript 코드로 작성
export const execSchema = Type.Object({
  command: Type.String({
    description: "Shell command to execute"  // ← LLM에게 보이는 설명
  }),
  workdir: Type.Optional(Type.String({
    description: "Working directory (defaults to cwd)"
  })),
  env: Type.Optional(Type.Record(Type.String(), Type.String())),
  yieldMs: Type.Optional(Type.Number({
    description: "Milliseconds to wait before backgrounding (default 10000)"
  })),
  background: Type.Optional(Type.Boolean({
    description: "Run in background immediately"
  })),
  timeout: Type.Optional(Type.Number({
    description: "Timeout in seconds (optional, kills process on expiry)"
  })),
  pty: Type.Optional(Type.Boolean({
    description: "Run in a pseudo-terminal (PTY) when available"
  })),
  elevated: Type.Optional(Type.Boolean({
    description: "Run on the host with elevated permissions (if allowed)"
  })),
});
```

> **초보자 설명:** `execSchema`가 LLM에게 "exec Tool을 쓸 때 `command`는 필수이고, `workdir`는 선택이야"라고 알려주는 설계도입니다.

---

### 10-3. Tool 정의 파일 위치 지도

```
src/agents/
│
├── bash-tools.exec-runtime.ts   ← exec Tool의 파라미터 스키마(execSchema)
├── bash-tools.exec.ts           ← exec Tool 객체 생성 (createExecTool)
├── bash-tools.process.ts        ← process Tool (백그라운드 프로세스 관리)
├── apply-patch.ts               ← apply_patch Tool
│
└── tools/                       ← openclaw 전용 Tool들
    ├── message-tool.ts          ← message Tool (메시지 전송)
    ├── memory-tool.ts           ← memory_search, memory_get Tool
    ├── web-fetch.ts             ← web_fetch Tool (URL 내용 읽기)
    ├── web-search.ts            ← web_search Tool (웹 검색)
    ├── browser-tool.ts          ← browser Tool (브라우저 제어)
    ├── cron-tool.ts             ← cron Tool (스케줄 작업)
    ├── sessions-spawn-tool.ts   ← sessions_spawn Tool (서브에이전트 생성)
    ├── image-tool.ts            ← image Tool (이미지 분석)
    ├── canvas-tool.ts           ← canvas Tool
    ├── nodes-tool.ts            ← nodes Tool (페어링된 기기 제어)
    └── gateway-tool.ts          ← gateway Tool (OpenClaw 재시작 등)
```

외부 라이브러리 Tool (`@mariozechner/pi-coding-agent`):
```
read    → 파일 읽기
write   → 파일 쓰기
edit    → 파일 일부 수정
grep    → 파일 내용 검색
find    → 파일 경로 검색
ls      → 디렉토리 목록
```

---

### 10-4. Tool을 LLM에게 알려주는 두 가지 경로

Tool은 LLM에게 **두 가지 방식**으로 전달됩니다.

```
┌────────────────────────────────────────────────────────────────┐
│  경로 1: API의 tools 파라미터 (JSON Schema)                     │
│  → LLM이 실제로 Tool을 호출할 때 사용하는 구조 정보             │
│                                                                │
│  경로 2: System Prompt의 ## Tooling 섹션 (자연어)              │
│  → LLM이 어떤 Tool이 있는지 "읽고 이해"하는 설명               │
└────────────────────────────────────────────────────────────────┘
```

---

### 10-5. 경로 1 — API tools 파라미터 (JSON Schema)

`toToolDefinitions()`가 `AgentTool`을 LLM API 규격의 `ToolDefinition`으로 변환합니다.

**파일:** [pi-tool-definition-adapter.ts](openclaw_git/src/agents/pi-tool-definition-adapter.ts) (line 89~98)

```typescript
export function toToolDefinitions(tools: AnyAgentTool[]): ToolDefinition[] {
  return tools.map((tool) => {
    return {
      name: tool.name,              // "exec"
      label: tool.label ?? name,    // "exec"
      description: tool.description, // "Execute shell commands..."
      parameters: tool.parameters,   // execSchema → JSON Schema 변환됨
      execute: async (...args) => { /* 실행 래퍼 */ },
    };
  });
}
```

이것이 LLM API로 전송될 때 실제 JSON 모습:

```json
{
  "tools": [
    {
      "name": "exec",
      "description": "Execute shell commands with background continuation...",
      "input_schema": {
        "type": "object",
        "properties": {
          "command": {
            "type": "string",
            "description": "Shell command to execute"
          },
          "workdir": {
            "type": "string",
            "description": "Working directory (defaults to cwd)"
          },
          "timeout": {
            "type": "number",
            "description": "Timeout in seconds"
          },
          "pty": {
            "type": "boolean",
            "description": "Run in a pseudo-terminal (PTY) when available"
          }
        },
        "required": ["command"]
      }
    },
    {
      "name": "read",
      "description": "Read file contents",
      "input_schema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" }
        },
        "required": ["path"]
      }
    }
  ]
}
```

---

### 10-6. 경로 2 — System Prompt의 ## Tooling 섹션 (자연어)

API의 JSON Schema 외에도, **System Prompt 안**에 사람이 읽을 수 있는 Tool 목록을 별도로 넣어줍니다. 이 덕분에 LLM이 어떤 Tool을 언제 써야 하는지 더 잘 이해합니다.

**파일:** [system-prompt.ts](openclaw_git/src/agents/system-prompt.ts) (line 241~334)

```typescript
// 각 Tool에 대한 짧은 설명 딕셔너리
const coreToolSummaries: Record<string, string> = {
  read:             "Read file contents",
  write:            "Create or overwrite files",
  edit:             "Make precise edits to files",
  exec:             "Run shell commands (pty available for TTY-required CLIs)",
  process:          "Manage background exec sessions",
  web_search:       "Search the web (Brave API)",
  web_fetch:        "Fetch and extract readable content from a URL",
  browser:          "Control web browser",
  memory_search:    "Search the memory system",
  cron:             "Manage cron jobs and wake events",
  message:          "Send messages and channel actions",
  sessions_spawn:   "Spawn a sub-agent session",
  // ... 기타 Tool들
};

// 활성화된 Tool만 골라 System Prompt에 삽입
const toolLines = enabledTools.map((tool) => {
  const summary = coreToolSummaries[tool];
  return summary ? `- ${tool}: ${summary}` : `- ${tool}`;
});
```

실제로 LLM에게 전달되는 System Prompt 내 `## Tooling` 섹션:

```
You are a personal assistant running inside OpenClaw.

## Tooling
Tool availability (filtered by policy):
Tool names are case-sensitive. Call tools exactly as listed.
- read: Read file contents
- write: Create or overwrite files
- edit: Make precise edits to files
- exec: Run shell commands (pty available for TTY-required CLIs)
- process: Manage background exec sessions
- web_search: Search the web (Brave API)
- web_fetch: Fetch and extract readable content from a URL
- browser: Control web browser
- cron: Manage cron jobs and wake events
- message: Send messages and channel actions
- sessions_spawn: Spawn a sub-agent session
- session_status: Show usage/time/model state

## Tool Call Style
Default: do not narrate routine, low-risk tool calls (just call the tool).
...
```

**이 System Prompt를 만드는 함수:**

**파일:** [pi-embedded-runner/system-prompt.ts](openclaw_git/src/agents/pi-embedded-runner/system-prompt.ts) (line 11~82)

```typescript
export function buildEmbeddedSystemPrompt(params: {
  tools: AgentTool[],  // ← Tool 배열을 받아서
  // ...
}): string {
  return buildAgentSystemPrompt({
    // ...
    toolNames: params.tools.map((tool) => tool.name), // Tool 이름 목록 추출
    toolSummaries: buildToolSummaryMap(params.tools),  // Tool 설명 맵 생성
    // ...
  });
}
```

**파일:** [tool-summaries.ts](openclaw_git/src/agents/tool-summaries.ts)

```typescript
// Tool 배열 → { "exec": "Execute shell...", "read": "Read file..." } 맵 생성
export function buildToolSummaryMap(tools: AgentTool[]): Record<string, string> {
  const summaries: Record<string, string> = {};
  for (const tool of tools) {
    const summary = tool.description?.trim() || tool.label?.trim();
    if (!summary) continue;
    summaries[tool.name.toLowerCase()] = summary;
  }
  return summaries;
}
```

---

### 10-7. Tool이 LLM에 전달되는 전체 경로 흐름도

```
Tool 정의 파일들
(bash-tools.exec.ts, tools/message-tool.ts 등)
           │
           │  AgentTool { name, description, parameters, execute }
           ▼
createOpenClawCodingTools()          ← pi-tools.ts
 - 환경에 맞게 Tool 조합
 - 정책(policy) 필터링
 - hook 래핑
 - JSON Schema 정규화
           │
           │  AnyAgentTool[]
           ▼
splitSdkTools()                      ← tool-split.ts
 - builtInTools: [] (항상 비어있음)
 - customTools: toToolDefinitions() 결과
           │
           ├──────────────────────────────────────────────────────┐
           │                                                      │
           ▼  (경로 1: API tools 파라미터)                         ▼  (경로 2: System Prompt)
createAgentSession({                            buildEmbeddedSystemPrompt({
  customTools: [ToolDefinition...]                tools: [AgentTool...]
})                                              })
  │                                               │
  │  내부적으로 pi-agent-core가                   │  toolNames, toolSummaries 추출
  │  API 호출 시 tools 파라미터로 직렬화           │
  │                                               │  "## Tooling\n- exec: ...\n- read: ..."
  ▼                                               ▼
POST /v1/messages                           session.agent.setSystemPrompt(prompt)
{                                                  │
  "tools": [                                       │
    {                                              │
      "name": "exec",                              │
      "description": "Execute...",                 │
      "input_schema": { ... }                      │
    }                                     LLM이 system prompt에서
  ],                                      Tool 목록을 "읽고 이해"
  "system": "You are... ## Tooling ...", ◄──────────────────────
  "messages": [...]
}
         │
         ▼
    LLM이 어떤 Tool을 언제 써야 하는지 파악
    → tool_use 응답으로 Tool 호출
```

---

### 10-8. message Tool 정의 예시 (openclaw 전용 Tool)

외부 라이브러리 Tool이 아닌, openclaw가 자체 정의한 Tool도 같은 구조입니다.

**파일:** [tools/message-tool.ts](openclaw_git/src/agents/tools/message-tool.ts) (TypeBox Schema 사용)

```typescript
import { Type } from "@sinclair/typebox";

// 파라미터 스키마를 TypeBox로 정의
function buildRoutingSchema() {
  return {
    channel: Type.Optional(Type.String()),      // 어떤 채널로 보낼지
    target: Type.Optional(channelTargetSchema({ // 누구에게 보낼지
      description: "Target channel/user id or name."
    })),
    dryRun: Type.Optional(Type.Boolean()),       // 테스트 실행 여부
  };
}
```

Tool 객체 형태 (개념적 표현):
```typescript
{
  name: "message",
  description: "Send messages and perform channel actions (send, react, edit...)",
  parameters: Type.Object({
    action: Type.String({ description: "Action to perform: send, react, edit, etc." }),
    message: Type.Optional(Type.String({ description: "Message content to send" })),
    channel: Type.Optional(Type.String()),
    target: Type.Optional(Type.String()),
    // ...
  }),
  execute: async (toolCallId, args, signal) => {
    // 실제 메시지 전송 로직
    const result = await runMessageAction(...);
    return jsonResult(result);
  }
}
```

---

### 10-9. Tool 정의 요약표

| Tool 이름 | 정의 파일 | 출처 |
|-----------|---------|------|
| `exec` | [bash-tools.exec.ts](openclaw_git/src/agents/bash-tools.exec.ts) | openclaw |
| `process` | [bash-tools.process.ts](openclaw_git/src/agents/bash-tools.process.ts) | openclaw |
| `read` | `@mariozechner/pi-coding-agent` | 외부 라이브러리 |
| `write` | `@mariozechner/pi-coding-agent` | 외부 라이브러리 |
| `edit` | `@mariozechner/pi-coding-agent` | 외부 라이브러리 |
| `grep` | `@mariozechner/pi-coding-agent` | 외부 라이브러리 |
| `find` | `@mariozechner/pi-coding-agent` | 외부 라이브러리 |
| `ls` | `@mariozechner/pi-coding-agent` | 외부 라이브러리 |
| `message` | [tools/message-tool.ts](openclaw_git/src/agents/tools/message-tool.ts) | openclaw |
| `web_fetch` | [tools/web-fetch.ts](openclaw_git/src/agents/tools/web-fetch.ts) | openclaw |
| `web_search` | [tools/web-search.ts](openclaw_git/src/agents/tools/web-search.ts) | openclaw |
| `browser` | [tools/browser-tool.ts](openclaw_git/src/agents/tools/browser-tool.ts) | openclaw |
| `cron` | [tools/cron-tool.ts](openclaw_git/src/agents/tools/cron-tool.ts) | openclaw |
| `memory_search` | [tools/memory-tool.ts](openclaw_git/src/agents/tools/memory-tool.ts) | openclaw |
| `sessions_spawn` | [tools/sessions-spawn-tool.ts](openclaw_git/src/agents/tools/sessions-spawn-tool.ts) | openclaw |
| `image` | [tools/image-tool.ts](openclaw_git/src/agents/tools/image-tool.ts) | openclaw |
| `canvas` | [tools/canvas-tool.ts](openclaw_git/src/agents/tools/canvas-tool.ts) | openclaw |
| `nodes` | [tools/nodes-tool.ts](openclaw_git/src/agents/tools/nodes-tool.ts) | openclaw |
| `gateway` | [tools/gateway-tool.ts](openclaw_git/src/agents/tools/gateway-tool.ts) | openclaw |

---

*분석 완료: 2026-02-27*
