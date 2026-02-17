# Pinball Web

Docker 기반의 핀볼 게임 웹 플랫폼입니다.

## 프로젝트 목적

웹 브라우저에서 플레이할 수 있는 핀볼 게임을 제공하는 플랫폼입니다. 사용자 인증, 점수 기록, 랭킹 시스템을 포함합니다.

- 회원가입/로그인 기능
- Matter.js 기반 물리 엔진 핀볼 게임 (5스테이지, 목숨 시스템)
- 월별 점수 랭킹 및 친구 시스템

## 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | React 18, Vite, Material-UI, Matter.js |
| **Backend** | FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL 16 (주), MySQL 8.0 (레거시 백업) |
| **Proxy** | Traefik (리버스 프록시, SSL/TLS) |
| **Web Server** | Nginx |
| **Infra** | Docker, Docker Compose |
| **SSL** | Let's Encrypt + Cloudflare DNS Challenge |


## 아키텍처

```
브라우저 → Traefik (:80/:443)
               │
               ├── hexsera.com          → Nginx → React 정적 파일 (SPA)
               │
               └── hexsera.com/api/*    → FastAPI → PostgreSQL
```


## 디렉토리 구조

```
Pinball_web/
├── backend/          # FastAPI 애플리케이션
│   ├── app/
│   │   ├── api/      # 라우터 (users, auth, scores, friends, visits)
│   │   ├── core/     # 설정, 의존성
│   │   ├── db/       # DB 세션
│   │   └── schemas/  # Pydantic 스키마
│   ├── alembic/      # DB 마이그레이션
│   ├── tests/        # pytest 테스트
│   └── .env          # 환경 변수 (gitignore)
├── frontend/         # React/Vite 애플리케이션
│   └── src/
│       ├── pages/    # 8개 페이지 컴포넌트
│       ├── components/
│       └── services/ # API 호출 함수
├── docs/             # 기술 문서
├── nginx.conf        # Nginx 설정
├── traefik.yml       # Traefik 설정
└── docker-compose.yml
```


## 로컬 실행 방법

### 백엔드 (Docker)

```bash
# 1. 환경 변수 파일 생성
cp backend/.env.example backend/.env
# backend/.env 에서 DATABASE_URL, API_KEY 등 설정

# 2. 전체 서비스 시작
docker compose up -d

# 3. DB 마이그레이션 실행
docker compose exec fastapi alembic upgrade head

# 4. 로그 확인
docker compose logs -f fastapi
```

### 프론트엔드 (개발 서버)

```bash
cd frontend

# nvm으로 Node.js 로드 후 의존성 설치
source ~/.nvm/nvm.sh && npm install

# HMR 개발 서버 시작 (/api → localhost:8000 프록시)
source ~/.nvm/nvm.sh && npm run start
```


## API 개요

모든 엔드포인트는 `/api/v1/` 접두사를 사용합니다 (헬스체크 및 친구 요청 제외).

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/` | 헬스체크 |
| `POST /api/v1/auth/login` | 로그인 |
| `POST /api/v1/users/` | 회원가입 |
| `GET /api/v1/users/{user_id}` | 사용자 조회 |
| `GET /api/v1/monthly-scores/` | 월별 랭킹 조회 |
| `POST /api/v1/monthly-scores/` | 점수 등록 |
| `GET /api/v1/game-visits/` | 게임 방문 통계 |
| `GET /api/friend-requests/` | 친구 요청 목록 |


## 도메인

- 운영: https://hexsera.com (12:00~20:00 사이에 접속 가능)
