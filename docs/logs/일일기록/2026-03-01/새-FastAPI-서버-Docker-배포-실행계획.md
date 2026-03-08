# 새 FastAPI 서버 Docker 배포 실행계획

## 요구사항 요약

**요구사항**: 기존 Pinball_web 서버와 독립적인 새 FastAPI 서버를 Docker 컨테이너로 추가하고, Traefik을 통해 `/api2/*` 경로로 라우팅한다.

**목적**: 기존 `/api/*` 서버에 영향 없이 새 기능/서비스를 별도 FastAPI 인스턴스로 운영하기 위함.

## 현재상태 분석

- `docker-compose.yml`에 traefik, nginx, fastapi, mysql, postgres 5개 서비스가 구성되어 있음
- 기존 fastapi는 `./backend` 폴더를 빌드, 포트 8000 사용, `/api` 경로로 Traefik 라우팅
- Traefik이 SSL/TLS 처리 및 도메인 라우팅 담당, `web` Docker 네트워크로 전 서비스 연결
- 새 서버는 DB 없이 순수 API 서버로 운영, 포트 8001 사용 예정

## 구현 방법

- 새 FastAPI 프로젝트 디렉토리(`backend2/`)를 루트에 생성한다.
- `backend2/`에 `Dockerfile`, `requirements.txt`, `main.py`를 작성한다.
- `docker-compose.yml`에 새 서비스(`fastapi2`)를 추가하고 포트 8001, Traefik 라우팅 경로 `/api2`로 설정한다.
- Traefik 라우터 이름이 기존 `fastapi`와 충돌하지 않도록 `fastapi2`로 구분한다.

## 구현 단계

### 1. 새 FastAPI 프로젝트 디렉토리 생성

```bash
mkdir -p backend2
```

- `backend2/` 폴더를 프로젝트 루트에 생성한다.
- 기존 `backend/`와 완전히 독립된 디렉토리로, 코드 공유 없음.

### 2. `backend2/requirements.txt` 작성

```text
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-dotenv
```

- DB 없이 순수 API 서버이므로 SQLAlchemy, psycopg2 등 DB 관련 패키지 제외.
- 필요한 패키지만 포함해 이미지 크기를 최소화한다.

### 3. `backend2/main.py` 작성

```python
from fastapi import FastAPI

app = FastAPI(redirect_slashes=False)

@app.get("/api2/health")
def health():
    return {"status": "ok"}
```

- `redirect_slashes=False`: HTTPS 환경에서 307 리다이렉트로 인한 Mixed Content 오류 방지 (기존 서버와 동일한 설정).
- `/api2/health` 엔드포인트로 서버 동작 여부를 확인할 수 있다.

### 4. `backend2/Dockerfile` 작성

```dockerfile
FROM python:3.11-slim

WORKDIR /code

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
```

- 기존 `backend/Dockerfile`과 동일한 구조, 포트만 8001로 변경.
- `--reload` 옵션으로 코드 변경 시 자동 재시작 (개발 환경용; 프로덕션에서는 제거).

### 5. `docker-compose.yml`에 `fastapi2` 서비스 추가

```yaml
  fastapi2:
    build: ./backend2
    container_name: fastapi2-server
    restart: always
    working_dir: /code
    volumes:
      - ./backend2:/code
    ports:
      - "8001:8001"
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fastapi2.rule=Host(`hexsera.com`) && PathPrefix(`/api2`)"
      - "traefik.http.routers.fastapi2.entrypoints=websecure"
      - "traefik.http.routers.fastapi2.tls.certresolver=cloudflare"
      - "traefik.http.services.fastapi2.loadbalancer.server.port=8001"
```

- 라우터/서비스 이름을 `fastapi2`로 지정해 기존 `fastapi` 라우터와 충돌 방지.
- `PathPrefix('/api2')`로 기존 `/api`와 경로 구분.
- `depends_on` 없음 (DB 미사용).

### 6. 컨테이너 빌드 및 실행

```bash
docker compose build fastapi2
docker compose up -d fastapi2
```

- `build` 단계에서 이미지 빌드 오류를 먼저 확인한다.
- `up -d`로 백그라운드에서 컨테이너 실행.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend2/requirements.txt` | 생성 | 새 서버 Python 패키지 목록 |
| `backend2/main.py` | 생성 | FastAPI 앱 진입점 및 기본 라우터 |
| `backend2/Dockerfile` | 생성 | 새 서버 Docker 이미지 빌드 설정 |
| `docker-compose.yml` | 수정 | `fastapi2` 서비스 블록 추가 |

## 완료 체크리스트

- [ ] `docker compose ps` 실행 시 `fastapi2-server` 컨테이너가 `Up` 상태로 표시된다.
- [ ] `docker compose logs fastapi2` 에 오류 없이 `Uvicorn running on http://0.0.0.0:8001` 가 출력된다.
- [ ] `curl http://localhost:8001/api2/health` 응답이 `{"status":"ok"}` 이다.
- [ ] `curl https://hexsera.com/api2/health` 응답이 `{"status":"ok"}` 이다 (Traefik SSL 라우팅 확인).
- [ ] 기존 `curl https://hexsera.com/api/` 응답이 정상적으로 유지된다 (기존 서버 영향 없음 확인).
