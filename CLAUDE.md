# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

Pinball_web은 멀티플레이어 핀볼 게임을 위한 풀스택 웹 플랫폼입니다. React/Vite 프론트엔드, FastAPI 백엔드, PostgreSQL 데이터베이스, Traefik 기반 Docker 배포로 구성됩니다.

## 명령어

### 백엔드

백엔드는 Docker 컨테이너에서 실행된다. 직접 `uvicorn`을 로컬 실행하지 않는다.

```bash
# 서비스 시작 (프로젝트 루트에서)
docker-compose up -d fastapi

# 로그 확인
docker-compose logs -f fastapi

# 컨테이너 내부에서 테스트 실행
docker-compose exec fastapi pytest
docker-compose exec fastapi pytest tests/test_users.py -v

# 컨테이너 내부에서 마이그레이션 실행
docker-compose exec fastapi alembic upgrade head
docker-compose exec fastapi alembic revision --autogenerate -m "설명"
```

### 프론트엔드 (`frontend/` 디렉토리에서 실행)

Claude는 `node`/`npm`이 PATH에 없으므로 nvm을 통해 로드해야 한다.

```bash
# Claude가 npm 명령 실행 시 nvm을 먼저 로드
source ~/.nvm/nvm.sh && npm install
source ~/.nvm/nvm.sh && npm run start        # HMR 개발 서버 (/api → localhost:8000 프록시)
source ~/.nvm/nvm.sh && npm run build        # 프로덕션 빌드 → dist/
source ~/.nvm/nvm.sh && npm run test:run     # 테스트 1회 실행
source ~/.nvm/nvm.sh && npm run test:ui      # Vitest 대화형 UI
```

### Docker

```bash
docker-compose up -d          # 전체 서비스 시작
docker-compose logs -f fastapi
```

## 아키텍처

### 요청 흐름
```
브라우저 → Traefik (SSL/TLS) → Nginx (정적 SPA) 또는 FastAPI (/api/*)
```

### 백엔드 구조

자세한 내용은 [backend/README.md](backend/README.md) 참조.

### 프론트엔드 구조

자세한 내용은 [frontend/README.md](frontend/README.md) 참조.

### 주요 설계 결정

**인증**: localStorage 기반 세션. 로그인 시 `{user_id, email, nickname, role}` 반환. 관리자/보호된 엔드포인트는 `X-API-Key` 헤더 필요.

**HTTPS / 리다이렉트 문제**: Mixed Content 오류 방지를 위해 FastAPI에 `redirect_slashes=False` 설정, 모든 라우터 경로를 `"/"`가 아닌 `""`로 지정해 307 리다이렉트를 차단.

**사용자 삭제**: FK에 `ON DELETE CASCADE` 없음 — API에서 User 삭제 전 Friendship, MonthlyScore, HighScore 레코드를 수동으로 삭제.

**MonthlyScore 비정규화**: 빠른 표시를 위해 점수와 함께 `nickname` 저장. `PUT /users/{user_id}` 호출 시 관련 MonthlyScore 행의 닉네임을 동기화.

**API 버전 관리**: 헬스체크(`GET /api/`)와 친구 관계(`/api/friend-requests/`)를 제외한 모든 엔드포인트는 `/api/v1/` 접두사 사용.

### 데이터 모델

| 모델 | 테이블 | 특이사항 |
|------|--------|---------|
| User | users | role: 'user'/'admin' |
| HighScore | high_scores | user_id에 UNIQUE 제약 (사용자당 1개) |
| MonthlyScore | monthly_scores | 표시용 nickname 비정규화 저장 |
| Friendship | friendships | status: pending/accepted/rejected; (requester_id, receiver_id) UniqueConstraint |
| GameVisit | game_visits | 익명 추적을 위해 user_id nullable |

### 핀볼 게임 (`frontend/src/pages/Pinball.jsx`)
- 물리 엔진: Matter.js
- 5스테이지, 스테이지별 범퍼 레이아웃 설정 가능
- 목숨 시스템 (3목숨), 점수 추적, 최고 점수 저장
- 반응형 스케일링: BASE_WIDTH=816, BASE_HEIGHT=1296

### 환경 변수 (`backend/.env`)
```
DATABASE_URL=postgresql+psycopg2://user:password@postgres-server:5432/hexdb
API_KEY=<secret>
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```
템플릿은 `backend/.env.example` 참고.

### 배포
- **Traefik**: SSL/TLS 종단, Cloudflare DNS 챌린지로 Let's Encrypt 인증서 발급, HTTP→HTTPS 리다이렉트
- **Nginx**: `dist/`에서 React SPA 제공, HTML5 폴백 (`try_files $uri $uri/ /index.html`)
- **서비스**: traefik, nginx, fastapi, postgres (주), mysql (레거시 백업)
- 모든 컨테이너는 `web` Docker 네트워크; 백엔드는 `postgres-server` 호스트명으로 연결
