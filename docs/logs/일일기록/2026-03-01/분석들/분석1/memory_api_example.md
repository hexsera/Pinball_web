# FastAPI + Gemini API로 MEMORY.md 대화 시스템 구현

openclaw의 메모리 시스템 흐름을 FastAPI + Gemini API로 재현한 예시입니다.
임베딩 과정은 제외하고, 순수 텍스트 기반으로 구현합니다.

---

## openclaw 메모리 시스템 흐름 (원본)

```
[1] 대화 시작 → MEMORY.md를 시스템 프롬프트에 주입 (bootstrap)
[2] 사용자 ↔ AI 대화 진행
[3] 토큰 임계값 도달 → AI가 memory flush 판단 → memory/YYYY-MM-DD.md 작성
[4] 세션 종료(/new, /reset) → 세션 내용을 memory/에 저장 (hook)
[5] 다음 대화 시작 → [1]로 복귀 (MEMORY.md 다시 로드)
```

## 이 예시에서 구현하는 흐름

```
[1] POST /chat/start     → 세션 생성, MEMORY.md 로드하여 시스템 프롬프트에 주입
[2] POST /chat/message   → 사용자 메시지 → Gemini 응답 (메모리 컨텍스트 포함)
                           매 응답마다 memory flush 필요 여부 자동 판단
[3] POST /chat/end       → 세션 종료 시 대화 내용을 memory/에 저장
[4] GET  /memory/read    → 현재 MEMORY.md 확인
```

---

## 코드

```python
# memory_chat_api.py
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

app = FastAPI(title="Memory Chat API")

# ─── Gemini 설정 ───
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
llm = genai.GenerativeModel("gemini-2.0-flash")

# ─── 경로 설정 ───
WORKSPACE = Path(os.environ.get("WORKSPACE_DIR", "."))
MEMORY_FILE = WORKSPACE / "MEMORY.md"
MEMORY_DIR = WORKSPACE / "memory"

# ─── 설정값 (openclaw 기본값 참고) ───
# openclaw: contextWindow - reserveTokens(6000) - softThreshold(4000)
# 간소화: 메시지 수 기반으로 flush 판단
FLUSH_THRESHOLD_MESSAGES = 10       # 이 수 이상이면 flush 실행
BOOTSTRAP_MAX_CHARS = 20_000        # MEMORY.md 최대 주입 문자 수


# ═══════════════════════════════════════════════
# 스키마
# ═══════════════════════════════════════════════

class Message(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class StartSessionRequest(BaseModel):
    session_id: str | None = None   # 미지정 시 자동 생성

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    memory_flushed: bool            # 이번 턴에 flush가 실행되었는가
    flush_facts: list[str]          # flush로 저장된 항목들

class EndSessionResponse(BaseModel):
    session_id: str
    memory_file: str | None         # 저장된 memory 파일 경로
    status: str


# ═══════════════════════════════════════════════
# 세션 저장소 (인메모리)
# ═══════════════════════════════════════════════

sessions: dict[str, dict] = {}
# {
#   session_id: {
#     "messages": [Message, ...],
#     "system_prompt": str,
#     "last_flush_at": int,       # 마지막 flush 시점의 메시지 인덱스
#   }
# }


# ═══════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════

def load_memory_file() -> str:
    """MEMORY.md 읽기 (없으면 빈 문자열)"""
    if MEMORY_FILE.exists():
        content = MEMORY_FILE.read_text(encoding="utf-8")
        return content[:BOOTSTRAP_MAX_CHARS]
    return ""


def load_memory_dir_files() -> str:
    """memory/ 디렉토리의 모든 .md 파일 내용을 합쳐서 반환"""
    if not MEMORY_DIR.exists():
        return ""
    parts = []
    for f in sorted(MEMORY_DIR.glob("*.md")):
        parts.append(f"--- {f.name} ---\n{f.read_text(encoding='utf-8')}")
    combined = "\n\n".join(parts)
    return combined[:BOOTSTRAP_MAX_CHARS]


def format_conversation(messages: list[Message]) -> str:
    lines = []
    for m in messages:
        label = "User" if m.role == "user" else "Assistant"
        lines.append(f"{label}: {m.content}")
    return "\n".join(lines)


# ═══════════════════════════════════════════════
# [1] 시스템 프롬프트 구성 — openclaw의 bootstrap + memory section
# ═══════════════════════════════════════════════

def build_system_prompt(memory_content: str, memory_dir_content: str) -> str:
    """
    openclaw 흐름 대응:
    - bootstrap-files.ts  → MEMORY.md를 시스템 프롬프트에 주입
    - system-prompt.ts    → Memory Recall 섹션 추가
    """
    parts = ["You are a helpful AI assistant. Respond in the user's language."]

    # ── Bootstrap: MEMORY.md 주입 (openclaw: buildBootstrapContextFiles) ──
    if memory_content:
        parts.append(
            "\n## Your Persistent Memory (MEMORY.md)\n"
            "The following is your long-term memory from previous sessions. "
            "Use this information to personalize your responses.\n\n"
            f"{memory_content}"
        )

    # ── Bootstrap: memory/*.md 주입 ──
    if memory_dir_content:
        parts.append(
            "\n## Session Memory Files (memory/*.md)\n"
            "These are summaries of previous conversations.\n\n"
            f"{memory_dir_content}"
        )

    # ── Memory Recall 지시 (openclaw: buildMemorySection) ──
    parts.append(
        "\n## Memory Instructions\n"
        "- When the user references prior conversations, decisions, or preferences, "
        "check your persistent memory above before answering.\n"
        "- If you learn new durable information (user preferences, project rules, "
        "recurring patterns), note it internally for the memory flush step."
    )

    return "\n\n".join(parts)


# ═══════════════════════════════════════════════
# [2] Memory Flush — openclaw의 pre-compaction memory flush
# ═══════════════════════════════════════════════

FLUSH_EXTRACT_PROMPT = """\
Pre-compaction memory flush.
다음 대화에서 향후 세션에서도 기억해야 할 정보를 추출하세요.

<conversation>
{conversation}
</conversation>

<existing_memory>
{existing_memory}
</existing_memory>

추출 기준:
1. 사용자 선호도 (언어, 코드 스타일, 커뮤니케이션 방식 등)
2. 프로젝트 관련 규칙이나 제약 조건
3. 반복적으로 등장하는 패턴이나 요청
4. 사용자가 명시적으로 "기억해" 라고 요청한 정보
5. 이미 existing_memory에 있는 내용은 중복 추가하지 말 것

응답 형식 (반드시 JSON):
{{
  "should_update": true/false,
  "new_facts": ["- 항목1", "- 항목2"],
  "category": "사용자 선호도 | 프로젝트 규칙 | 기술 스택 | 기타"
}}

저장할 정보가 없으면 should_update: false, new_facts: [] 로 반환하세요.
"""

FLUSH_MERGE_PROMPT = """\
기존 MEMORY.md와 새로 추출된 사실들을 병합하여 갱신된 MEMORY.md를 생성하세요.

<existing_memory>
{existing_memory}
</existing_memory>

<new_facts>
카테고리: {category}
{new_facts}
</new_facts>

규칙:
- 마크다운 형식 유지
- 중복 항목 제거
- 카테고리별 섹션(## 헤더)으로 정리
- 간결한 불릿 포인트 사용
- 최상단에 `# Memory` 헤더 포함

완성된 MEMORY.md 전체 내용만 출력하세요 (코드블록 없이).
"""


def should_run_memory_flush(session: dict) -> bool:
    """
    openclaw 흐름 대응:
    - memory-flush.ts: shouldRunMemoryFlush()
    - 원본: 토큰 임계값 기반 (contextWindow - reserveTokens - softThreshold)
    - 간소화: 메시지 수 기반 판단
    """
    messages = session["messages"]
    last_flush = session.get("last_flush_at", 0)
    messages_since_flush = len(messages) - last_flush
    return messages_since_flush >= FLUSH_THRESHOLD_MESSAGES


def run_memory_flush(session: dict) -> tuple[bool, list[str]]:
    """
    openclaw 흐름 대응:
    - agent-runner-memory.ts: runMemoryFlushIfNeeded()
    - 독립 에이전트(embedded pi-agent)를 실행하여 memory/ 에 작성
    - 간소화: Gemini 호출로 추출 → 병합 → MEMORY.md 갱신
    """
    messages = session["messages"]
    existing_memory = load_memory_file()
    conversation_text = format_conversation(messages)

    # 1단계: 추출
    extract_resp = llm.generate_content(
        FLUSH_EXTRACT_PROMPT.format(
            conversation=conversation_text,
            existing_memory=existing_memory or "(없음)",
        )
    )

    raw = extract_resp.text.strip()
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return False, []

    extracted = json.loads(match.group())
    if not extracted.get("should_update", False):
        return False, []

    new_facts: list[str] = extracted.get("new_facts", [])
    category: str = extracted.get("category", "기타")
    if not new_facts:
        return False, []

    # 2단계: 병합 → MEMORY.md 갱신
    merge_resp = llm.generate_content(
        FLUSH_MERGE_PROMPT.format(
            existing_memory=existing_memory or "(없음)",
            category=category,
            new_facts="\n".join(new_facts),
        )
    )

    updated = merge_resp.text.strip()
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(updated, encoding="utf-8")

    # flush 지점 기록
    session["last_flush_at"] = len(messages)

    return True, new_facts


# ═══════════════════════════════════════════════
# [3] 세션 종료 시 메모리 저장 — openclaw의 session-memory hook
# ═══════════════════════════════════════════════

SESSION_SLUG_PROMPT = """\
다음 대화 내용을 보고, 이 대화를 한 단어로 요약하는 영문 slug를 생성하세요.
slug 규칙: 소문자, 하이픈 구분, 최대 3단어 (예: python-type-hints)

대화 내용 (최근 15개):
{conversation}

slug만 출력하세요 (따옴표 없이).
"""


def save_session_to_memory(session: dict, session_id: str) -> str | None:
    """
    openclaw 흐름 대응:
    - hooks/bundled/session-memory/handler.ts: saveSessionToMemory()
    - 세션 종료 시 memory/YYYY-MM-DD-{slug}.md 로 저장
    """
    messages = session["messages"]
    if not messages:
        return None

    MEMORY_DIR.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")

    # LLM으로 slug 생성 (openclaw: generateSlugViaLLM)
    recent = messages[-15:]
    conversation_text = format_conversation(recent)
    slug_resp = llm.generate_content(
        SESSION_SLUG_PROMPT.format(conversation=conversation_text)
    )
    slug = re.sub(r"[^a-z0-9-]", "", slug_resp.text.strip().lower())[:40] or "session"

    filename = f"{date_str}-{slug}.md"
    filepath = MEMORY_DIR / filename

    # 세션 내용을 마크다운으로 변환
    lines = [
        f"# Session: {date_str} {time_str} UTC",
        f"- **Session ID**: {session_id}",
        "",
    ]
    for m in messages:
        label = "User" if m.role == "user" else "Assistant"
        lines.append(f"**{label}**: {m.content}")
        lines.append("")

    filepath.write_text("\n".join(lines), encoding="utf-8")
    return str(filepath)


# ═══════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════

@app.post("/chat/start")
async def start_session(req: StartSessionRequest = StartSessionRequest()):
    """
    [1단계] 세션 시작 — MEMORY.md를 로드하여 시스템 프롬프트 구성

    openclaw 흐름 대응:
    - bootstrap-files.ts → MEMORY.md 로드
    - system-prompt.ts   → 시스템 프롬프트에 메모리 섹션 주입
    """
    sid = req.session_id or str(uuid.uuid4())[:8]

    memory_content = load_memory_file()
    memory_dir_content = load_memory_dir_files()
    system_prompt = build_system_prompt(memory_content, memory_dir_content)

    sessions[sid] = {
        "messages": [],
        "system_prompt": system_prompt,
        "last_flush_at": 0,
    }

    return {
        "session_id": sid,
        "memory_loaded": bool(memory_content),
        "memory_files_loaded": bool(memory_dir_content),
        "status": "started",
    }


@app.post("/chat/message", response_model=ChatResponse)
async def chat_message(req: ChatRequest):
    """
    [2단계] 대화 — 메모리 컨텍스트를 포함한 응답 + 자동 memory flush

    openclaw 흐름 대응:
    - agent-runner.ts  → 대화 실행 전 runMemoryFlushIfNeeded() 호출
    - memory-flush.ts  → 토큰 임계값 도달 시 자동 flush
    """
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    # 사용자 메시지 추가
    session["messages"].append(Message(role="user", content=req.message))

    # ── Gemini 호출: 시스템 프롬프트(메모리 포함) + 대화 이력 ──
    chat_history = []
    for m in session["messages"][:-1]:
        chat_history.append({"role": m.role, "parts": [m.content]})

    chat = llm.start_chat(history=chat_history)
    response = chat.send_message(
        req.message,
        generation_config=genai.GenerationConfig(
            system_instruction=session["system_prompt"],
        ) if hasattr(genai, "GenerationConfig") else None,
    )

    assistant_reply = response.text.strip()
    session["messages"].append(Message(role="assistant", content=assistant_reply))

    # ── Memory Flush 판단 및 실행 ──
    flushed = False
    flush_facts: list[str] = []

    if should_run_memory_flush(session):
        flushed, flush_facts = run_memory_flush(session)
        if flushed:
            # flush 후 시스템 프롬프트 갱신 (갱신된 MEMORY.md 반영)
            session["system_prompt"] = build_system_prompt(
                load_memory_file(), load_memory_dir_files()
            )

    return ChatResponse(
        session_id=req.session_id,
        reply=assistant_reply,
        memory_flushed=flushed,
        flush_facts=flush_facts,
    )


@app.post("/chat/end", response_model=EndSessionResponse)
async def end_session(session_id: str):
    """
    [3단계] 세션 종료 — 대화 내용을 memory/ 에 저장

    openclaw 흐름 대응:
    - hooks/bundled/session-memory/handler.ts
    - /new, /reset 명령 시 트리거
    """
    session = sessions.pop(session_id, None)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    memory_file = save_session_to_memory(session, session_id)

    return EndSessionResponse(
        session_id=session_id,
        memory_file=memory_file,
        status="ended",
    )


@app.get("/memory/read")
async def read_memory():
    """현재 MEMORY.md 및 memory/ 파일 목록 확인"""
    memory_content = load_memory_file()
    memory_files = []
    if MEMORY_DIR.exists():
        memory_files = [f.name for f in sorted(MEMORY_DIR.glob("*.md"))]
    return {
        "memory_md": memory_content,
        "memory_md_exists": MEMORY_FILE.exists(),
        "memory_dir_files": memory_files,
    }
```

---

## openclaw ↔ 이 예시 대응표

| openclaw 원본 | 이 예시 | 설명 |
|---------------|---------|------|
| `bootstrap-files.ts` | `build_system_prompt()` | MEMORY.md를 시스템 프롬프트에 주입 |
| `system-prompt.ts: buildMemorySection()` | `build_system_prompt()` 내 Memory Instructions | AI에게 메모리 사용 지시 |
| `memory-flush.ts: shouldRunMemoryFlush()` | `should_run_memory_flush()` | flush 필요 여부 판단 (원본: 토큰 기반 → 간소화: 메시지 수 기반) |
| `agent-runner-memory.ts: runMemoryFlushIfNeeded()` | `run_memory_flush()` | flush 실행 (추출 → 병합 → MEMORY.md 갱신) |
| `session-memory/handler.ts: saveSessionToMemory()` | `save_session_to_memory()` | 세션 종료 시 `memory/YYYY-MM-DD-{slug}.md` 저장 |
| `memory-tool.ts: memory_search` | 시스템 프롬프트에 전문 주입 | 원본: 벡터+FTS 하이브리드 검색 → 간소화: 부트스트랩 전문 주입 |
| `manager-sync-ops.ts: chokidar watcher` | (제외) | 파일 변경 감시는 이 예시에서 불필요 |
| `manager-embedding-ops.ts: embedChunksInBatches()` | (제외) | 임베딩 과정 제외 |

---

## 의존성 설치

```bash
pip install fastapi uvicorn google-generativeai pydantic
```

## 실행

```bash
GEMINI_API_KEY=your_key uvicorn memory_chat_api:app --reload
```

---

## 사용 예시: 전체 흐름

### 1. 세션 시작 (MEMORY.md 로드)

```bash
curl -X POST http://localhost:8000/chat/start \
  -H "Content-Type: application/json" \
  -d '{"session_id": "demo"}'
```

```json
{
  "session_id": "demo",
  "memory_loaded": false,
  "memory_files_loaded": false,
  "status": "started"
}
```

### 2. 대화 진행

```bash
# 사용자 선호도 전달
curl -X POST http://localhost:8000/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "demo",
    "message": "앞으로 Python 코드는 항상 type hint 붙여줘. 그리고 한국어로 대답해"
  }'
```

```json
{
  "session_id": "demo",
  "reply": "네, 알겠습니다! ...",
  "memory_flushed": false,
  "flush_facts": []
}
```

```bash
# ... 대화 10회 이상 진행 시 자동 flush 발생 ...
```

```json
{
  "session_id": "demo",
  "reply": "...",
  "memory_flushed": true,
  "flush_facts": [
    "- 응답 언어: 한국어",
    "- Python 코드에 type hint 필수 사용"
  ]
}
```

### 3. 세션 종료 (memory/ 에 세션 저장)

```bash
curl -X POST "http://localhost:8000/chat/end?session_id=demo"
```

```json
{
  "session_id": "demo",
  "memory_file": "memory/2026-02-25-python-type-hints.md",
  "status": "ended"
}
```

### 4. 다음 세션 시작 (이전 메모리 자동 로드)

```bash
curl -X POST http://localhost:8000/chat/start \
  -H "Content-Type: application/json" \
  -d '{"session_id": "demo2"}'
```

```json
{
  "session_id": "demo2",
  "memory_loaded": true,
  "memory_files_loaded": true,
  "status": "started"
}
```

이제 `demo2` 세션에서 AI는 이전 세션의 선호도(한국어, type hint)를 이미 알고 있습니다.

### 5. 메모리 확인

```bash
curl http://localhost:8000/memory/read
```

```json
{
  "memory_md": "# Memory\n\n## 사용자 선호도\n- 응답 언어: 한국어\n- Python 코드에 type hint 필수 사용\n",
  "memory_md_exists": true,
  "memory_dir_files": ["2026-02-25-python-type-hints.md"]
}
```

---

## 전체 흐름도

```
새 세션 시작
    │
    ▼
[MEMORY.md 로드] ──── bootstrap-files.ts 대응
[memory/*.md 로드]     시스템 프롬프트에 메모리 주입
    │
    ▼
┌─────────────────────────────────────────┐
│          사용자 ↔ AI 대화 루프          │
│                                         │
│  User msg → Gemini(시스템프롬프트+이력) │
│          → Assistant reply              │
│                                         │
│  매 턴마다:                             │
│  ┌─ should_run_memory_flush()? ──┐      │
│  │  메시지 수 >= 임계값(10)?     │      │
│  │  YES → run_memory_flush()     │      │
│  │    1. 대화에서 사실 추출      │      │
│  │    2. 기존 MEMORY.md와 병합   │      │
│  │    3. MEMORY.md 갱신          │      │
│  │    4. 시스템 프롬프트 갱신    │      │
│  └───────────────────────────────┘      │
└─────────────────────────────────────────┘
    │
    ▼ (세션 종료)
[save_session_to_memory()]
    │  session-memory hook 대응
    │  memory/2026-02-25-{slug}.md 저장
    ▼
다음 세션에서 [1]로 복귀 → 갱신된 메모리 반영
```
