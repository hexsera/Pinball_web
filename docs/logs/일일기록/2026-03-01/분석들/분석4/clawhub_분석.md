# ClawHub 분석 보고서

> 작성일: 2026-03-01
> 분석 대상: ClawHub (https://clawhub.ai) 및 OpenClaw 내 관련 코드

---

## 1. ClawHub 란 무엇인가?

**ClawHub는 OpenClaw의 공식 스킬 저장소입니다.**

쉽게 비유하자면:
- 스마트폰의 **앱스토어** 역할
- Node.js의 **npm** 역할
- Python의 **pip** 역할

OpenClaw AI 에이전트에게 새로운 능력(스킬)을 추가할 수 있는 공개 마켓플레이스입니다.

### 현재 규모 (2026년 기준)

| 항목 | 수치 |
|------|------|
| 등록된 스킬 수 | 13,729개+ |
| 총 다운로드 | 1.5백만+ |
| 스킬 카테고리 | 11개 |

### 주요 카테고리
- AI/ML (1,588개)
- Utility / 유틸리티 (1,520개)
- Development / 개발 (976개)
- Productivity / 생산성 (822개)
- 기타 (통신, 홈오토메이션, 미디어 등)

---

## 2. 스킬(Skill)이란?

스킬은 **마크다운 텍스트 파일**입니다. 컴파일된 실행 코드가 아닙니다.

```
skills/
└── my-skill/
    └── SKILL.md   ← 이 파일 하나가 스킬의 핵심
```

`SKILL.md` 파일 예시:
```markdown
---
name: clawhub
description: Use the ClawHub CLI to search, install, update skills
metadata:
  { "openclaw": { "requires": { "bins": ["clawhub"] } } }
---

# ClawHub CLI

설치:
npm i -g clawhub

검색:
clawhub search "postgres backups"

설치:
clawhub install my-skill
```

**핵심 포인트**: 스킬은 AI 에이전트에게 "이렇게 행동해라"는 **지침서(설명서)** 입니다.

---

## 3. OpenClaw + ClawHub 전체 동작 흐름

```
[사용자]
   |
   | 메시지 전송 (Telegram, Slack, Discord 등)
   ▼
[OpenClaw Gateway]
   |  포트 18789/18790 (WebSocket)
   |  세션 관리, 설정 관리, cron 실행
   ▼
[OpenClaw Agent (AI 에이전트)]
   |
   |  ① 세션 시작 시: 로컬 스킬 목록 로드
   |
   |  스킬 로드 우선순위:
   |  <workspace>/skills  (최고 우선순위)
   |       ↓
   |  ~/.openclaw/skills  (중간 우선순위)
   |       ↓
   |  bundled skills      (기본 내장 스킬, 최저 우선순위)
   |
   |  ② 시스템 프롬프트에 스킬 목록 주입 (XML 형식)
   |     예: <available_skills><skill><name>clawhub</name>
   |             <description>...</description>
   |             <location>./skills/clawhub/SKILL.md</location>
   |         </skill></available_skills>
   |
   |  ③ LLM이 관련 스킬 판단 후 SKILL.md 파일 읽기
   |
   |  ④ SKILL.md 지침에 따라 도구 실행
   |     (exec, browser, message 등)
   ▼
[결과 반환 → 사용자]
```

### ClawHub CLI 흐름

```
[사용자]
   |
   | $ clawhub search "날씨"
   ▼
[ClawHub CLI (npm 패키지)]
   |
   | 검색 요청 → https://clawhub.com API (벡터 검색)
   ▼
[ClawHub 레지스트리 서버]
   |
   | 검색 결과 반환 (스킬 목록)
   ▼
[사용자가 설치 선택]
   |
   | $ clawhub install weather
   ▼
[로컬 스킬 폴더에 다운로드]
   |
   |  ./skills/weather/SKILL.md 생성
   |  .clawhub/lock.json 업데이트
   ▼
[다음 OpenClaw 세션에서 자동 인식]
```

---

## 4. OpenClaw 소스코드 내 ClawHub 관련 파일

### 발견된 파일 목록

| 파일 경로 | 역할 |
|-----------|------|
| `skills/clawhub/SKILL.md` | ClawHub CLI 스킬 정의 |
| `src/cli/skills-cli.format.ts` | 스킬 목록 표시 형식 + ClawHub 힌트 출력 |
| `src/agents/system-prompt.ts` | 시스템 프롬프트 빌드 (스킬 섹션 포함) |
| `docs/tools/clawhub.md` | ClawHub 공식 가이드 문서 |
| `docs/tools/skills.md` | 스킬 시스템 전체 문서 |
| `docs/cli/skills.md` | 스킬 CLI 명령어 문서 |
| `docs/start/hubs.md` | 허브 시작 가이드 |
| `.github/workflows/auto-response.yml` | GitHub 자동 응답 워크플로우 |

---

## 5. 핵심 코드 분석

### 5-1. `skills/clawhub/SKILL.md` — ClawHub 스킬

이 스킬은 OpenClaw 에이전트가 ClawHub CLI를 사용할 수 있도록 가르칩니다.

```yaml
name: clawhub
requires:
  bins: ["clawhub"]   # clawhub CLI가 설치되어 있어야 사용 가능
install:
  - kind: node        # npm으로 설치
    package: clawhub
```

**동작**: 에이전트가 "새 스킬 설치해줘" 같은 요청을 받으면 이 스킬을 읽고 `clawhub install` 명령을 실행합니다.

---

### 5-2. `src/agents/system-prompt.ts` — 스킬 섹션 주입 로직

```typescript
// 스킬 섹션을 시스템 프롬프트에 추가하는 함수
function buildSkillsSection(params: {
  skillsPrompt?: string;   // 스킬 목록 XML
  isMinimal: boolean;      // 서브에이전트면 스킬 제외
  readToolName: string;    // 파일 읽기 도구 이름
}) {
  // 메인 에이전트에만 스킬 적용 (서브에이전트 제외)
  if (params.isMinimal) return [];

  return [
    "## Skills (mandatory)",
    "Before replying: scan <available_skills> <description> entries.",
    // 딱 하나의 스킬만 선택해서 읽도록 지시
    `- If exactly one skill clearly applies: read its SKILL.md...`,
    "- Never read more than one skill up front",
  ];
}
```

**쉬운 설명**: AI가 답변하기 전에 반드시 스킬 목록을 확인하고, 관련 스킬이 있으면 그 스킬의 SKILL.md를 읽어서 따르도록 강제합니다.

또한 시스템 프롬프트 문서 섹션에 ClawHub 링크가 포함됩니다:

```typescript
// 문서 섹션 (line 189)
"Find new skills: https://clawhub.com",
```

---

### 5-3. `src/cli/skills-cli.format.ts` — 스킬 상태 표시

```typescript
// 스킬 목록 출력 후 항상 ClawHub 힌트를 덧붙이는 함수
function appendClawHubHint(output: string, json?: boolean): string {
  if (json) return output;  // JSON 모드면 힌트 없음

  // 터미널 출력 마지막에 이 메시지 추가
  return `${output}\n\nTip: use \`npx clawhub\` to search, install, and sync skills.`;
}
```

**쉬운 설명**: `openclaw skills list` 명령 실행 시 스킬 목록 아래에 "npx clawhub로 스킬을 검색하고 설치하세요" 라는 안내 메시지가 자동으로 추가됩니다.

---

## 6. 스킬 필터링(게이팅) 시스템

스킬은 로드할 때 자동으로 조건 검사를 합니다:

```
스킬 파일 로드
     │
     ▼
┌─────────────────────────────────────┐
│ 조건 검사 (metadata.openclaw)        │
│                                     │
│  bins: ["clawhub"]                  │
│    → clawhub 명령이 PATH에 있는가?   │
│                                     │
│  env: ["OPENAI_API_KEY"]            │
│    → 환경변수가 설정되어 있는가?     │
│                                     │
│  os: ["darwin"]                     │
│    → macOS에서만 사용 가능?          │
│                                     │
│  config: ["browser.enabled"]        │
│    → 설정 파일의 값이 true인가?      │
└─────────────────────────────────────┘
     │
     ├─ 조건 충족 → ✓ 에이전트 프롬프트에 포함
     └─ 조건 미충족 → ✗ 제외 (에이전트가 이 스킬 모름)
```

---

## 7. 보안 이슈: ClawHavoc 사건 (2026년 초)

**배경**: ClawHub는 누구나 스킬을 올릴 수 있는 공개 플랫폼입니다.

**사건**: 2026년 2월, **341개의 악성 스킬** 발견
- 암호화폐 거래 도구로 위장
- 실제로는 macOS 악성코드(Atomic Stealer) 포함
- `SOUL.md`, `MEMORY.md` 파일을 수정해 에이전트 행동을 영구 변경

**대응**:
- VirusTotal과 파트너십으로 자동 악성코드 스캔 도입
- 3개 이상 신고 시 자동 숨김 처리
- GitHub 계정 1주 이상 된 사용자만 게시 가능

**안전 수칙**:
- 설치 전 `SKILL.md` 파일 직접 확인
- 공식 인증 스킬 우선 사용
- 정기적으로 `MEMORY.md` 내용 점검

---

## 8. ClawHub CLI 명령어 요약

```bash
# 설치
npm i -g clawhub

# 로그인 (스킬 게시할 때 필요)
clawhub login
clawhub whoami

# 검색
clawhub search "postgres backups"

# 스킬 설치
clawhub install my-skill
clawhub install my-skill --version 1.2.3

# 스킬 업데이트
clawhub update my-skill
clawhub update --all           # 전체 업데이트
clawhub update --all --force   # 강제 업데이트

# 설치된 스킬 목록
clawhub list

# 스킬 게시
clawhub publish ./my-skill \
  --slug my-skill \
  --name "My Skill" \
  --version 1.0.0 \
  --changelog "초기 버전"

# 한 번에 여러 스킬 동기화 (백업/업로드)
clawhub sync --all
```

---

## 9. 환경변수 설정

| 환경변수 | 설명 |
|----------|------|
| `CLAWHUB_SITE` | 사이트 URL 변경 (기본: https://clawhub.com) |
| `CLAWHUB_REGISTRY` | 레지스트리 API URL 변경 |
| `CLAWHUB_WORKDIR` | 기본 작업 디렉토리 변경 |
| `CLAWHUB_CONFIG_PATH` | 인증 토큰 저장 경로 변경 |
| `CLAWHUB_DISABLE_TELEMETRY=1` | 사용량 통계 수집 비활성화 |

---

## 10. 정리: OpenClaw와 ClawHub의 관계

```
OpenClaw (AI 에이전트 프레임워크)
    │
    ├─ 기본 내장 스킬 (bundled skills) ─────────────────┐
    │                                                   │
    ├─ 로컬 스킬 (~/.openclaw/skills) ──────────────────┤ 에이전트
    │                                                   │ 프롬프트에
    ├─ 워크스페이스 스킬 (<workspace>/skills) ───────────┤ 주입
    │         ▲                                         │
    │         │ clawhub install                         │
    │         │                                         │
ClawHub (https://clawhub.ai)                            │
    │                                                   │
    │  13,729개+ 커뮤니티 스킬 저장소                    │
    │  벡터 검색, 버전 관리, 평점, 신고 시스템            │
    └────────────────────────────────────────────────────┘
```

**한 줄 요약**: ClawHub는 OpenClaw 에이전트의 능력을 확장하는 스킬 마켓플레이스이며, OpenClaw 소스코드 내에 ClawHub CLI를 사용하는 스킬과 스킬 시스템 통합 코드가 포함되어 있습니다.

---

## 참고 링크

- [ClawHub 공식 사이트](https://clawhub.ai)
- [ClawHub 리소스 허브](https://clawhub.biz/)
- [OpenClaw 공식 문서](https://docs.openclaw.ai/tools/clawhub)
- [ClawHub GitHub](https://github.com/openclaw/clawhub)
- [ClawHub Top Skills 2026](https://clawoneclick.com/en/blog/clawhub-top-skills-2026)
- [OpenClaw Skills 가이드 (DigitalOcean)](https://www.digitalocean.com/resources/articles/what-are-openclaw-skills)
- [ClawHub 상세 가이드 (Apiyi)](https://help.apiyi.com/en/clawhub-ai-openclaw-skills-registry-guide-en.html)
