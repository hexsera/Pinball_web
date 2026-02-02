# Pinball Web

Docker 기반의 핀볼 게임 웹 플랫폼입니다.

## 프로젝트 목적

웹 브라우저에서 플레이할 수 있는 핀볼 게임을 제공하는 플랫폼입니다. 사용자 인증, 점수 기록, 랭킹 시스템을 포함합니다.

- 회원가입/로그인 기능
- Matter.js 기반 물리 엔진 핀볼 게임

## 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | React, Vite, Material-UI, Matter.js |
| **Backend** | FastAPI, SQLAlchemy, Alembic |
| **Database** | MySQL 8.0 |
| **Proxy** | Traefik (리버스 프록시, SSL) |
| **Web Server** | Nginx |
| **Infra** | Docker, Docker Compose |
| **SSL** | Let's Encrypt + Cloudflare DNS |

## 폴더 구조

```
Pinball_web/
├── backend/                    # FastAPI 백엔드
│   ├── app/                    # 애플리케이션 모듈 (구조화 예정)
│   │   ├── api/                # API 라우터 (구조화 예정)
│   │   │   └── v1/             # API v1 엔드포인트 (구조화 예정)
│   │   ├── core/               # 핵심 설정 (구조화 예정)
│   │   ├── db/                 # 데이터베이스 설정 (구조화 예정)
│   │   └── schemas/            # Pydantic 스키마 (구조화 예정)
│   ├── alembic/                # DB 마이그레이션
│   │   └── versions/           # 마이그레이션 버전 파일
│   ├── main.py                 # FastAPI 엔트리포인트
│   ├── models.py               # SQLAlchemy ORM 모델
│   ├── database.py             # DB 연결 설정
│   ├── auth.py                 # API Key 인증
│   ├── seed.py                 # 초기 데이터 시딩
│   ├── requirements.txt        # Python 의존성
│   ├── alembic.ini             # Alembic 설정
│   └── Dockerfile              # FastAPI 컨테이너 빌드
│
├── react/                      # React 프론트엔드
│   └── main/
│       ├── src/
│       │   ├── App.jsx         # 라우팅 설정
│       │   ├── main.jsx        # React 엔트리포인트
│       │   ├── AuthContext.jsx # 인증 상태 관리
│       │   ├── Dashboard.jsx   # 메인 대시보드
│       │   ├── Login.jsx       # 로그인 페이지
│       │   ├── Register.jsx    # 회원가입 페이지
│       │   ├── Pinball.jsx     # 핀볼 게임 (Matter.js)
│       │   ├── UserInfo.jsx    # 회원정보 페이지
│       │   └── admin/          # 관리자 페이지
│       │       ├── AdminPage.jsx
│       │       ├── AdminHeader.jsx
│       │       ├── AdminSidebar.jsx
│       │       ├── AdminMain.jsx
│       │       ├── AdminUserPage.jsx
│       │       └── AdminUserMain.jsx
│       ├── public/             # 정적 파일 (이미지, 음악)
│       └── dist/               # 프로덕션 빌드 결과물
│
├── html/                       # Nginx 서빙용 정적 파일
│   └── assets/                 # 빌드된 에셋
│
├── nginx/                      # Nginx 설정
├── docs/                       # 문서
│   ├── prd/                    # PRD 및 기술 문서
│   │   └── longtime/           # 장기 보관 문서
│   └── logs/                   # 로그
│       ├── 업무일지/            # 작업 일지
│       └── 일일기록/            # 일일 기록
│
├── docker-compose.yml          # Docker 서비스 정의
├── traefik.yml                 # Traefik 설정
├── nginx.conf                  # Nginx 설정
├── acme.json                   # SSL 인증서 저장
├── CLAUDE.md                   # Claude Code 가이드
└── README.md                   # 프로젝트 소개
```

## 아키텍처

```
인터넷 → Traefik (:80/:443)
              │
              ├── hexsera.com → Nginx → React 정적 파일
              │
              └── hexsera.com/api/* → FastAPI → MySQL
```


## 도메인

- 운영: https://hexsera.com (12:00~20:00 사이에 접속 가능)
