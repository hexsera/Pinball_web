# OpenClaw 스택 및 패키지 분석 보고서

> 20년차 프로그래머의 시각으로, 코딩 초보자도 이해할 수 있게 분석합니다.

---

## 1. OpenClaw란 무엇인가?

OpenClaw는 **멀티 플랫폼 AI 비서 오픈소스 프로젝트**입니다.

쉽게 말하면: "카카오톡, 텔레그램, 디스코드, 슬랙 등 다양한 메신저에서 AI와 대화할 수 있게 해주는 게이트웨이(중간 연결 다리)"입니다.

---

## 2. 전체 코드 동작 흐름도

```
[ 사용자 ]
    |
    | (메시지 전송)
    v
[ 메신저 채널 ]
  Telegram / Discord / Slack / WhatsApp / iMessage / LINE / Signal 등
    |
    | (봇이 메시지 수신)
    v
[ OpenClaw Gateway (게이트웨이 서버) ]
  - WebSocket으로 연결 관리
  - 인증, 세션, 설정 처리
  - 포트: 18789 / 18790
    |
    | (AI 처리 요청)
    v
[ Agent Layer (에이전트 레이어) ]
  - 멀티 에이전트 조율
  - 서브에이전트 생성/관리
  - 스킬(기능) 선택
    |
    | (모델 호출)
    v
[ AI 모델 제공자 ]
  Anthropic (Claude) / OpenAI / Google Gemini / Bedrock / Ollama 등
    |
    | (AI 응답 반환)
    v
[ 응답 처리 ]
  - 텍스트 포맷팅
  - 미디어 처리 (이미지/음성/영상)
  - TTS (텍스트 → 음성 변환)
    |
    | (메시지 전송)
    v
[ 사용자에게 답장 ]

===== 부가 기능 흐름 =====

[ Skills / Extensions / Plugins ]
  - GitHub, Notion, Todoist, Spotify 등 외부 서비스 연동
  - 브라우저 자동화 (Playwright)
  - 정기 작업 스케줄러 (Cron)
  - 메모리 시스템 (대화 기억)
```

---

## 3. 핵심 기술 스택

### 프로그래밍 언어

| 언어 | 용도 |
|------|------|
| **TypeScript** | 메인 백엔드 코드 (ESM 방식) |
| **Swift** | macOS / iOS 앱 |
| **Kotlin** | Android 앱 |
| **Shell Script** | 빌드/배포 자동화 |

> **TypeScript란?** JavaScript에 "타입(변수 종류 명시)"을 추가한 언어입니다. 에러를 미리 잡을 수 있어 대형 프로젝트에서 많이 씁니다.

---

### 실행 환경

| 도구 | 역할 | 설명 |
|------|------|------|
| **Node.js 22+** | 서버 실행 환경 | JavaScript/TypeScript를 서버에서 실행하게 해주는 엔진 |
| **Bun** | 빠른 패키지 설치/실행 | Node.js보다 빠른 대안 런타임 |
| **Docker / Podman** | 컨테이너 | 프로그램을 격리된 박스에 담아 어디서나 동일하게 실행 |

---

### 패키지 관리

| 도구 | 설명 |
|------|------|
| **pnpm 10.23.0** | 빠르고 효율적인 패키지 매니저 (npm의 업그레이드 버전) |
| **pnpm workspace** | 모노레포 구조 (여러 패키지를 하나의 저장소에서 관리) |

---

## 4. 주요 의존성 패키지 상세

### AI 코어 엔진

| 패키지 | 버전 | 역할 |
|--------|------|------|
| `@mariozechner/pi-agent-core` | 0.54.1 | AI 에이전트 핵심 엔진 |
| `@mariozechner/pi-ai` | 0.54.1 | AI 모델 통신 레이어 |
| `@mariozechner/pi-coding-agent` | 0.54.1 | 코딩 전용 에이전트 |
| `@mariozechner/pi-tui` | 0.54.1 | 터미널 UI 엔진 |
| `@agentclientprotocol/sdk` | 0.14.1 | 에이전트-클라이언트 통신 프로토콜 |

> **pi-agent란?** OpenClaw가 실제로 AI와 대화하는 부분입니다. OpenRouter API를 통해 다양한 AI 모델(Claude, GPT 등)을 불러서 쓸 수 있습니다.

---

### 메신저 채널 연동 패키지

| 패키지 | 채널 | 역할 |
|--------|------|------|
| `grammy` | Telegram | Telegram 봇 라이브러리 |
| `@grammyjs/runner` | Telegram | Telegram 비동기 처리 |
| `@slack/bolt` | Slack | Slack 앱 프레임워크 |
| `@slack/web-api` | Slack | Slack REST API |
| `@buape/carbon` | Discord | Discord 봇 라이브러리 |
| `@discordjs/voice` | Discord | Discord 음성 채널 |
| `@whiskeysockets/baileys` | WhatsApp | WhatsApp 웹 연결 |
| `@line/bot-sdk` | LINE | LINE 메신저 SDK |
| `@larksuiteoapi/node-sdk` | Feishu | 飞书(페이슈) 연동 |

---

### 미디어 처리 패키지

| 패키지 | 역할 |
|--------|------|
| `sharp` | 이미지 변환/리사이징 |
| `playwright-core` | 브라우저 자동화 (웹 스크래핑, 스크린샷) |
| `pdfjs-dist` | PDF 파일 읽기/처리 |
| `node-edge-tts` | 텍스트 → 음성 변환 (Edge TTS) |
| `opusscript` | 오디오 코덱 처리 |
| `@mozilla/readability` | 웹 페이지 본문 추출 |
| `file-type` | 파일 종류 감지 |

---

### 서버/네트워크 패키지

| 패키지 | 역할 |
|--------|------|
| `express 5` | HTTP 웹 서버 프레임워크 |
| `ws` | WebSocket 서버 (실시간 통신) |
| `undici` | HTTP 클라이언트 (빠른 fetch 구현) |
| `https-proxy-agent` | HTTPS 프록시 지원 |
| `@homebridge/ciao` | mDNS (로컬 네트워크 서비스 검색) |

> **WebSocket이란?** 실시간으로 서버↔클라이언트가 데이터를 주고받는 기술입니다. 채팅처럼 즉각적인 응답이 필요할 때 씁니다.

---

### 스케줄링/자동화

| 패키지 | 역할 |
|--------|------|
| `croner` | Cron 스케줄러 (정해진 시간에 자동 실행) |
| `chokidar` | 파일 변경 감지 (Watch) |

---

### 데이터 처리

| 패키지 | 역할 |
|--------|------|
| `zod` | 데이터 형태 검증 (유효성 검사) |
| `@sinclair/typebox` | JSON 스키마 타입 정의 |
| `yaml` | YAML 파일 파싱 |
| `json5` | 주석 있는 JSON 파싱 |
| `ajv` | JSON Schema 검증 |
| `sqlite-vec` | SQLite + 벡터 검색 (메모리 시스템용) |
| `jszip` | ZIP 파일 처리 |

---

### CLI 인터페이스

| 패키지 | 역할 |
|--------|------|
| `commander` | CLI 명령어 파싱 (`openclaw gateway`, `openclaw agent` 등) |
| `@clack/prompts` | 예쁜 인터랙티브 CLI 프롬프트 |
| `chalk` | 터미널 색상 출력 |
| `cli-highlight` | 코드 하이라이팅 |
| `qrcode-terminal` | QR코드 터미널 출력 (기기 페어링용) |

---

### 기타 유틸리티

| 패키지 | 역할 |
|--------|------|
| `dotenv` | `.env` 환경변수 파일 로드 |
| `markdown-it` | Markdown → HTML 변환 |
| `linkedom` | 서버사이드 DOM 파싱 |
| `jiti` | TypeScript 파일 즉시 실행 |
| `long` | 64비트 정수 처리 |
| `tar` | tar 파일 압축/해제 |
| `ipaddr.js` | IP 주소 처리 |

---

## 5. 개발 도구 (devDependencies)

| 도구 | 역할 |
|------|------|
| **TypeScript 5.9** | 타입 검사 및 컴파일 |
| **tsdown** | 빠른 TypeScript 번들러 |
| **tsx** | TypeScript 즉시 실행 (개발용) |
| **Vitest** | 테스트 프레임워크 |
| **Oxlint** | 빠른 JavaScript 린터 (코드 품질 검사) |
| **Oxfmt** | 코드 포매터 (자동 코드 정렬) |
| **Lit** | Web Components 라이브러리 (UI용) |
| **SwiftLint / SwiftFormat** | Swift 코드 품질 관리 (iOS/macOS) |

---

## 6. 클라우드/배포 환경

| 플랫폼 | 설정 파일 | 설명 |
|--------|----------|------|
| **Docker** | `Dockerfile`, `docker-compose.yml` | 컨테이너 배포 |
| **Fly.io** | `fly.toml` | 클라우드 PaaS 배포 |
| **Render** | `render.yaml` | 클라우드 배포 플랫폼 |
| **GitHub Actions** | `.github/workflows/` | CI/CD 자동화 |

---

## 7. AI 모델 제공자 (지원 목록)

```
OpenClaw가 연결 가능한 AI 서비스들:

├── Anthropic (Claude)       ← 가장 많이 사용
├── OpenAI (GPT)
├── Google Gemini
├── AWS Bedrock
├── Ollama (로컬 AI)
├── GitHub Copilot
├── Google Gemini CLI
├── Qwen (알리바바)
├── MiniMax
├── Hugging Face
├── Cloudflare AI Gateway
├── ByteDance (Doubao)
├── Together AI
├── Venice AI
└── OpenRouter (중간 집계 API)
```

---

## 8. 확장 플러그인 시스템 (38개)

OpenClaw는 플러그인 구조로 기능을 확장합니다.

### 메신저 채널 플러그인 (22개)
```
Telegram, Discord, Slack, WhatsApp, iMessage, Signal,
LINE, Matrix, Mattermost, IRC, Teams, Google Chat,
Feishu, Synology Chat, Nextcloud Talk, Twitch,
Nostr, Zalo, BlueBubbles, Tlon, Talk-Voice, Zalouser
```

### 메모리/저장 플러그인
- `memory-core`: 메모리 핵심 인터페이스
- `memory-lancedb`: **LanceDB** 기반 벡터 메모리 (AI가 대화 내용을 기억하는 데이터베이스)

### 기타 주요 플러그인
- `voice-call`: 음성 통화 (Twilio, Plivo, Telnyx 지원)
- `copilot-proxy`: GitHub Copilot 프록시
- `diagnostics-otel`: OpenTelemetry 모니터링
- `llm-task`: LLM 작업 처리
- `device-pair`: 기기 페어링 (QR코드 인증)

---

## 9. 커뮤니티 스킬 시스템 (54개)

스킬은 AI가 실제로 할 수 있는 "행동들"입니다.

```
생산성: Notion, Obsidian, Trello, Todoist, Bear Notes, Things 3
개발:   GitHub, Tmux, Coding Agent, Lobster 스크립트
미디어: 이미지 생성(OpenAI), 음성인식(Whisper), PDF, 비디오 프레임
통신:   이메일(Himalaya), iMessage, WhatsApp CLI
홈:     Philips Hue 조명, Sonos 스피커, 에어컨
음악:   Spotify, 음악인식
AI:     Google Gemini, BananaML
```

---

## 10. 네이티브 앱

| 플랫폼 | 기술 스택 |
|--------|----------|
| **macOS** | SwiftUI, 메뉴바 앱, Canvas 호스트 |
| **iOS** | SwiftUI, Xcode, 대화 노드 |
| **Android** | Gradle, Kotlin, 대화 노드 |

---

## 11. 프로젝트 구조 한눈에 보기

```
openclaw/
├── src/                    ← 핵심 TypeScript 소스
│   ├── cli/                ← 터미널 명령어 처리
│   ├── gateway/            ← 메인 서버 (WebSocket)
│   ├── agents/             ← AI 에이전트 로직
│   ├── sessions/           ← 대화 세션 관리
│   ├── channels/           ← 채널 공통 로직
│   ├── providers/          ← AI 모델 연결
│   ├── telegram/           ← Telegram 봇
│   ├── discord/            ← Discord 봇
│   ├── slack/              ← Slack 앱
│   ├── browser/            ← Playwright 브라우저 자동화
│   ├── media/              ← 미디어 처리 (이미지/오디오/영상)
│   ├── memory/             ← 메모리 시스템
│   ├── tts/                ← 텍스트→음성 변환
│   ├── cron/               ← 정기 작업
│   └── tui/                ← 터미널 UI
├── extensions/             ← 공식 플러그인 (38개)
├── skills/                 ← 커뮤니티 스킬 (54개)
├── apps/
│   ├── macos/              ← macOS 앱 (Swift)
│   ├── ios/                ← iOS 앱 (Swift)
│   └── android/            ← Android 앱 (Kotlin)
├── packages/               ← 내부 패키지
├── docs/                   ← 공식 문서
├── Dockerfile              ← Docker 이미지 설정
└── package.json            ← 프로젝트 설정 및 의존성 목록
```

---

## 12. 요약 정리

| 항목 | 내용 |
|------|------|
| **언어** | TypeScript (메인), Swift (iOS/macOS), Kotlin (Android) |
| **런타임** | Node.js 22+, Bun |
| **패키지 매니저** | pnpm 10.23.0 |
| **빌드 도구** | tsdown, tsx |
| **테스트** | Vitest |
| **린터/포매터** | Oxlint, Oxfmt |
| **서버** | Express 5, WebSocket (ws) |
| **컨테이너** | Docker, Podman |
| **AI 코어** | @mariozechner/pi-agent (OpenRouter 기반) |
| **지원 AI** | Claude, GPT, Gemini, Bedrock, Ollama 등 14+ |
| **지원 채널** | Telegram, Discord, Slack, WhatsApp, iMessage 등 22+ |
| **총 버전** | 2026.2.23 (날짜 기반 버전 관리) |
