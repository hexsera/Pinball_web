# OpenClaw 파일 구조 가이드

> AI 비서가 목표 파일을 빠르게 찾을 수 있도록 작성된 파일 디렉토리 가이드입니다.

---

## 프로젝트 개요

OpenClaw는 멀티 플랫폼 AI 비서 오픈소스 프로젝트입니다.
- **기술 스택**: TypeScript (ESM), Node.js 22+, Bun, pnpm 10.23.0
- **AI 코어**: `@mariozechner/pi-agent` (OpenRouter API 기반)
- **컨테이너**: Docker / Podman
- **테스트**: Vitest
- **빌드**: tsdown, Oxlint/Oxfmt

---

## 루트 레벨 파일 (프로젝트 루트)

| 파일 | 역할 |
|------|------|
| `README.md` | Docker 설치 및 사용 가이드 (빠른 설치, 수동 설치, 환경변수 설정, 메시징 채널 연동) |
| `docker-compose.yml` | Docker 서비스 정의 (`openclaw-gateway` 포트 18789/18790, `openclaw-cli`) |
| `docker-setup.sh` | Docker 자동 설치 스크립트 (요구사항 확인, 디렉토리 생성, 토큰 생성, 이미지 빌드) |
| `.env` | 실제 환경변수 파일 (로컬, git 무시) |
| `.env.example` | 환경변수 템플릿 (OPENCLAW_IMAGE, GATEWAY_TOKEN, CONFIG_DIR 등) |
| `탐구.md` | 이 FILE_README.md 생성 지시사항 |

---

## `/openclaw` 내부 구조

### 루트 레벨 파일

| 파일 | 역할 |
|------|------|
| `README.md` | 공식 프로젝트 전체 문서 (152KB) |
| `AGENTS.md` | 저장소 가이드라인 (CLAUDE.md → AGENTS.md 심볼릭 링크) |
| `CONTRIBUTING.md` | 기여 가이드, 유지보수자 정보 |
| `VISION.md` | 프로젝트 비전 문서 |
| `CHANGELOG.md` | 전체 변경사항 기록 (368KB) |
| `SECURITY.md` | 보안 정책 및 취약점 보고 가이드 |
| `LICENSE` | MIT 라이선스 |
| `package.json` | 패키지 메타데이터, 의존성, 스크립트 정의 |
| `pnpm-workspace.yaml` | pnpm 모노레포 워크스페이스 설정 |
| `pnpm-lock.yaml` | 의존성 락 파일 (383KB) |
| `tsconfig.json` | TypeScript 컴파일러 설정 (ESM, experimentalDecorators) |
| `tsdown.config.ts` | 번들러(tsdown) 설정 |
| `openclaw.mjs` | CLI 진입점 (실행 가능한 Node.js 바이너리) |
| `Dockerfile` | 메인 Docker 이미지 (base: node:22-bookworm, Bun 포함) |
| `Dockerfile.sandbox` | 샌드박스 Docker 이미지 |
| `Dockerfile.sandbox-browser` | 브라우저 포함 샌드박스 이미지 |
| `Dockerfile.sandbox-common` | 샌드박스 공통 이미지 |
| `fly.toml` | Fly.io 배포 설정 |
| `fly.private.toml` | Fly.io 프라이빗 배포 설정 |
| `render.yaml` | Render 배포 설정 |
| `appcast.xml` | macOS Sparkle 업데이트 피드 (96KB) |
| `.env.example` | 환경변수 템플릿 |
| `vitest.unit.config.ts` | 단위 테스트 설정 |
| `vitest.e2e.config.ts` | E2E 테스트 설정 |
| `vitest.live.config.ts` | 라이브 테스트 설정 |
| `vitest.gateway.config.ts` | 게이트웨이 테스트 설정 |
| `vitest.extensions.config.ts` | 확장 테스트 설정 |
| `.oxlintrc.json` | Oxlint 린터 설정 |
| `.oxfmtrc.jsonc` | Oxfmt 포매터 설정 |
| `.markdownlint-cli2.jsonc` | Markdown 린트 설정 |
| `.swiftformat` | Swift 포매터 설정 (macOS/iOS 앱) |
| `.swiftlint.yml` | SwiftLint 린터 설정 |
| `.shellcheckrc` | ShellCheck 설정 |
| `.pre-commit-config.yaml` | 사전 커밋 훅 설정 |
| `.detect-secrets.cfg` | Secret 감지 설정 |
| `.secrets.baseline` | Secret 베이스라인 |
| `.gitignore` | Git 무시 파일 목록 |
| `.gitattributes` | Git 파일 속성 설정 |
| `.npmrc` | npm 설정 |

---

## `/openclaw/src` — 핵심 소스 코드

### 아키텍처 계층

```
CLI 레이어 → 게이트웨이 레이어 → 에이전트 레이어 → 채널 레이어 → 기능 레이어
```

### 게이트웨이 및 에이전트

| 디렉토리 | 역할 |
|----------|------|
| `src/gateway/` | 메인 게이트웨이 서버 — WebSocket 컨트롤 플레인, 세션 관리, 설정, cron, 웹훅 |
| `src/agents/` | 에이전트 관리 — 멀티-에이전트 조율, 라우팅, 세션 모드 |
| `src/sessions/` | 세션 모델 — main 세션, 그룹 격리, 활성화 모드 |

### CLI 및 명령어

| 디렉토리 | 역할 |
|----------|------|
| `src/cli/` | CLI 진입점 및 옵션 파싱 |
| `src/commands/` | 개별 CLI 명령어 구현 (`gateway`, `agent`, `onboard`, `wizard`, `doctor` 등) |
| `src/tui/` | 터미널 UI (TUI) 컴포넌트 |

### 메시징 채널 (내장)

| 디렉토리 | 역할 |
|----------|------|
| `src/telegram/` | Telegram 봇 통합 (Grammy 라이브러리) |
| `src/discord/` | Discord 봇 통합 (Discord.js) |
| `src/slack/` | Slack 앱 통합 (Slack Bolt) |
| `src/signal/` | Signal 메시징 통합 |
| `src/imessage/` | iMessage 통합 (macOS/iOS) |
| `src/web/` | WhatsApp 웹 클라이언트 |
| `src/line/` | LINE 메시징 통합 |
| `src/channels/` | 채널 공통 로직 (라우팅, allowlist, 기기 페어링, sender 라벨링) |

### 기능 모듈

| 디렉토리 | 역할 |
|----------|------|
| `src/browser/` | Playwright 기반 브라우저 자동화 |
| `src/canvas-host/` | 라이브 Canvas 호스트 (A2UI) |
| `src/media/` | 미디어 파이프라인 (이미지, 오디오, 비디오, 전사) |
| `src/media-understanding/` | 미디어 분석 (이미지/영상 내용 이해) |
| `src/memory/` | 메모리 시스템 |
| `src/link-understanding/` | URL 해석 및 콘텐츠 추출 |
| `src/cron/` | 정기 작업 스케줄러 (croner 기반) |
| `src/tts/` | 텍스트-음성 변환 (Edge TTS, ElevenLabs) |
| `src/hooks/` | 확장 가능한 훅 시스템 |
| `src/pairing/` | 기기 페어링 (DM 보안) |

### 인프라 및 설정

| 디렉토리 | 역할 |
|----------|------|
| `src/providers/` | AI 모델 제공자 연결 (Anthropic, OpenAI, Bedrock) |
| `src/config/` | 설정 파일 로드 및 검증 |
| `src/daemon/` | 백그라운드 데몬 관리 |
| `src/wizard/` | 온보딩 마법사 |
| `src/infra/` | 인프라 유틸리티 (로깅, 에러 처리) |
| `src/process/` | 프로세스 관리 |
| `src/plugin-sdk/` | 플러그인 개발 SDK 정의 |

### 유틸리티

| 디렉토리 | 역할 |
|----------|------|
| `src/terminal/` | 터미널 렌더링 (테이블, 색상, 진행바) |
| `src/routing/` | 메시지 라우팅 로직 |
| `src/security/` | 보안 유틸리티 |
| `src/shared/` | 공유 유틸리티 모듈 |
| `src/utils/` | 범용 유틸리티 함수 |
| `src/types/` | 전역 TypeScript 타입 정의 |
| `src/markdown/` | Markdown 처리 |
| `src/logging/` | 로깅 시스템 |
| `src/test-helpers/` | 테스트 헬퍼 |
| `src/test-utils/` | 테스트 유틸리티 |

---

## `/openclaw/extensions` — 공식 플러그인 (38개)

### 메시징 채널 확장

| 디렉토리 | 역할 |
|----------|------|
| `extensions/slack/` | Slack 채널 플러그인 |
| `extensions/discord/` | Discord 채널 플러그인 |
| `extensions/telegram/` | Telegram 채널 플러그인 |
| `extensions/imessage/` | iMessage 채널 플러그인 |
| `extensions/signal/` | Signal 채널 플러그인 |
| `extensions/whatsapp/` | WhatsApp 채널 플러그인 |
| `extensions/msteams/` | Microsoft Teams 채널 플러그인 |
| `extensions/googlechat/` | Google Chat 채널 플러그인 |
| `extensions/matrix/` | Matrix 프로토콜 채널 플러그인 |
| `extensions/mattermost/` | Mattermost 채널 플러그인 |
| `extensions/line/` | LINE 채널 플러그인 |
| `extensions/irc/` | IRC 채널 플러그인 |
| `extensions/zalo/` | Zalo 채널 플러그인 |
| `extensions/zalouser/` | Zalo 사용자 채널 플러그인 |
| `extensions/bluebubbles/` | BlueBubbles (iMessage 대안) 플러그인 |
| `extensions/feishu/` | Feishu(飞书) 채널 플러그인 |
| `extensions/synology-chat/` | Synology Chat 플러그인 |
| `extensions/nextcloud-talk/` | Nextcloud Talk 플러그인 |
| `extensions/tlon/` | Tlon 플러그인 |
| `extensions/twitch/` | Twitch 채널 플러그인 |
| `extensions/nostr/` | Nostr 프로토콜 플러그인 |
| `extensions/talk-voice/` | 음성 통화 기반 대화 플러그인 |

### 메모리 및 저장

| 디렉토리 | 역할 |
|----------|------|
| `extensions/memory-core/` | 메모리 핵심 인터페이스 정의 |
| `extensions/memory-lancedb/` | LanceDB 기반 벡터 메모리 구현 |

### 개발 및 인프라

| 디렉토리 | 역할 |
|----------|------|
| `extensions/device-pair/` | 기기 페어링 플러그인 |
| `extensions/phone-control/` | 휴대폰 제어 플러그인 |
| `extensions/voice-call/` | 음성 통화 플러그인 (Twilio, Plivo, Telnyx, Teleflow) |
| `extensions/diagnostics-otel/` | OpenTelemetry 진단 플러그인 |
| `extensions/copilot-proxy/` | GitHub Copilot 프록시 플러그인 |
| `extensions/test-utils/` | 플러그인 테스트 유틸리티 |
| `extensions/thread-ownership/` | 스레드 소유권 추적 |
| `extensions/llm-task/` | LLM 작업 처리 플러그인 |
| `extensions/lobster/` | 스크립트 작업 플러그인 |
| `extensions/open-prose/` | Open Prose 플러그인 |
| `extensions/google-gemini-cli-auth/` | Google Gemini CLI 인증 플러그인 |
| `extensions/minimax-portal-auth/` | MiniMax 포털 인증 플러그인 |
| `extensions/qwen-portal-auth/` | Qwen 포털 인증 플러그인 |
| `extensions/shared/` | 플러그인 공유 유틸리티 |

---

## `/openclaw/skills` — 커뮤니티 스킬 (54개)

### 생산성

| 디렉토리 | 역할 |
|----------|------|
| `skills/apple-notes/` | Apple Notes 통합 |
| `skills/apple-reminders/` | Apple Reminders 통합 |
| `skills/bear-notes/` | Bear Notes 통합 |
| `skills/notion/` | Notion 통합 |
| `skills/obsidian/` | Obsidian 통합 |
| `skills/trello/` | Trello 통합 |
| `skills/things-mac/` | Things 3 (macOS) 통합 |
| `skills/todoist/` | Todoist 통합 |

### 개발

| 디렉토리 | 역할 |
|----------|------|
| `skills/github/` | GitHub 통합 |
| `skills/gh-issues/` | GitHub Issues 관리 |
| `skills/coding-agent/` | 코딩 에이전트 스킬 |
| `skills/blucli/` | CLI 작업 스킬 |
| `skills/lobster/` | 스크립트 실행 스킬 |
| `skills/tmux/` | Tmux 관리 스킬 |

### 미디어 및 이미지

| 디렉토리 | 역할 |
|----------|------|
| `skills/camsnap/` | 카메라 스냅샷 캡처 |
| `skills/video-frames/` | 비디오 프레임 추출 |
| `skills/nano-pdf/` | PDF 처리 |
| `skills/openai-image-gen/` | OpenAI 이미지 생성 |
| `skills/openai-whisper/` | OpenAI Whisper 음성 인식 (로컬) |
| `skills/openai-whisper-api/` | OpenAI Whisper API 음성 인식 |
| `skills/peekaboo/` | 스크린 캡처 |
| `skills/sag/` | 스크린 AGI |

### AI 및 언어 모델

| 디렉토리 | 역할 |
|----------|------|
| `skills/gemini/` | Google Gemini 통합 |
| `skills/nano-banana-pro/` | BananaML 통합 |
| `skills/goplaces/` | 장소 검색 |

### 통신

| 디렉토리 | 역할 |
|----------|------|
| `skills/imsg/` | iMessage 전송 |
| `skills/himalaya/` | 이메일 관리 (Himalaya CLI) |
| `skills/wacli/` | WhatsApp CLI |

### 홈 오토메이션

| 디렉토리 | 역할 |
|----------|------|
| `skills/openhue/` | Philips Hue 조명 제어 |
| `skills/sonoscli/` | Sonos 스피커 제어 |
| `skills/eightctl/` | 에어컨 제어 |

### 엔터테인먼트

| 디렉토리 | 역할 |
|----------|------|
| `skills/spotify-player/` | Spotify 플레이어 제어 |
| `skills/songsee/` | 음악 인식 |
| `skills/blogwatcher/` | 블로그 모니터링 |
| `skills/gifgrep/` | GIF 검색 |

### 유틸리티

| 디렉토리 | 역할 |
|----------|------|
| `skills/session-logs/` | 세션 로그 관리 |
| `skills/model-usage/` | AI 모델 사용량 추적 |
| `skills/healthcheck/` | 시스템 헬스 체크 |
| `skills/skill-creator/` | 새 스킬 생성 도구 |
| `skills/canvas/` | Canvas 도구 |
| `skills/clawhub/` | ClawHub 통합 |
| `skills/mcporter/` | Minecraft 포터 |
| `skills/ordercli/` | 주문 관리 |
| `skills/sherpa-onnx-tts/` | ONNX TTS 엔진 |
| `skills/talk-voice/` | 음성 대화 스킬 |
| `skills/voice-call/` | 음성 통화 스킬 |
| `skills/weather/` | 날씨 정보 |
| `skills/xurl/` | URL 확장 |

---

## `/openclaw/apps` — 네이티브 앱 (4개)

| 디렉토리 | 역할 |
|----------|------|
| `apps/macos/` | macOS 앱 (SwiftUI, 메뉴바 앱, Canvas 호스트) |
| `apps/ios/` | iOS 앱 (SwiftUI, Xcode 프로젝트, 대화 노드) |
| `apps/android/` | Android 앱 (Gradle, Kotlin, 대화 노드) |
| `apps/shared/` | 공유 코드 (OpenClawKit Swift 라이브러리, 공통 모델) |

---

## `/openclaw/packages` — 내부 패키지

| 디렉토리 | 역할 |
|----------|------|
| `packages/clawdbot/` | ClewdBot 패키지 |
| `packages/moltbot/` | MoltBot 패키지 |

---

## `/openclaw/docs` — 문서

| 디렉토리 | 역할 |
|----------|------|
| `docs/start/` | 시작 가이드 (Getting Started, Wizard, FAQ, Showcase) |
| `docs/install/` | 설치 가이드 (Docker, npm, 업데이트, 개발 채널) |
| `docs/concepts/` | 핵심 개념 (Agent, Session, Model failover 등) |
| `docs/channels/` | 채널별 설정 가이드 |
| `docs/providers/` | AI 제공자 설정 |
| `docs/plugins/` | 플러그인 시스템 및 개발 가이드 |
| `docs/tools/` | 도구/스킬 문서 |
| `docs/nodes/` | 노드 문서 (Voice Wake, Talk, Audio, Images) |
| `docs/automation/` | 자동화 문서 (cron, webhooks) |
| `docs/platforms/` | 플랫폼별 앱 문서 (macOS, iOS, Android) |
| `docs/web/` | 웹 UI 문서 |
| `docs/gateway/` | 게이트웨이 설정 및 보안, doctor |
| `docs/cli/` | CLI 명령어 레퍼런스 |
| `docs/reference/` | API, 프로토콜, 릴리스 참조 |
| `docs/security/` | 보안 설정 가이드 |
| `docs/diagnostics/` | 진단 도구 |
| `docs/debug/` | 디버깅 가이드 |
| `docs/help/` | FAQ, 문제 해결 |
| `docs/images/` | 이미지 관련 가이드 |
| `docs/experiments/` | 실험적 기능 |
| `docs/refactor/` | 리팩토링 노트 |
| `docs/zh-CN/` | 중국어 번역 |
| `docs/ja-JP/` | 일본어 번역 |

---

## `/openclaw/.github` — GitHub 설정

### 워크플로우

| 파일 | 역할 |
|------|------|
| `.github/workflows/ci.yml` | 메인 CI 파이프라인 |
| `.github/workflows/docker-release.yml` | Docker 릴리스 자동화 |
| `.github/workflows/install-smoke.yml` | 설치 smoke 테스트 |
| `.github/workflows/sandbox-common-smoke.yml` | 샌드박스 smoke 테스트 |
| `.github/workflows/workflow-sanity.yml` | 워크플로우 검증 |
| `.github/workflows/labeler.yml` | PR 자동 라벨링 |
| `.github/workflows/stale.yml` | 오래된 이슈 처리 |
| `.github/workflows/auto-response.yml` | 자동 응답 |

### 기타 설정

| 파일 | 역할 |
|------|------|
| `.github/dependabot.yml` | 의존성 자동 업데이트 |
| `.github/FUNDING.yml` | 스폰서십 정보 |
| `.github/labeler.yml` | 라벨 규칙 설정 |
| `.github/pull_request_template.md` | PR 템플릿 |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | 버그 리포트 템플릿 |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | 기능 요청 템플릿 |
| `.github/actions/setup-node-env/` | Node.js 환경 설정 액션 |
| `.github/actions/setup-pnpm-store-cache/` | pnpm 캐시 액션 |
| `.github/actions/detect-docs-changes/` | 문서 변경 감지 액션 |
| `.github/instructions/copilot.instructions.md` | GitHub Copilot 지침 |

---

## `/openclaw/scripts` — 빌드 및 배포 스크립트

| 파일 | 역할 |
|------|------|
| `scripts/` | 빌드, 테스트, 배포 스크립트 모음 |
| `docker-setup.sh` | Docker 환경 자동 설치 |
| `setup-podman.sh` | Podman 환경 설정 |

---

## `/openclaw/Swabble` — Swift UI 라이브러리

macOS/iOS 앱에서 사용하는 SwiftUI 컴포넌트 라이브러리입니다.

---

## 자주 찾는 파일 빠른 참조

| 목적 | 파일 경로 |
|------|-----------|
| CLI 진입점 | `openclaw/openclaw.mjs` |
| 게이트웨이 서버 | `openclaw/src/gateway/` |
| AI 에이전트 로직 | `openclaw/src/agents/` |
| AI 모델 제공자 설정 | `openclaw/src/providers/` |
| 환경변수 템플릿 | `openclaw/.env.example` |
| Docker 서비스 정의 | `docker-compose.yml` |
| Docker 설치 스크립트 | `docker-setup.sh` |
| 메시징 채널 목록 | `openclaw/extensions/` |
| 새 스킬 추가 | `openclaw/skills/` |
| 플러그인 개발 SDK | `openclaw/src/plugin-sdk/` |
| 전체 문서 | `openclaw/docs/` |
| macOS 앱 | `openclaw/apps/macos/` |
| iOS 앱 | `openclaw/apps/ios/` |
| Android 앱 | `openclaw/apps/android/` |
| 기여 방법 | `openclaw/CONTRIBUTING.md` |
| 보안 정책 | `openclaw/SECURITY.md` |
