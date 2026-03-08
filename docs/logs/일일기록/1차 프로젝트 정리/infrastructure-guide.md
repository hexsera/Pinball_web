# 인프라 구조 가이드

> 작성일: 2026-02-17
> 목적: Docker Compose 기반 인프라 전체 구조를 문서화하여 변경·장애 대응 시 빠른 파악을 돕는다.

---

## 전체 아키텍처

```
인터넷
  │
  ▼
Traefik (:80 / :443)
  ├─ HTTP(:80) ──────────────────────────────── HTTPS(:443) 리다이렉트
  │
  ├─ Host(hexsera.com) && PathPrefix(/api) ──→ fastapi-server:8000
  │                                                    │
  │                                                    ▼
  │                                             PostgreSQL (postgres-server:5432)
  │
  └─ Host(hexsera.com) ──────────────────────→ nginx-server:80
                                                       │
                                                       ▼
                                               Nginx (React SPA)
                                         (try_files → /index.html)
```

---

## 서비스 목록

| 서비스명 | 컨테이너명 | 이미지 | 호스트 포트 | 역할 |
|----------|-----------|--------|------------|------|
| traefik | traefik | traefik:latest | 80, 443 | 리버스 프록시, SSL/TLS 종단, HTTP→HTTPS 리다이렉트, 라우팅 |
| nginx | nginx-server | nginx:latest | (내부 80) | React SPA 정적 파일 제공 |
| fastapi | fastapi-server | ./backend (빌드) | 8000 | REST API 서버 |
| postgres | postgres-server | postgres:16 | 5432 | 주 데이터베이스 |
| mysql | mysql-server | mysql:8.0 | 3306 | 레거시 백업용 DB |

모든 서비스는 `web` Docker 네트워크에 연결되어 컨테이너명으로 상호 통신한다.

---

## Traefik 설정 (`traefik.yml`)

| 항목 | 값 | 설명 |
|------|-----|------|
| entryPoints.web | `:80` | HTTP 진입점; 모든 요청을 HTTPS로 리다이렉트 |
| entryPoints.websecure | `:443` | HTTPS 진입점; 실제 요청 처리 |
| providers.docker.endpoint | `unix:///var/run/docker.sock` | Docker 소켓 연결로 컨테이너 레이블 자동 감지 |
| providers.docker.exposedByDefault | `false` | `traefik.enable=true` 레이블이 있는 컨테이너만 라우팅 |
| certificatesResolvers.cloudflare | Cloudflare DNS Challenge | Let's Encrypt 인증서 발급 방식 |

**인증서 발급 상세:**
- 방식: Cloudflare DNS Challenge
- 이메일: `hexsera78049@gmail.com` (Let's Encrypt 알림용)
- 저장 위치: `./acme.json`
- DNS 리졸버: `1.1.1.1:53` (Cloudflare), `8.8.8.8:53` (Google)
- API 토큰: `docker-compose.yml`의 `CF_DNS_API_TOKEN` 환경변수로 주입

---

## 요청 라우팅 규칙

| 라우터 | 규칙 | 진입점 | 백엔드 |
|--------|------|--------|--------|
| fastapi | `Host(hexsera.com) && PathPrefix(/api)` | websecure | fastapi-server:8000 |
| nginx | `Host(hexsera.com)` | websecure | nginx-server:80 |

> Traefik은 규칙 구체성 기준으로 라우터 우선순위를 자동 결정한다.
> `fastapi` 라우터가 경로 조건(`PathPrefix(/api)`)이 추가되어 더 구체적이므로 `/api/*` 요청을 먼저 처리한다.

---

## Nginx 설정 (`nginx/nginx.conf`)

```nginx
server {
    listen 80;          # Traefik에서 내부 포트 80으로 라우팅
    root /etc/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # React SPA HTML5 폴백
    }
}
```

- `html-data-volume`에 React 빌드 결과물(`dist/`)을 복사하면 Nginx가 서빙한다.
- `try_files` 설정으로 React Router 기반 클라이언트 라우팅이 동작한다.

> **참고**: `nginx/nginx.conf`의 `listen 8080`, `root /home/hexsera/long_time_test/nginx/html`은 개발용 로컬 설정이다. 실제 컨테이너는 Docker 레이블(`server.port=80`)에 따라 내부 80포트로 동작한다.

---

## 네트워크·볼륨 구성

### 네트워크

| 이름 | 타입 | 설명 |
|------|------|------|
| web | bridge (internal) | 모든 컨테이너가 공유하는 내부 네트워크 |

`external: false`로 docker-compose 실행 시 자동 생성된다.

### 볼륨

| 볼륨명 | 마운트 위치 | 설명 |
|--------|------------|------|
| html-data-volume | nginx:/etc/nginx/html | React 빌드 결과물(`dist/`) 저장 |
| postgres-data | postgres:/var/lib/postgresql/data | PostgreSQL 데이터 영속화 |
| mysql-data | mysql:/var/lib/mysql | MySQL 데이터 영속화 |

### 바인드 마운트

| 소스 | 컨테이너 | 설명 |
|------|---------|------|
| `./backend` | fastapi-server:/code | FastAPI 소스코드 실시간 반영 |
| `./traefik.yml` | traefik:/traefik.yml | Traefik 정적 설정 |
| `./acme.json` | traefik:/acme.json | Let's Encrypt 인증서 파일 |
| `/var/run/docker.sock` | traefik | Docker 소켓 (읽기 전용) |
| `./nginx.conf` | nginx-server:/etc/nginx/nginx.conf | Nginx 설정 |

---

## 장애 대응 참고

### 인증서 갱신 실패
- `acme.json` 파일 권한 확인: `chmod 600 acme.json`
- Cloudflare API 토큰 유효성 확인
- `docker compose logs traefik`으로 DNS Challenge 오류 확인

### nginx 404 / SPA 라우팅 오류
- `html-data-volume`에 빌드 파일이 정상 복사되었는지 확인
- `try_files` 설정 및 nginx 컨테이너 재시작

### FastAPI 연결 오류
- `docker compose logs fastapi`로 오류 확인
- `postgres-server:5432` 연결 및 DB 헬스체크 상태 확인
- `backend/.env` 환경변수(`DATABASE_URL`) 확인
