# Gemini API — Python에서 Tool 사용하기

> Tool_분석_결과.md의 섹션 4-4 (LLM API 호출), 4-5 (LLM 응답 구조)를
> Gemini API + Python 코드로 직접 구현한 핵심 예시

---

## 1. Tool 정의하기

Tool은 LLM에게 "이런 함수를 쓸 수 있어"라고 알려주는 JSON Schema입니다.

```python
from google import genai
from google.genai import types

# Tool 정의 — LLM이 읽는 설계도
exec_tool_declaration = {
    "name": "exec",
    "description": "셸 명령어를 실행합니다.",
    "parameters": {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "실행할 셸 명령어"
            },
            "workdir": {
                "type": "string",
                "description": "작업 디렉토리 (생략 시 현재 디렉토리)"
            },
            "timeout": {
                "type": "integer",
                "description": "타임아웃 (초)"
            }
        },
        "required": ["command"]   # ← command만 필수
    }
}
```

> **이것이 LLM에 전달되는 형태입니다.** `description`이 LLM이 "이 Tool을 언제 써야 하는지" 판단하는 근거입니다.

---

## 2. LLM API 호출 (Tool 목록 포함)

```python
client = genai.Client()

# Tool 객체로 감싸기
tools = types.Tool(function_declarations=[exec_tool_declaration])

# 대화 히스토리 (messages 배열)
contents = [
    types.Content(
        role="user",
        parts=[types.Part(text="현재 디렉토리 파일 목록을 보여줘")]
    )
]

# API 호출 — Tool 정의를 함께 전달
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=contents,
    config=types.GenerateContentConfig(
        tools=[tools],
        system_instruction="당신은 유능한 AI 비서입니다."
    ),
)
```

**이때 실제로 전송되는 JSON 구조:**

```json
{
  "model": "gemini-2.5-flash",
  "system_instruction": {
    "parts": [{ "text": "당신은 유능한 AI 비서입니다." }]
  },
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "현재 디렉토리 파일 목록을 보여줘" }]
    }
  ],
  "tools": [
    {
      "function_declarations": [
        {
          "name": "exec",
          "description": "셸 명령어를 실행합니다.",
          "parameters": {
            "type": "object",
            "properties": {
              "command": {
                "type": "string",
                "description": "실행할 셸 명령어"
              },
              "workdir": {
                "type": "string",
                "description": "작업 디렉토리 (생략 시 현재 디렉토리)"
              }
            },
            "required": ["command"]
          }
        }
      ]
    }
  ]
}
```

> **Anthropic과의 차이점:** Anthropic은 `tools[].input_schema`, Gemini는 `tools[].function_declarations[].parameters` 키를 사용합니다.

---

## 3. LLM이 Tool을 쓰겠다고 응답하는 구조

LLM이 Tool 호출이 필요하다고 판단하면 `functionCall` 블록을 반환합니다.

**실제 응답 JSON:**

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "functionCall": {
              "name": "exec",
              "args": {
                "command": "ls -la"
              }
            }
          }
        ]
      },
      "finish_reason": "STOP"
    }
  ]
}
```

> **Anthropic과의 차이점:**
> - Anthropic → `"type": "tool_use"`, `"id": "toolu_abc123"`, `"input": {...}`
> - Gemini → `"functionCall"`, ID 없음 (name으로 매칭), `"args": {...}`

**Python 코드로 꺼내기:**

```python
part = response.candidates[0].content.parts[0]

# Tool 호출 여부 확인
if part.function_call:
    tool_name = part.function_call.name   # "exec"
    tool_args = part.function_call.args   # {"command": "ls -la"}
```

---

## 3-1. 섹션 3의 JSON은 항상 형식을 지켜서 오는가?

### 결론부터

`functionCall` 블록의 형식은 **API가 보장합니다.** 하지만 `functionCall` 자체가 **올 수도 있고 안 올 수도 있습니다.**

---

### 왜 형식은 보장되나 — 내부 동작 원리

LLM은 원래 토큰을 하나씩 생성하는 확률 모델입니다. 그러나 `functionCall` 블록은 LLM이 자유롭게 텍스트를 뱉는 게 아니라, **API 레이어가 개입해서 구조화된 객체로 강제 변환**합니다.

```
LLM 내부 (토큰 생성)
  → 모델이 "exec 함수에 ls -la 넣어야겠다"고 추론
  → 특수 토큰으로 함수 호출 의도를 인코딩

Gemini API 레이어 (파싱 + 검증)
  → 그 토큰을 파싱해서 { name, args } 구조로 변환
  → JSON Schema 검증 (name이 선언된 함수인지, args 타입이 맞는지)

개발자에게 전달
  → 항상 { "functionCall": { "name": "...", "args": {...} } } 형식
```

즉, 개발자가 받는 시점에는 **이미 파싱·검증이 끝난 구조화된 객체**입니다. 직접 JSON 문자열을 파싱할 필요가 없습니다.

---

### 정확히 어느 레이어가 책임지나 — 서버 vs SDK

"API 레이어"는 사실 두 단계로 나뉩니다.

#### 서버 (Google Gemini API 서버) 담당

API 내부는 Protocol Buffers로 구현되어 있습니다.

```protobuf
// content.proto (서버 내부 정의)
message FunctionCall {
  string name = 1;
  optional google.protobuf.Struct args = 2;  // ← Struct 타입
}
```

`google.protobuf.Struct`는 ProtoJSON 규격에 의해 **네이티브 JSON 객체로 직렬화**됩니다.
HTTP 응답이 전송되기 전, 서버에서 이미 파싱·변환이 완료됩니다.

개발자가 받는 raw HTTP body:

```json
{
  "functionCall": {
    "name": "exec",
    "args": { "command": "ls -la" }
  }
}
```

`args`가 JSON 문자열 `"{\"command\": \"ls -la\"}"` 이 아닌, 이미 **JSON 객체**로 도착합니다. 서버가 보장한 것입니다.

또한 서버는:
- 요청 시 함수 선언(schema)이 올바른지 검증 (틀리면 HTTP 400 반환)
- 모델 출력이 선언된 schema에 맞도록 제약

#### SDK (`google-genai`) 담당

서버가 보내준 JSON을 Python 객체로 변환하는 역할입니다.

```
HTTP body (string)
    ↓  json.loads()              ← _api_client.py: 전체 HTTP body를 dict로 파싱
Python dict
    ↓  transformer functions     ← models.py: 필드 이름 정규화, 구조 변환
    ↓  Pydantic validation       ← types.py: FunctionCall.args 타입 검증 (dict 맞는지)
FunctionCall(name="exec", args={"command": "ls -la"})
    ↓  (AFC 활성화 시만)
type coercion                    ← _extra_utils.py: float→int 등 Python 타입에 맞게 변환
```

SDK의 `FunctionCall` 타입 정의:

```python
class FunctionCall(BaseModel):
    name: Optional[str]
    args: Optional[dict[str, Any]]  # ← args는 이미 dict로 도착. SDK가 재파싱하지 않음
```

#### 책임 요약

| 역할 | 담당 주체 |
|---|---|
| `args`가 JSON 객체로 구조화되어 오는 것 | **서버** (protobuf → ProtoJSON 변환) |
| 함수 선언 schema 유효성 검증 | **서버** (HTTP 400으로 거부) |
| HTTP body를 Python dict로 파싱 | **SDK** (`json.loads`) |
| Pydantic 모델로 타입 검증 | **SDK** (`types.py`) |
| Python 함수 타입에 맞게 args 변환 | **SDK** (AFC, `_extra_utils.py`) |

> **핵심:** `args`의 "JSON 구조 보장"은 **서버 책임**. 그걸 Python 객체로 만드는 것은 **SDK 책임**.

---

### 그러면 언제 `functionCall`이 안 오나

API가 형식은 보장하지만, **`functionCall` 블록 자체가 응답에 없을 수 있는 경우**는 세 가지입니다.

```
경우 1: 모델이 Tool 없이 직접 답할 수 있다고 판단
  → parts: [{ "text": "안녕하세요!" }]
  → functionCall 없음, 일반 텍스트만 옴

경우 2: 모델이 안전/정책상 거부
  → finish_reason: "SAFETY"
  → parts 비어있거나 거부 메시지

경우 3: 토큰 한도 초과
  → finish_reason: "MAX_TOKENS"
  → functionCall이 잘린 채로 올 수 있음
```

---

### `finish_reason`으로 상태 확인하는 법

`functionCall`을 쓰기 전에 반드시 `finish_reason`을 먼저 확인해야 합니다.

```python
candidate = response.candidates[0]

# ① finish_reason 확인
finish_reason = candidate.finish_reason
# 값: "STOP", "MAX_TOKENS", "SAFETY", "RECITATION", "OTHER"

if finish_reason != "STOP":
    print(f"비정상 종료: {finish_reason}")
    # 재시도하거나 에러 처리

# ② 그 다음에 parts 확인
for part in candidate.content.parts:
    if part.function_call:
        # 형식은 여기까지 왔으면 보장됨
        name = part.function_call.name   # 반드시 선언한 함수 이름
        args = part.function_call.args   # 반드시 dict
    elif part.text:
        # 모델이 Tool 안 쓰고 직접 답한 경우
        print("직접 답변:", part.text)
```

---

### `tool_config`로 동작 제어하기

모델이 Tool을 쓸지 말지를 개발자가 강제할 수 있습니다.

```python
# AUTO (기본값): 모델이 알아서 Tool 쓸지 결정
config = types.GenerateContentConfig(
    tools=[tools],
    tool_config=types.ToolConfig(
        function_calling_config=types.FunctionCallingConfig(
            mode="AUTO"   # Tool 쓸 수도 있고 안 쓸 수도 있음
        )
    )
)

# ANY: 반드시 Tool을 써야 함 (텍스트 직답 불가)
config = types.GenerateContentConfig(
    tools=[tools],
    tool_config=types.ToolConfig(
        function_calling_config=types.FunctionCallingConfig(
            mode="ANY"    # functionCall 없으면 오류
        )
    )
)

# NONE: Tool을 절대 쓰지 말고 텍스트로만 답해
config = types.GenerateContentConfig(
    tools=[tools],
    tool_config=types.ToolConfig(
        function_calling_config=types.FunctionCallingConfig(
            mode="NONE"   # functionCall 블록이 절대 안 옴
        )
    )
)
```

```
mode=AUTO  → functionCall 올 수도, text만 올 수도 있음  (기본)
mode=ANY   → functionCall 반드시 옴                     (강제)
mode=NONE  → functionCall 절대 안 옴                    (비활성)
```

---

### 한 줄 정리

> `functionCall` 블록이 **온다면** 형식은 항상 보장된다.
> **올지 안 올지**는 `mode` 설정과 `finish_reason`으로 제어·확인해야 한다.

---

## 4. Tool 실행 후 결과를 LLM에 다시 넣기

Tool을 실행하고 결과를 `functionResponse`로 감싸서 대화에 추가합니다.

```python
import subprocess

# Tool 실행
result = subprocess.run(
    tool_args["command"],
    shell=True,
    capture_output=True,
    text=True
)
output = result.stdout or result.stderr

# 대화 히스토리에 두 가지를 순서대로 추가:
# 1) LLM의 Tool 호출 메시지
contents.append(response.candidates[0].content)

# 2) Tool 실행 결과 (role은 "user" 또는 "tool")
contents.append(
    types.Content(
        role="user",
        parts=[
            types.Part.from_function_response(
                name="exec",              # ← Tool 이름으로 매칭
                response={"result": output}  # ← 실행 결과
            )
        ]
    )
)

# 결과를 포함해서 다시 LLM 호출
final_response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=contents,
    config=types.GenerateContentConfig(tools=[tools])
)

print(final_response.text)
# → "현재 디렉토리에는 README.md, src/, docs/ 등이 있습니다."
```

**이때 전송되는 JSON (두 번째 요청):**

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "현재 디렉토리 파일 목록을 보여줘" }]
    },
    {
      "role": "model",
      "parts": [
        {
          "functionCall": {
            "name": "exec",
            "args": { "command": "ls -la" }
          }
        }
      ]
    },
    {
      "role": "user",
      "parts": [
        {
          "functionResponse": {
            "name": "exec",
            "response": {
              "result": "total 48\n-rw-r--r-- README.md\ndrwxr-xr-x src/\n..."
            }
          }
        }
      ]
    }
  ]
}
```

> **Anthropic과의 차이점:**
> - Anthropic → `"type": "tool_result"`, `"tool_use_id": "toolu_abc123"` (ID로 매칭)
> - Gemini → `"functionResponse"`, `"name": "exec"` (이름으로 매칭), ID 없음

---

## 5. 전체 흐름 한눈에 보기

```
[사용자] "파일 목록 보여줘"
    │
    ▼
[내 코드] generate_content(contents, tools=[exec_tool])
    │
    │  전송 JSON:
    │  { contents: [...], tools: [{ function_declarations: [...] }] }
    │
    ▼
[Gemini] "exec Tool로 ls -la 실행해줘"
    │
    │  응답 JSON:
    │  { parts: [{ functionCall: { name: "exec", args: { command: "ls -la" } } }] }
    │
    ▼
[내 코드] subprocess.run("ls -la") → 결과 수집
    │
    ▼
[내 코드] generate_content(contents + functionResponse)
    │
    │  전송 JSON:
    │  { contents: [..., { parts: [{ functionResponse: { name: "exec", response: {...} } }] }] }
    │
    ▼
[Gemini] "파일 목록입니다: README.md, src/, docs/"
    │
    ▼
[사용자] 최종 답변 수신
```

---

## 6. Anthropic vs Gemini 핵심 차이 비교

| 항목 | Anthropic (Claude) | Gemini |
|------|-------------------|--------|
| Tool 정의 키 | `tools[].input_schema` | `tools[].function_declarations[].parameters` |
| Tool 호출 응답 타입 | `"type": "tool_use"` | `"functionCall"` |
| Tool 호출 ID | `"id": "toolu_abc"` (있음) | 없음 |
| 매칭 방식 | `tool_use_id` ↔ `tool_result` | `name` ↔ `functionResponse` |
| Tool 결과 키 | `"type": "tool_result"` | `"functionResponse"` |
| Tool 결과 role | `"user"` | `"user"` (동일) |
| 패키지 | `anthropic` | `google-genai` |

---

## 7. LLM이 Tool 쓰기 전에 생각(Thinking)하는 텍스트도 JSON으로 오나요?

**네, 옵니다.** 단, 기본값이 아니라 설정해야 받을 수 있습니다.

### 7-1. 어떻게 생겼나

Gemini 2.5 이상에서 thinking을 켜면, 응답의 `parts` 배열 안에 **thought 블록이 먼저** 들어오고, 그 뒤에 `functionCall`이 따라옵니다.

**응답 JSON 구조:**

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "thought": true,
            "text": "사용자가 파일 목록을 원하네. exec Tool로 ls -la를 실행하면 되겠다."
          },
          {
            "functionCall": {
              "name": "exec",
              "args": { "command": "ls -la" }
            }
          }
        ]
      }
    }
  ]
}
```

> `thought: true`인 블록 = LLM의 내부 추론 과정 (사용자에게 보여주지 않는 생각)
> `functionCall` 블록 = 실제 Tool 호출 결정

---

### 7-2. Python 코드로 받기

thinking을 켜려면 요청 시 `ThinkingConfig(include_thoughts=True)`를 추가합니다.

```python
from google import genai
from google.genai import types

client = genai.Client()
tools = types.Tool(function_declarations=[exec_tool_declaration])

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[types.Content(
        role="user",
        parts=[types.Part(text="현재 디렉토리 파일 목록을 보여줘")]
    )],
    config=types.GenerateContentConfig(
        tools=[tools],
        thinking_config=types.ThinkingConfig(
            include_thoughts=True   # ← 이게 없으면 thought 블록이 안 옴
        )
    ),
)

# parts를 순서대로 순회하며 타입 구분
for part in response.candidates[0].content.parts:
    if part.thought:
        # 생각 텍스트 (LLM 내부 추론)
        print("[생각]", part.text)
    elif part.function_call:
        # Tool 호출 결정
        print("[Tool 호출]", part.function_call.name, part.function_call.args)
    elif part.text:
        # 일반 답변 텍스트
        print("[답변]", part.text)

# 출력 예시:
# [생각] 사용자가 파일 목록을 원하네. exec Tool로 ls -la를 실행하면 되겠다.
# [Tool 호출] exec {'command': 'ls -la'}
```

---

### 7-3. Tool 결과를 다시 넣을 때 중요한 규칙

thinking을 켠 상태에서 Tool 결과를 다시 LLM에 넣을 때, **응답 전체(thought 블록 포함)를 그대로 돌려줘야** 합니다. thought 블록을 빼먹으면 오류가 납니다.

```python
# ❌ 잘못된 방법 — functionCall만 골라서 넣으면 안 됨
# contents.append(types.Content(role="model", parts=[function_call_part_only]))

# ✅ 올바른 방법 — 응답 content 전체(thought 포함)를 그대로 추가
contents.append(response.candidates[0].content)   # thought + functionCall 다 포함

# 그 다음에 Tool 결과 추가
contents.append(
    types.Content(
        role="user",
        parts=[types.Part.from_function_response(
            name="exec",
            response={"result": "total 48\n-rw-r--r-- README.md ..."}
        )]
    )
)
```

**이때 두 번째 요청에서 전송되는 contents 배열:**

```json
[
  { "role": "user",  "parts": [{ "text": "현재 디렉토리 파일 목록을 보여줘" }] },
  {
    "role": "model",
    "parts": [
      { "thought": true, "text": "exec Tool로 ls -la를 실행하면 되겠다." },
      { "functionCall": { "name": "exec", "args": { "command": "ls -la" } } }
    ]
  },
  {
    "role": "user",
    "parts": [{ "functionResponse": { "name": "exec", "response": { "result": "..." } } }]
  }
]
```

---

### 7-4. thinking 토큰 사용량 확인

thinking은 별도 토큰을 소비합니다. 확인 방법:

```python
usage = response.usage_metadata
print(f"일반 토큰: {usage.prompt_token_count}")
print(f"thinking 토큰: {usage.thoughts_token_count}")  # ← 생각에 쓴 토큰
print(f"출력 토큰: {usage.candidates_token_count}")
```

---

### 7-5. 정리

```
include_thoughts=False (기본값)
    응답 parts: [ functionCall ]
    → thought 블록 없음. 깔끔하지만 내부 추론 안 보임

include_thoughts=True
    응답 parts: [ thought(text), functionCall ]
    → 생각 과정이 먼저 오고, 그 뒤에 Tool 호출
    → Tool 결과 재전송 시 thought 블록도 반드시 포함해야 함
```

---

*참고:*
- *[Google Gemini Function Calling 공식 문서](https://ai.google.dev/gemini-api/docs/function-calling)*
- *[Gemini Thinking 공식 문서](https://ai.google.dev/gemini-api/docs/thinking)*
- *[Thought Signatures 공식 문서](https://ai.google.dev/gemini-api/docs/thought-signatures)*
