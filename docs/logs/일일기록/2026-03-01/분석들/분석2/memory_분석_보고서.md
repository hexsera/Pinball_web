# OpenClaw 메모리 읽기 시스템 분석 보고서

> 채팅 과정에서 언제, 어떻게 메모리를 읽는지에 대한 코드 수준 분석

---

## 1. 메모리 시스템 개요

OpenClaw의 메모리 시스템은 **두 가지 구현**으로 나뉩니다.

| 구현체 | 경로 | 역할 |
|--------|------|------|
| **memory-core** | `extensions/memory-core/` | 파일 기반 메모리 검색 도구 및 CLI 제공 |
| **memory-lancedb** | `extensions/memory-lancedb/` | LanceDB 기반 벡터 메모리 (자동 회상·캡처) |

쉽게 말하면, 메모리는 AI가 이전 대화나 중요한 정보를 기억하는 공간입니다. 컴퓨터의 메모장처럼, 대화할 때마다 필요한 정보를 꺼내 읽거나 새로 저장합니다.

---

## 2. 메모리가 저장되는 위치

```
메모리 파일 위치:
├── MEMORY.md          ← 가장 기본적인 메모리 파일
├── memory.md          ← 대안 이름
└── memory/            ← 메모리 폴더
    ├── projects.md
    ├── preferences.md
    └── ...

SQLite 데이터베이스 (벡터 저장):
~/.openclaw/memory/{agentId}.sqlite
```

**관련 코드**: [src/memory/internal.ts:48-57](openclaw_git/src/memory/internal.ts#L48-L57)
```typescript
export function isMemoryPath(relPath: string): boolean {
  const normalized = normalizeRelPath(relPath);
  if (!normalized) return false;
  if (normalized === "MEMORY.md" || normalized === "memory.md") return true;
  return normalized.startsWith("memory/");
}
```

---

## 3. 메모리를 읽는 두 가지 도구 (Tools)

채팅에서 메모리를 읽을 때는 두 가지 도구가 사용됩니다.

### 도구 1: `memory_search` — 의미 검색

**파일**: [src/agents/tools/memory-tool.ts:40-99](openclaw_git/src/agents/tools/memory-tool.ts#L40-L99)

"데이터베이스 결정에 대해 뭐가 있었지?" 같은 자연어 질문으로 메모리를 검색합니다.

| 매개변수 | 설명 |
|---------|------|
| `query` | 검색어 (자연어) |
| `maxResults` | 최대 결과 수 (기본: 6) |
| `minScore` | 최소 유사도 점수 (기본: 0.35) |

### 도구 2: `memory_get` — 직접 읽기

**파일**: [src/agents/tools/memory-tool.ts:101-140](openclaw_git/src/agents/tools/memory-tool.ts#L101-L140)

특정 파일의 특정 줄을 직접 읽습니다.

| 매개변수 | 설명 |
|---------|------|
| `path` | 파일 경로 (예: "MEMORY.md") |
| `from` | 시작 줄 번호 (선택) |
| `lines` | 읽을 줄 수 (선택) |

---

## 4. 전체 메모리 읽기 흐름도

세 주체가 각각 무엇을 하는지 기준으로 표현합니다.

```
  사용자 (User)              OpenClaw                      LLM (AI 모델)
       │                        │                               │
       │  "지난번 DB 결정        │                               │
       │   기억해?"             │                               │
       │──────────────────────► │                               │
       │                        │                               │
       │                        │  [세션 시작]                  │
       │                        │  warmSession()                │
       │                        │  메모리 파일 감시 시작        │
       │                        │  (chokidar watcher)           │
       │                        │                               │
       │                        │  사용자 메시지 + 시스템       │
       │                        │  프롬프트 조합                │
       │                        │──────────────────────────────►│
       │                        │                               │
       │                        │                               │  [추론]
       │                        │                               │  "과거 결정을
       │                        │                               │   물어봤다.
       │                        │                               │   메모리 검색
       │                        │                               │   필요!"
       │                        │                               │
       │                        │  tool_call 요청               │
       │                        │  memory_search(              │◄──────────────
       │                        │    query="DB 결정"            │
       │                        │  )                            │
       │                        │                               │
       │                        │  [memory-tool.ts:execute()]   │
       │                        │  ① query 파라미터 파싱        │
       │                        │  ② getMemorySearchManager()   │
       │                        │     └ SQLite DB 연결          │
       │                        │  ③ manager.search(query)      │
       │                        │     ├ 키워드 검색 (BM25)      │
       │                        │     ├ 벡터 검색               │
       │                        │     │  └ 임베딩 API 호출      │
       │                        │     └ 점수 결합               │
       │                        │       (벡터 70% + 텍스트 30%) │
       │                        │  ④ score≥0.35 필터링          │
       │                        │  ⑤ 상위 6개 반환             │
       │                        │                               │
       │                        │  tool_result 반환             │
       │                        │  { snippet: "PostgreSQL로     │
       │                        │    결정, 이유: ACID 보장..." │──────────────►│
       │                        │    score: 0.92 }              │
       │                        │                               │  [추론]
       │                        │                               │  메모리 결과를
       │                        │                               │  바탕으로
       │                        │                               │  답변 생성
       │                        │                               │
       │                        │  최종 답변 수신               │◄──────────────
       │                        │                               │
       │  "PostgreSQL 쓰기로    │                               │
       │   결정하셨습니다."     │                               │
       │◄──────────────────────  │                               │
       │                        │                               │
       │                        │  [세션 종료 후]               │
       │                        │  agent_end 이벤트             │
       │                        │  └ 저장 가치 있는 내용 필터링 │
       │                        │    └ 임베딩 후 DB 저장        │
       │                        │                               │
```

### 주체별 역할 정리

| 주체 | 하는 일 |
|------|---------|
| **사용자** | 자연어로 질문/요청만 함. 메모리 존재 자체를 몰라도 됨 |
| **LLM** | 대화 맥락 보고 `memory_search` 도구를 **언제 쓸지 스스로 판단**해서 호출, 결과 받아 답변 생성 |
| **OpenClaw** | 도구 실행 주체. 실제로 SQLite 열고, 임베딩 변환하고, 검색하고, 결과 돌려줌. 세션 시작·종료 시 자동 저장도 담당 |

---

## 5. 검색 방식 상세: 하이브리드 검색

기본 검색 방식은 **하이브리드**로, 두 가지를 섞어 씁니다.

**관련 파일**: [src/memory/hybrid.ts:51-149](openclaw_git/src/memory/hybrid.ts#L51-L149)

```
쿼리: "데이터베이스 결정에 대해 알려줘"
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌──────────┐      ┌──────────────┐
│ 키워드   │      │ 벡터 검색   │
│ 검색     │      │              │
│ (BM25)   │      │ 쿼리 → 임베딩│
│          │      │ → 코사인 유사도│
└──────────┘      └──────────────┘
    │ 점수 30%         │ 점수 70%
    └─────────┬────────┘
              ▼
      최종 점수 계산
      0.3 × 텍스트점수
    + 0.7 × 벡터점수
      = 최종 관련성 점수
```

**관련 코드**: [src/agents/memory-search.ts:60-68](openclaw_git/src/agents/memory-search.ts#L60-L68)
```typescript
hybrid: {
  enabled: true,
  vectorWeight: 0.7,    // 벡터 비중 70%
  textWeight: 0.3,      // 텍스트 비중 30%
  candidateMultiplier: 4,
}
```

---

## 6. 임베딩 (벡터 변환) 시스템

"임베딩"은 텍스트를 숫자 목록으로 변환하는 과정입니다. 의미가 비슷한 문장은 비슷한 숫자로 변환됩니다.

**관련 파일**: [src/memory/embeddings.ts](openclaw_git/src/memory/embeddings.ts)

지원하는 임베딩 프로바이더:

| 프로바이더 | 모델 예시 | 특징 |
|-----------|---------|------|
| **OpenAI** | text-embedding-3-small | 유료, 고성능 |
| **Google Gemini** | gemini-embedding-001 | 유료 |
| **Voyage** | voyage-4-large | 유료 |
| **Mistral** | mistral-embed | 유료 |
| **Local** | node-llama-cpp | 무료, 느림 |

설정 방법은 `auto`로 하면 사용 가능한 것을 자동 선택합니다.

---

## 7. 자동 메모리 시스템 (memory-lancedb 플러그인)

**파일**: [extensions/memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts)

이 플러그인은 별도 명령 없이도 자동으로 메모리를 읽고 씁니다.

### 자동 회상 (Auto-Recall) — 대화 시작 전

**코드 위치**: [extensions/memory-lancedb/index.ts:539-563](openclaw_git/extensions/memory-lancedb/index.ts#L539-L563)

```
  사용자 (User)              OpenClaw                      LLM (AI 모델)
       │                        │                               │
       │  "나 Python 좋아해"    │                               │
       │──────────────────────► │                               │
       │                        │                               │
       │                        │  [before_agent_start 이벤트]  │
       │                        │  ① 메시지 텍스트 임베딩       │
       │                        │     → 숫자 벡터로 변환        │
       │                        │  ② LanceDB 벡터 검색          │
       │                        │     (최대 3개, 유사도 ≥ 0.3)  │
       │                        │  ③ 관련 메모리 발견 시        │
       │                        │     프롬프트 앞에 자동 삽입   │
       │                        │                               │
       │                        │  [LLM에게 전달되는 메시지]    │
       │                        │  <relevant-memories>          │
       │                        │  (신뢰 불가, 과거 기록)       │
       │                        │  1.[preference] Python 선호   │
       │                        │  2.[fact] 회사: Acme Corp     │
       │                        │  </relevant-memories>         │
       │                        │  + 원래 사용자 메시지         │
       │                        │──────────────────────────────►│
       │                        │                               │  [추론]
       │                        │                               │  과거 기억을
       │                        │                               │  참고해서 답변
```

### 자동 캡처 (Auto-Capture) — 대화 종료 후

**코드 위치**: [extensions/memory-lancedb/index.ts:567-649](openclaw_git/extensions/memory-lancedb/index.ts#L567-L649)

```
  사용자 (User)              OpenClaw                      LLM (AI 모델)
       │                        │                               │
       │                        │           최종 답변 수신      │◄──────────────
       │  답변 수신             │                               │
       │◄──────────────────────  │                               │
       │                        │                               │
       │                        │  [agent_end 이벤트]           │
       │                        │  ① 대화에서 사용자 메시지만   │
       │                        │     추출 (AI 출력 제외)       │
       │                        │  ② 저장 가치 필터링           │
       │                        │     • 10~500자인가?           │
       │                        │     • 선호/결정/개인정보?     │
       │                        │     • 마크다운 과다 아닌가?   │
       │                        │     • 프롬프트 주입 아닌가?   │
       │                        │  ③ 통과 → 임베딩 변환         │
       │                        │  ④ 유사도 0.95 이상 중복 확인 │
       │                        │  ⑤ 중복 아닌 경우 LanceDB 저장│
       │                        │     category: preference/fact │
       │                        │              /decision/entity  │
       │                        │                               │
       ※ 사용자는 이 과정을 인식하지 못함. OpenClaw가 백그라운드에서 처리.
```

### 저장 필터 조건

**파일**: [extensions/memory-lancedb/index.ts:236-263](openclaw_git/extensions/memory-lancedb/index.ts#L236-L263)

```typescript
// 저장되는 텍스트 패턴
const MEMORY_TRIGGERS = [
  /remember|zapamatuj/i,           // "기억해줘"
  /prefer|like|love|hate/i,        // 선호도
  /decided|will use/i,             // 결정사항
  /\+\d{10,}/,                     // 전화번호
  /[\w.-]+@[\w.-]+\.\w+/,          // 이메일
  /my .* is|always|never/i,        // 개인 정보
];
```

---

## 8. 메모리 데이터베이스 구조

**위치**: `~/.openclaw/memory/{agentId}.sqlite`

```
SQLite 데이터베이스
│
├── chunks 테이블 (실제 내용 저장)
│   ├── id         TEXT  → 고유 식별자
│   ├── path       TEXT  → 파일 경로 (MEMORY.md 등)
│   ├── start_line INT   → 시작 줄
│   ├── end_line   INT   → 끝 줄
│   ├── text       TEXT  → 실제 내용 (최대 700자)
│   ├── source     TEXT  → "memory" 또는 "sessions"
│   ├── embedding  BLOB  → 벡터 데이터 (검색용)
│   └── hash       TEXT  → 변경 감지용 해시
│
├── chunks_vec 테이블 (벡터 검색용)
│   └── sqlite-vec 확장으로 코사인 유사도 계산
│
├── chunks_fts 테이블 (전문 검색용)
│   └── BM25 알고리즘으로 키워드 검색
│
└── embedding_cache 테이블 (캐시)
    └── 같은 쿼리 재요청 시 재사용
```

---

## 9. 동기화 시점 (언제 메모리를 업데이트하는가)

**파일**: [src/memory/manager.ts:207-293](openclaw_git/src/memory/manager.ts#L207-L293)

```
메모리 업데이트 트리거:

┌─────────────────────────────────────────────────┐
│ 1. 세션 시작 시                                  │
│    onSessionStart=true → 동기화 실행             │
├─────────────────────────────────────────────────┤
│ 2. 검색 전 (변경된 경우만)                       │
│    onSearch=true AND dirty=true → 동기화 실행    │
├─────────────────────────────────────────────────┤
│ 3. 파일 변경 감지 (실시간)                       │
│    MEMORY.md 수정 → 1.5초 후 자동 동기화         │
├─────────────────────────────────────────────────┤
│ 4. 주기적 동기화                                 │
│    intervalMinutes=N → N분마다 자동 동기화       │
└─────────────────────────────────────────────────┘
```

---

## 10. 핵심 파일 위치 요약

| 역할 | 파일 경로 |
|------|---------|
| 메모리 검색 도구 생성 | [src/agents/tools/memory-tool.ts](openclaw_git/src/agents/tools/memory-tool.ts) |
| 메모리 매니저 선택 | [src/memory/search-manager.ts](openclaw_git/src/memory/search-manager.ts) |
| Builtin 검색 엔진 | [src/memory/manager.ts](openclaw_git/src/memory/manager.ts) |
| 벡터 검색 | [src/memory/manager-search.ts](openclaw_git/src/memory/manager-search.ts) |
| 하이브리드 검색 결합 | [src/memory/hybrid.ts](openclaw_git/src/memory/hybrid.ts) |
| 설정 기본값 | [src/agents/memory-search.ts](openclaw_git/src/agents/memory-search.ts) |
| 메모리 파일 관리 | [src/memory/internal.ts](openclaw_git/src/memory/internal.ts) |
| 임베딩 프로바이더 | [src/memory/embeddings.ts](openclaw_git/src/memory/embeddings.ts) |
| LanceDB 플러그인 | [extensions/memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts) |
| 타입 정의 | [src/memory/types.ts](openclaw_git/src/memory/types.ts) |

---

## 11. 간단 요약 (초보자용)

OpenClaw가 메모리를 읽는 과정을 쉽게 설명하면:

1. **AI가 대화 시작** → "혹시 이 사람에 대해 아는 게 있나?" 하고 LanceDB 확인

2. **사용자 질문 도착** → AI가 판단: "이건 예전 기억이 필요하겠다"

3. **memory_search 도구 호출** → 두 가지 방법으로 동시 검색:
   - 키워드 일치 (BM25)
   - 의미 유사도 (벡터 코사인)

4. **결과 결합** → 벡터 70% + 키워드 30%로 최종 점수 계산

5. **점수 0.35 이상** 인 상위 6개 반환

6. **AI가 결과 활용** → 답변에 기억 내용 포함

7. **대화 종료 후** → 중요한 내용이 있으면 자동으로 메모리에 저장

---

*분석일: 2026-02-27*
*대상: openclaw_git 소스코드*
