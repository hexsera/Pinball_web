# ClawHub 스킬 탐색 메커니즘 분석

> **분석 목표**: clawhub.ai에서 스킬을 찾을 때 어떻게 관련 스킬을 발견하는지 코드 레벨로 설명합니다.

---

## 1. ClawHub란?

ClawHub(https://clawhub.ai/)는 OpenClaw AI 에이전트를 위한 **공식 스킬 레지스트리(저장소)**입니다.
쉽게 비유하면, 스마트폰의 "앱 스토어"와 같은 개념입니다 — 앱 대신 "스킬"을 설치합니다.

- 현재 **3,000개 이상**의 스킬이 등록되어 있습니다.
- 스킬은 마크다운(`.md`) 형식의 `SKILL.md` 파일 하나로 구성됩니다.

---

## 2. 전체 흐름도 (아스키아트)

```
사용자가 검색어 입력
       │
       ▼
  npx clawhub search "calendar management"
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                   ClawHub 백엔드                      │
│                                                      │
│  검색어 → OpenAI API (text-embedding-3-small)         │
│              │                                       │
│              ▼                                       │
│        숫자 벡터 생성 (임베딩)                          │
│        예: [0.23, -0.51, 0.88, ...]                  │
│              │                                       │
│              ▼                                       │
│        Convex DB (벡터 검색)                          │
│        "비슷한 의미를 가진 스킬 찾기"                    │
│              │                                       │
│              ▼                                       │
│        유사도 높은 스킬 목록 반환                        │
│        (별점, 다운로드 수 기반 랭킹 적용)                 │
└──────────────────────────────────────────────────────┘
       │
       ▼
  사용자 화면에 스킬 목록 표시
       │
       ▼
  설치 선택 → npx clawhub install <skill-name>
       │
       ▼
  로컬 ~/.config/openclaw/skills/ 에 SKILL.md 복사
       │
       ▼
  OpenClaw 에이전트가 스킬 자동 감지 및 활성화
```

---

## 3. ClawHub 검색의 핵심 기술: 벡터 검색 (Vector Search)

### 키워드 검색 vs 벡터 검색 비교

| 방식 | 키워드 검색 | 벡터 검색 (ClawHub) |
|------|------------|-------------------|
| 동작 | 단어 그대로 일치 검색 | **의미**로 검색 |
| 예시 | "calendar"로 검색 시 "calendar"가 포함된 스킬만 반환 | "일정 관리"로 검색해도 "Google Calendar", "Apple Reminders" 스킬 반환 |
| 장점 | 빠르고 단순 | 비슷한 개념의 스킬도 발견 가능 |
| 단점 | 정확한 단어를 알아야 함 | 약간 느림 |

### 기술 스택

```
검색 기술 스택
├── OpenAI text-embedding-3-small  ← 텍스트를 숫자 벡터로 변환
├── Convex DB (Vector Search)      ← 벡터 유사도 계산 및 검색
└── TanStack Start (React)         ← 웹 프론트엔드
```

### 벡터(임베딩)란?

"날씨 앱"이라는 검색어를 컴퓨터가 이해할 수 있는 숫자 배열로 변환하는 것입니다.

```
"날씨 앱"   → [0.23, -0.51, 0.88, 0.12, ...]  (수천 개의 숫자)
"weather"  → [0.21, -0.49, 0.90, 0.11, ...]  (비슷한 숫자!)

∴ "날씨 앱" 검색 → "weather" 스킬도 발견됨!
```

---

## 4. OpenClaw 내부에서 스킬이 발견되는 방법

ClawHub에서 설치된 스킬이 OpenClaw에서 어떻게 인식되는지 코드로 확인합니다.

### 4-1. 스킬 탐색 디렉토리 우선순위

[src/agents/skills/workspace.ts](openclaw_git/src/agents/skills/workspace.ts) 파일에서:

```
스킬 로드 우선순위 (낮음 → 높음)
1. openclaw-extra     ← 사용자 설정 추가 디렉토리
2. openclaw-bundled   ← OpenClaw 기본 내장 스킬
3. openclaw-managed   ← ~/.config/openclaw/skills/ (ClawHub 설치 위치)
4. agents-skills-personal ← ~/.agents/skills/
5. agents-skills-project  ← 프로젝트/.agents/skills/
6. openclaw-workspace     ← 워크스페이스/skills/ (최우선)
```

> 같은 이름의 스킬이 있으면 **우선순위가 높은 것**이 덮어씁니다.

### 4-2. 스킬 인식 기준

각 디렉토리 내에서 `SKILL.md` 파일이 있는 폴더만 스킬로 인식합니다.

```
~/.config/openclaw/skills/
    ├── weather/
    │   └── SKILL.md  ← ✅ 스킬로 인식
    ├── github/
    │   └── SKILL.md  ← ✅ 스킬로 인식
    └── random-folder/
        └── README.md ← ❌ 스킬 아님 (SKILL.md 없음)
```

### 4-3. SKILL.md 프론트매터 (메타데이터)

각 SKILL.md 파일의 맨 위에는 YAML 형식의 메타데이터가 있습니다:

```yaml
---
openclaw:
  emoji: 🌤️
  homepage: https://github.com/example/weather-skill
  primaryEnv: WEATHER_API_KEY
  requires:
    bins: [curl]        # 필요한 프로그램
    env: [WEATHER_API_KEY]  # 필요한 환경변수
  install:
    - kind: node        # 설치 방법
      package: weather-cli
---
# Weather Skill
날씨를 알려드립니다...
```

### 4-4. 스킬 적격성 검사 (Eligibility Check)

스킬이 "사용 가능"한지 확인하는 조건:

```
스킬 사용 가능 여부 판단
├── ✅ 필요한 바이너리(bins)가 설치되어 있는가?
│   예: curl, ffmpeg 등
├── ✅ 필요한 환경변수가 설정되어 있는가?
│   예: WEATHER_API_KEY
├── ✅ 현재 OS와 호환되는가?
│   예: macOS 전용 스킬은 Linux에서 비활성화
├── ✅ 허용 목록(allowlist)에서 차단되지 않았는가?
└── ✅ 수동으로 비활성화되지 않았는가?
```

### 4-5. AI가 스킬을 찾는 방법 (시스템 프롬프트)

[src/agents/system-prompt.ts](openclaw_git/src/agents/system-prompt.ts)에서:

```
AI 에이전트에게 주어지는 스킬 사용 지침:
─────────────────────────────────────────
## Skills (mandatory)
Before replying: scan <available_skills> <description> entries.
- If exactly one skill clearly applies: read its SKILL.md, then follow it.
- If multiple could apply: choose the most specific one, then read/follow it.
- If none clearly apply: do not read any SKILL.md.
Constraints: never read more than one skill up front; only read after selecting.
─────────────────────────────────────────
```

> 즉, AI가 사용자 메시지를 받으면 **먼저 사용 가능한 스킬 목록을 스캔**하고,
> 관련 스킬이 있으면 해당 SKILL.md를 읽어서 지시를 따릅니다.

---

## 5. 스킬 프롬프트 생성 흐름

```
loadWorkspaceSkillEntries()
      │ 모든 디렉토리에서 SKILL.md 읽기
      ▼
filterSkillEntries()
      │ 요구사항 미충족 스킬 제거
      │ 비활성화된 스킬 제거
      ▼
applySkillsPromptLimits()
      │ 최대 150개 스킬로 제한
      │ 최대 30,000자로 제한 (토큰 절약)
      ▼
formatSkillsForPrompt()
      │ AI가 읽을 수 있는 텍스트 형식으로 변환
      ▼
buildAgentSystemPrompt()
      │ 시스템 프롬프트에 스킬 목록 포함
      ▼
AI 에이전트 실행
```

---

## 6. CLI 사용자 인터페이스

[src/cli/skills-cli.format.ts](openclaw_git/src/cli/skills-cli.format.ts)에서 확인:

```bash
# 설치된 스킬 목록 보기
openclaw skills list

# 출력 예시:
# Skills (3/5 ready)
# ─────────────────────────────────────────────────
# Status   Skill        Description            Source
# ✓ ready  🌤️ weather  날씨 정보 제공          openclaw-managed
# ✓ ready  📁 github   GitHub 통합             openclaw-managed
# ✗ miss   🎵 spotify  Spotify 제어           openclaw-managed (bins: spotify missing)
# ─────────────────────────────────────────────────
# Tip: use `npx clawhub` to search, install, and sync skills.

# 특정 스킬 상세 정보
openclaw skills info weather

# 스킬 상태 전체 점검
openclaw skills check
```

---

## 7. 스킬 설치 흐름 (ClawHub → OpenClaw)

```
사용자
  │
  ├─[1]─ npx clawhub search "spotify"
  │           │
  │           ▼
  │      ClawHub 서버에서 벡터 검색
  │      → "spotify-player" 스킬 발견
  │
  ├─[2]─ npx clawhub install spotify-player
  │           │
  │           ▼
  │      GitHub에서 SKILL.md 다운로드
  │      → ~/.config/openclaw/skills/spotify-player/SKILL.md 저장
  │
  └─[3]─ openclaw 재시작 (자동 감지)
              │
              ▼
         loadWorkspaceSkillEntries() 실행
         → 새 스킬 발견 및 로드
         → AI 시스템 프롬프트에 추가
         → 이제 "스포티파이 틀어줘" 명령 가능!
```

---

## 8. 요약

| 단계 | 동작 | 사용 기술 |
|------|------|---------|
| **ClawHub 검색** | 자연어 쿼리를 벡터로 변환 | OpenAI text-embedding-3-small |
| **유사 스킬 탐색** | 벡터 유사도 계산 | Convex Vector Search |
| **랭킹** | 별점, 다운로드 수 기반 정렬 | Convex DB |
| **설치** | SKILL.md를 로컬에 저장 | npx clawhub CLI |
| **스킬 인식** | SKILL.md 파일 존재 여부 확인 | Node.js fs module |
| **적격성 검사** | 요구사항(bins, env, os) 충족 확인 | OpenClaw 내부 로직 |
| **AI 활용** | 시스템 프롬프트에 스킬 목록 포함 | @mariozechner/pi-coding-agent |
| **스킬 실행** | AI가 SKILL.md 내용을 읽고 지시 수행 | Claude AI |

---

## 참고 자료

- [ClawHub 공식 문서](https://docs.openclaw.ai/tools/clawhub)
- [ClawHub GitHub 레지스트리](https://github.com/openclaw/clawhub)
- [ClawHub 웹사이트](https://clawhub.ai/)
- 소스코드: [src/agents/skills/workspace.ts](openclaw_git/src/agents/skills/workspace.ts)
- 소스코드: [src/agents/system-prompt.ts](openclaw_git/src/agents/system-prompt.ts)
- 소스코드: [src/cli/skills-cli.format.ts](openclaw_git/src/cli/skills-cli.format.ts)

---

## 9. 임베딩 검색 정보 출처 및 원문

이 문서에서 "벡터 검색(임베딩)" 관련 내용은 두 곳에서 가져왔습니다.

---

### 출처 1: ClawHub GitHub README

**URL**: https://github.com/openclaw/clawhub

**원문 인용 (영어)**:

> "Search: OpenAI embeddings (`text-embedding-3-small`) + Convex vector search."

> "Search via embeddings (vector index) instead of brittle keywords"

> "designed for fast browsing + a CLI-friendly API, with moderation hooks and vector search."

> `OPENAI_API_KEY` — "embeddings for search + indexing."

**내용 설명**:

| 인용 | 의미 |
|------|------|
| `text-embedding-3-small` | OpenAI가 제공하는 임베딩 모델 이름. 텍스트를 벡터(숫자 배열)로 변환한다. |
| `Convex vector search` | Convex라는 서버리스 DB의 벡터 유사도 검색 기능. 변환된 벡터끼리 비교해서 가장 비슷한 것을 찾아준다. |
| `instead of brittle keywords` | "깨지기 쉬운 키워드 대신"이라는 뜻. 키워드 방식은 정확한 단어를 입력해야 하지만 임베딩은 의미가 비슷하면 찾아준다. |
| `OPENAI_API_KEY` 환경변수 필요 | 임베딩 생성을 위해 OpenAI API를 실제로 호출한다는 의미. 즉 단순 구현이 아닌 실제 외부 API 연동. |

---

### 출처 2: OpenClaw 공식 문서 (ClawHub 페이지)

**URL**: https://docs.openclaw.ai/tools/clawhub

**원문 인용 (영어)**:

> "**Search** powered by embeddings (vector search), not just keywords."

> "The registry indexes the skill for search and discovery."

> "Discover skills by name, tags, or search."

**내용 설명**:

| 인용 | 의미 |
|------|------|
| `powered by embeddings (vector search), not just keywords` | 검색 엔진이 임베딩 기반 벡터 검색으로 동작하며 단순 키워드 검색이 아님을 명시. |
| `The registry indexes the skill` | 스킬이 등록될 때 내용을 분석해서 벡터 인덱스에 저장한다는 뜻. 나중에 빠른 검색을 위한 사전 작업. |
| `Discover skills by name, tags, or search` | 세 가지 탐색 방법을 제공: ① 이름 직접 검색, ② 태그 브라우징, ③ 자연어 검색. |

---

### 정보 신뢰도 평가

| 항목 | 평가 |
|------|------|
| GitHub README (공식 저장소) | ✅ 1차 출처 — 개발팀이 직접 작성 |
| OpenClaw 공식 문서 | ✅ 1차 출처 — 공식 문서 사이트 |
| 실제 소스코드 확인 여부 | ⚠️ ClawHub 백엔드 코드는 비공개 — README와 문서로만 확인 가능 |

> **주의**: ClawHub의 백엔드 코드(Convex 함수, 임베딩 생성 로직)는 공개된 소스코드로 직접 확인하지 못했습니다. 위 정보는 공식 문서와 README 기준입니다.
