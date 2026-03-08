# 배포 가이드

처음 배포하는 사람도 이 문서만 보고 서버 세팅부터 서비스 운영까지 진행할 수 있도록 작성한 인프라 설정 가이드입니다.

---

## 사전 요구사항

- 서버 OS: Ubuntu 20.04 이상
- Docker Engine 24.x 이상, Docker Compose v2 이상 설치
- 도메인 DNS가 Cloudflare에서 관리되고 있어야 한다
- 서버의 80, 443, 5432 포트가 열려 있어야 한다
- Cloudflare API Token: Zone:DNS:Edit 권한으로 발급

### Cloudflare API Token 발급 방법

1. [Cloudflare 대시보드](https://dash.cloudflare.com) → My Profile → API Tokens
2. `Create Token` → `Edit zone DNS` 템플릿 선택
3. Zone Resources: 배포할 도메인 선택
4. 생성된 토큰을 복사해 둔다

---

## 환경 변수 설정

### backend/.env

`backend/.env.example`을 복사하여 `backend/.env`를 생성한다.

```bash
cp backend/.env.example backend/.env
```

`backend/.env` 파일을 열어 아래 값을 실제 값으로 수정한다.

| 변수명 | 예시 값 | 설명 |
|--------|---------|------|
| `DATABASE_URL` | `postgresql+psycopg2://hexsera:hexpoint@postgres-server:5432/hexdb` | PostgreSQL 연결 문자열. `@postgres-server`는 Docker 컨테이너명이므로 외부 IP가 아님 |
| `MYSQL_HOST` | `mysql-server` | MySQL 컨테이너명 (레거시 백업용) |
| `MYSQL_PORT` | `3306` | MySQL 포트 |
| `MYSQL_DATABASE` | `hexdb` | MySQL 데이터베이스명 |
| `MYSQL_USER` | `hexsera` | MySQL 사용자명 |
| `MYSQL_PASSWORD` | `yourpassword` | MySQL 비밀번호 |
| `ADMIN_EMAIL` | `admin@example.com` | 초기 관리자 계정 이메일 |
| `ADMIN_NICKNAME` | `admin` | 초기 관리자 닉네임 |
| `ADMIN_PASSWORD` | `yourpassword` | 초기 관리자 비밀번호 |
| `ADMIN_BIRTH_DATE` | `2000-01-01` | 초기 관리자 생년월일 |

### docker-compose.yml 수정

`docker-compose.yml`의 traefik 서비스 환경 변수에서 Cloudflare 관련 값을 교체한다.

```yaml
environment:
  - CF_API_EMAIL=your-email@example.com       # Cloudflare 계정 이메일
  - CF_DNS_API_TOKEN=your-cloudflare-token    # 위에서 발급한 API Token
```

또한 nginx 및 fastapi 서비스의 `traefik.http.routers.*.rule` 라벨에서 도메인을 실제 도메인으로 교체한다.

```yaml
- "traefik.http.routers.nginx.rule=Host(`your-domain.com`)"
- "traefik.http.routers.fastapi.rule=Host(`your-domain.com`) && PathPrefix(`/api`)"
```

`traefik.yml`의 Let's Encrypt 알림 이메일도 실제 이메일로 수정한다.

```yaml
certificatesResolvers:
  cloudflare:
    acme:
      email: your-email@example.com
```

---

## 초기 배포 절차

```bash
# 1. 저장소 클론
git clone <repo-url> && cd Pinball_web

# 2. 환경 변수 파일 생성 및 수정
cp backend/.env.example backend/.env
# backend/.env 파일을 실제 값으로 수정
# docker-compose.yml의 CF_DNS_API_TOKEN, 도메인 수정
# traefik.yml의 이메일 수정

# 3. acme.json 파일 생성 (Traefik 인증서 저장용)
# 이 파일이 없거나 권한이 잘못되면 인증서 발급에 실패한다
touch acme.json && chmod 600 acme.json

# 4. 프론트엔드 빌드
source ~/.nvm/nvm.sh && cd frontend && npm install && npm run build && cd ..

# 5. 빌드 결과물을 nginx 볼륨에 복사
# 먼저 nginx 컨테이너를 띄운 후 복사한다
docker compose up -d nginx
docker compose cp frontend/dist/. nginx-server:/etc/nginx/html/

# 6. 전체 서비스 시작
docker compose up -d
```

---

## DB 마이그레이션

서비스 시작 후 반드시 Alembic 마이그레이션을 실행해야 테이블이 생성된다.

```bash
# 최초 배포 시 또는 스키마 변경 후 실행
docker compose exec fastapi alembic upgrade head

# 현재 마이그레이션 상태 확인
docker compose exec fastapi alembic current

# 마이그레이션 이력 확인
docker compose exec fastapi alembic history

# 새 마이그레이션 파일 생성 (모델 변경 후)
docker compose exec fastapi alembic revision --autogenerate -m "변경 내용 설명"
```

---

## 롤백 방법

### DB 마이그레이션 롤백

> **주의**: 마이그레이션 롤백은 데이터 손실 위험이 있으므로 실행 전 DB 백업을 권장한다.

```bash
# 한 단계 이전으로 롤백
docker compose exec fastapi alembic downgrade -1

# 특정 버전으로 롤백 (revision ID 확인 후 실행)
docker compose exec fastapi alembic history
docker compose exec fastapi alembic downgrade <revision_id>
```

> `alembic downgrade base`는 모든 마이그레이션을 되돌리므로 사용에 주의한다.

### 서비스 롤백

```bash
# 서비스 중단
docker compose down

# 이전 커밋으로 체크아웃
git checkout <이전 커밋 해시>

# FastAPI 이미지 재빌드 후 서비스 재시작
docker compose build fastapi
docker compose up -d
```

---

## 트러블슈팅

### 인증서 발급 실패

- **원인**: `CF_DNS_API_TOKEN` 권한 부족 또는 `acme.json` 권한 오류
- **확인**: `docker compose logs traefik`으로 에러 메시지 확인
- **해결**:
  ```bash
  chmod 600 acme.json
  # Cloudflare 토큰 Zone:DNS:Edit 권한 재확인
  ```

### FastAPI 컨테이너 시작 실패

- **원인**: `backend/.env` 파일 누락 또는 `DATABASE_URL` 값 오류
- **확인**: `docker compose logs fastapi`
- **해결**: `.env` 파일 존재 여부와 값 확인 후 `docker compose restart fastapi`

### 프론트엔드 404 오류 (빈 페이지)

- **원인**: nginx 볼륨에 `dist/` 파일이 없는 경우
- **해결**:
  ```bash
  source ~/.nvm/nvm.sh && cd frontend && npm run build && cd ..
  docker compose cp frontend/dist/. nginx-server:/etc/nginx/html/
  docker compose restart nginx
  ```

### Mixed Content 오류

- **원인**: HTTP 리소스를 HTTPS 페이지에서 요청하는 경우
- **확인**: 브라우저 개발자 도구 콘솔 확인
- **해결**: FastAPI의 `redirect_slashes=False` 설정 및 모든 라우터 경로가 `"/"` 없이 `""` 로 끝나는지 확인

### DB 연결 오류 (postgres 컨테이너가 준비되기 전 FastAPI 시작)

- **원인**: postgres 헬스체크가 완료되기 전 fastapi가 기동될 수 있음
- **해결**: `docker compose restart fastapi`로 재시작하거나 `depends_on` 조건에 `condition: service_healthy` 추가 검토
