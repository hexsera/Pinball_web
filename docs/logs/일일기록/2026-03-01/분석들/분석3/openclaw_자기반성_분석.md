# OpenClaw 자기반성 분석 보고서

> 분석자: 20년차 프로그래머 관점 / 초보자도 이해할 수 있도록 설명
> 작성일: 2026-02-28
> 분석 대상: `openclaw_git/` 소스코드

---

## 핵심 질문에 대한 답변

### Q: OpenClaw에 "스스로 알아낸 것과 실수를 기록"하라는 지시가 있는가?

**있습니다.** 단, 직접적인 "자기반성"이라는 단어는 없고,
**MEMORY.md 시스템** + **compaction(요약 압축)** 이라는 두 메커니즘으로 구현되어 있습니다.

---

## 전체 코드 동작 흐름도

```
사용자 메시지 도착
        |
        v
[채널 레이어] (Telegram/Discord/Signal 등)
        |
        v
[게이트웨이 서버] src/gateway/
  - 세션 관리
  - 메시지 라우팅
        |
        v
[에이전트 실행] src/agents/pi-embedded-runner.ts
  - 시스템 프롬프트 생성 ──────────────────────────────┐
  - AI 모델 호출 (Claude/GPT 등)                        |
  - 도구 실행 (exec, read, write...)                     |
        |                                              |
        v                                             v
[도구 실행 레이어]                         [시스템 프롬프트 빌더]
  src/agents/tools/                        src/agents/system-prompt.ts
  - memory_search (기억 검색)               - ## Memory Recall 섹션 포함
  - memory_get    (기억 읽기)               - ## Skills 섹션 포함
  - exec          (명령 실행)               - ## Tooling 섹션 포함
  - read/write    (파일 읽기/쓰기)                       |
        |                                              |
        v                                             |
[메모리 시스템] src/memory/                           |
  - MEMORY.md 파일 감시/색인                           |
  - 벡터 임베딩 (SQLite 저장)             <────────────┘
  - 의미론적 검색 (Semantic Search)
        |
        v
[Compaction] src/agents/compaction.ts
  - 대화가 너무 길어지면 AI가 요약
  - "결정사항, TODO, 미해결 질문, 제약조건" 보존
        |
        v
[최종 응답 → 사용자]
```

---

## 자기반성 관련 코드 위치별 상세 분석

### 1. 시스템 프롬프트의 Memory Recall 지시

**파일**: `src/agents/system-prompt.ts` (44~70번째 줄)

```typescript
// 시스템 프롬프트에 삽입되는 텍스트
"## Memory Recall",
"Before answering anything about prior work, decisions, dates, people, preferences, or todos:
 run memory_search on MEMORY.md + memory/*.md; then use memory_get to pull only the needed lines.
 If low confidence after search, say you checked."
```

**초보자용 설명:**
에이전트(AI)가 사용자 질문에 답하기 **전에** 무조건 과거 기록을 검색하도록
강제하는 "지시문"이 시스템 프롬프트에 내장되어 있습니다.
마치 선생님이 "시험 보기 전에 반드시 노트 확인해라"라고 말하는 것처럼요.

---

### 2. MEMORY.md - 기억/발견사항 저장소

**파일**: `src/memory/internal.ts` (48~57번째 줄)

```typescript
export function isMemoryPath(relPath: string): boolean {
  const normalized = normalizeRelPath(relPath);
  if (normalized === "MEMORY.md" || normalized === "memory.md") {
    return true;
  }
  return normalized.startsWith("memory/");
}
```

**초보자용 설명:**
`MEMORY.md` 파일과 `memory/` 폴더가 **기억 저장소** 역할을 합니다.
AI가 "스스로 알아낸 것"을 여기에 직접 파일로 씁니다.
(파일 쓰기 도구 `write`로 MEMORY.md를 업데이트)

---

### 3. Memory Search 도구 - 의무적 기억 검색

**파일**: `src/agents/tools/memory-tool.ts` (52~54번째 줄)

```typescript
description:
  "Mandatory recall step: semantically search MEMORY.md + memory/*.md
   (and optional session transcripts) before answering questions about
   prior work, decisions, dates, people, preferences, or todos"
```

**중요 키워드: `Mandatory` (의무적)**
이 도구 설명에 "의무적"이라고 명시되어 있습니다.
AI가 "이전 실수"나 "배운 것"을 검색하는 것이 선택이 아니라 필수입니다.

---

### 4. Compaction - 대화 자동 요약 (핵심 자기반성 메커니즘)

**파일**: `src/agents/compaction.ts` (16~18번째 줄)

```typescript
const MERGE_SUMMARIES_INSTRUCTIONS =
  "Merge these partial summaries into a single cohesive summary. Preserve decisions, " +
  "TODOs, open questions, and any constraints.";
```

**초보자용 설명:**
대화가 너무 길어지면 AI가 자동으로 "요약"을 만듭니다.
이 때 **보존해야 할 항목**이 코드에 명시되어 있습니다:
- `decisions` (결정사항)
- `TODOs` (해야 할 일)
- `open questions` (미해결 질문)
- `constraints` (제약조건)

이것이 사실상 **"무엇을 배웠는지"** 기록하는 자기반성의 핵심입니다.

---

### 5. Bootstrap Files - 세션 시작 시 기억 로드

**파일**: `src/agents/bootstrap-files.ts`

```typescript
export async function resolveBootstrapContextForRun(params) {
  const bootstrapFiles = await resolveBootstrapFilesForRun(params);
  const contextFiles = buildBootstrapContextFiles(bootstrapFiles, {
    maxChars: resolveBootstrapMaxChars(params.config),
    ...
  });
  return { bootstrapFiles, contextFiles };
}
```

**초보자용 설명:**
에이전트가 새 대화를 시작할 때 워크스페이스의 파일들을
자동으로 컨텍스트(기억)에 포함시킵니다.
MEMORY.md도 이 bootstrap 파일에 포함될 수 있어
"이전 세션에서 배운 것"을 다음 세션에서도 활용합니다.

---

### 6. Memory Sync - 실시간 기억 동기화

**파일**: `src/agents/memory-search.ts` (214~233번째 줄)

```typescript
sync: {
  onSessionStart: true,   // 세션 시작 시 동기화
  onSearch: true,         // 검색할 때마다 동기화
  watch: true,            // 파일 변경 감시
  intervalMinutes: 0,     // 주기적 동기화
}
```

**초보자용 설명:**
MEMORY.md 파일이 변경되면 자동으로 메모리 인덱스가 업데이트됩니다.
AI가 파일을 수정하는 즉시 다음 검색에서 반영됩니다.

---

### 7. AGENTS.md - 에이전트 행동 지침 (자기반성 방식 명시)

**파일**: `AGENTS.md` (155~170번째 줄)

```markdown
## Agent-Specific Notes
- When answering questions, respond with high-confidence answers only:
  verify in code; do not guess.
- Bug investigations: read source code of relevant npm dependencies and
  all related local code before concluding; aim for high-confidence root cause.
- Never edit `node_modules`... Skill notes go in `tools.md` or `AGENTS.md`.
```

**초보자용 설명:**
에이전트가 따라야 할 "행동 규칙"이 문서화되어 있고,
"추측하지 말고 코드로 검증하라"는 지침은
실수를 예방하는 일종의 자기반성 규칙입니다.

---

## 자기반성 로직 존재 여부 정리

| 기능 | 파일 위치 | 설명 |
|------|-----------|------|
| **기억 저장소** | `MEMORY.md`, `memory/` 폴더 | 스스로 알아낸 것 저장 |
| **의무적 기억 검색** | `src/agents/tools/memory-tool.ts` | 답변 전 반드시 과거 검색 |
| **시스템 프롬프트 지시** | `src/agents/system-prompt.ts` | "Memory Recall" 섹션 내장 |
| **대화 요약 (자기반성)** | `src/agents/compaction.ts` | 결정/TODO/실수 보존 |
| **세션 시작 시 기억 로드** | `src/agents/bootstrap-files.ts` | 이전 기억 자동 주입 |
| **실시간 파일 감시** | `src/agents/memory-search.ts` | 기억 변경 즉시 반영 |
| **행동 지침 문서** | `AGENTS.md` | 실수 방지 규칙 명시 |

---

## 결론

OpenClaw는 **"자기반성"을 직접적으로 명시하지는 않지만**,
코드 구조 상 아래 세 가지 방식으로 구현하고 있습니다:

1. **MEMORY.md 파일 시스템**: AI가 스스로 기억을 파일로 기록
2. **Compaction 요약**: 긴 대화에서 결정사항/실수를 자동 추출 보존
3. **의무적 메모리 검색**: 답변 전 항상 과거 기억 확인 강제

이는 마치 **"업무 일지를 매일 쓰고, 새 업무 시작 전에 반드시 읽어보는 직원"**과
동일한 패턴입니다. 코드로 이 패턴을 강제하는 것이 OpenClaw의 자기반성 메커니즘입니다.
