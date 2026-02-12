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
