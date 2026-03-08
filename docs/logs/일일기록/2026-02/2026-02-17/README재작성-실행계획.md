# README.md 재작성 실행계획

## 요구사항 요약

**요구사항**: 루트 `README.md`를 재작성한다.

**목적**: DB 표기 오류(MySQL → PostgreSQL) 수정, 디렉토리 구조·API 개요·로컬 실행 방법 추가로 처음 접하는 개발자가 프로젝트를 빠르게 이해하고 로컬에서 실행할 수 있도록 한다.

---

## 현재상태 분석

- `README.md` 39줄 분량, 기술 스택 테이블에 DB가 `MySQL 8.0`으로 표기되어 있으나 실제 주 DB는 PostgreSQL 16
- 아키텍처 다이어그램의 FastAPI → MySQL 표기도 오류
- 디렉토리 구조 섹션 없음
- API 개요 섹션 없음
- 로컬 실행 방법(백엔드 Docker, 프론트엔드 nvm) 섹션 없음

---

## 구현 방법

기존 `README.md` 전체를 재작성한다. 추가 라이브러리 없이 마크다운만 사용한다. 실제 코드베이스(`docker-compose.yml`, `backend/app/api/`, `frontend/src/pages/`)를 분석한 내용을 기반으로 작성한다.

---

## 구현 단계

### 1. 기술 스택 테이블 수정

```markdown
| 분류 | 기술 |
|------|------|
| **Frontend** | React 18, Vite, Material-UI, Matter.js |
| **Backend** | FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL 16 (주), MySQL 8.0 (레거시 백업) |
| **Proxy** | Traefik (리버스 프록시, SSL/TLS) |
| **Web Server** | Nginx |
| **Infra** | Docker, Docker Compose |
| **SSL** | Let's Encrypt + Cloudflare DNS Challenge |
```

- **무엇을 하는가**: MySQL → PostgreSQL로 주 DB 표기를 수정하고, MySQL은 레거시 백업으로 명시
- `docker-compose.yml`에 postgres(주), mysql(레거시) 두 서비스가 모두 정의되어 있음
- fastapi 서비스의 `depends_on`이 postgres를 가리키고 있음

---

### 2. 디렉토리 구조 섹션 추가

```markdown
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
```

- **무엇을 하는가**: 실제 디렉토리 구조를 기반으로 프로젝트 레이아웃을 한눈에 파악할 수 있도록 함
- `backend/app/api/`, `frontend/src/pages/` 등 실제 경로를 반영

---

### 3. 로컬 실행 방법 섹션 추가

```markdown
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
```

- **무엇을 하는가**: 백엔드는 Docker로, 프론트엔드는 nvm을 통해 npm을 실행하는 방법을 명시
- CLAUDE.md의 nvm 로드 필요 사항을 반영
- 프론트엔드 개발 서버는 `/api` 요청을 `localhost:8000`으로 프록시

---

### 4. 아키텍처 다이어그램 수정

```markdown
## 아키텍처

```
브라우저 → Traefik (:80/:443)
               │
               ├── hexsera.com          → Nginx → React 정적 파일 (SPA)
               │
               └── hexsera.com/api/*    → FastAPI → PostgreSQL
```
```

- **무엇을 하는가**: 기존 다이어그램의 FastAPI → MySQL 표기를 FastAPI → PostgreSQL로 수정
- `docker-compose.yml`의 fastapi 서비스 labels에서 `/api` PathPrefix 라우팅 규칙을 반영

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `README.md` | 수정 | DB 오류 수정, 디렉토리 구조·로컬 실행 방법·아키텍처 수정 추가 |

---

## 완료 체크리스트

- [ ] 기술 스택 테이블에서 주 DB가 `PostgreSQL 16`으로 표기되어 있다
- [ ] 기술 스택 테이블에서 MySQL이 `레거시 백업`으로 명시되어 있다
- [ ] 아키텍처 다이어그램에서 FastAPI가 PostgreSQL로 연결되어 있다
- [ ] 디렉토리 구조 섹션이 존재하고, `backend/app/`, `frontend/src/` 경로가 포함되어 있다
- [ ] 로컬 실행 방법 섹션에 `docker compose up -d` 절차가 명시되어 있다
- [ ] 로컬 실행 방법 섹션에 `source ~/.nvm/nvm.sh && npm run start` 명령어가 포함되어 있다
- [ ] 로컬 실행 방법 섹션에 `alembic upgrade head` 명령어가 포함되어 있다
