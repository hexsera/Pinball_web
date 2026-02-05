# MySQL에서 PostgreSQL로 이동 실행계획

## 요구사항 요약

**요구사항**: 현재 MySQL 데이터베이스 환경을 PostgreSQL 환경으로 전환

**목적**: PostgreSQL 환경 추가 구축 (MySQL은 유지)

## 현재상태 분석

- **데이터베이스**: MySQL 8.0 (Docker 컨테이너, mysql-server)
- **ORM**: SQLAlchemy 2.0.25 + PyMySQL 드라이버
- **모델**: User, Score, Friendship, MonthlyScore, GameVisit (5개 테이블)
- **마이그레이션**: Alembic 사용 중
- **환경변수**: MYSQL_* 접두사로 .env에 정의

## 구현 방법

SQLAlchemy의 데이터베이스 독립적 ORM 특성을 활용하여 드라이버만 변경한다. PostgreSQL 드라이버(psycopg2)를 추가하고, 환경변수와 DATABASE_URL 형식을 PostgreSQL에 맞게 수정한다.

## 구현 단계

## Phase 1: PostgreSQL 환경 구축

### 1. PostgreSQL 드라이버 추가 (requirements.txt)
```txt
psycopg2-binary==2.9.9
```
- **무엇을 하는가**: Python에서 PostgreSQL과 통신하기 위한 드라이버 설치
- psycopg2-binary는 사전 빌드된 바이너리로 설치가 간편함

### 2. docker-compose.yml에 PostgreSQL 서비스 추가
```yaml
  postgres:
    image: postgres:16
    container_name: postgres-server
    restart: always
    environment:
      POSTGRES_DB: hexdb
      POSTGRES_USER: hexsera
      POSTGRES_PASSWORD: hexpoint
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hexsera -d hexdb"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - web
```
- **무엇을 하는가**: PostgreSQL 16 컨테이너를 Docker 네트워크에 추가
- MySQL과 동일한 데이터베이스명, 사용자명, 비밀번호 사용
- volumes 섹션에 `postgres-data:` 추가 필요
- **healthcheck 설명**: PostgreSQL이 연결 가능 상태인지 주기적으로 확인
  - `pg_isready`: PostgreSQL 연결 가능 여부 확인 명령어
  - `-U hexsera -d hexdb`: hexsera 사용자로 hexdb 데이터베이스에 접속 시도
  - `interval: 5s`: 5초마다 체크
  - `retries: 10`: 최대 10번 재시도 (총 50초)
- **왜 필요한가**: FastAPI가 PostgreSQL 완전 준비 후 시작하도록 보장 (depends_on과 함께 사용)

## Phase 2: 애플리케이션 코드 수정

### 3. .env 환경변수 수정
```env
# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql+psycopg2://hexsera:hexpoint@postgres-server:5432/hexdb
```
- **무엇을 하는가**: DATABASE_URL을 환경변수로 직접 관리하여 코드 중복 제거
- 형식: `postgresql+psycopg2://사용자:비밀번호@호스트:포트/데이터베이스명`
- 기존 MYSQL_* 변수를 하나의 DATABASE_URL로 통합

### 4. database.py 수정
```python
import os
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```
- **무엇을 하는가**: 환경변수에서 DATABASE_URL을 직접 읽어옴
- f-string으로 조합하던 방식을 단순 환경변수 참조로 변경
- 코드가 간결해지고 .env 파일만 수정하면 됨

### 5. app/core/config.py 수정
```python
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """애플리케이션 설정"""
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # API Key
    API_KEY: str = os.getenv("API_KEY")

    # Admin Seeding
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL")
    ADMIN_NICKNAME: str = os.getenv("ADMIN_NICKNAME")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD")
    ADMIN_BIRTH_DATE: str = os.getenv("ADMIN_BIRTH_DATE")

settings = Settings()
```
- **무엇을 하는가**: Settings 클래스에서 DATABASE_URL을 직접 환경변수로 읽음
- 개별 DB_* 변수와 @property 메서드 제거
- 코드가 간결해지고 DATABASE_URL만 관리하면 됨

### 6. alembic/env.py 수정
```python
from logging.config import fileConfig
import os
from dotenv import load_dotenv

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

load_dotenv()

config = context.config

DATABASE_URL = os.getenv("DATABASE_URL")
config.set_main_option('sqlalchemy.url', DATABASE_URL)
```
- **무엇을 하는가**: Alembic 마이그레이션이 환경변수 DATABASE_URL을 사용하도록 변경
- f-string 조합 제거하고 환경변수 직접 참조
- .env 파일만 수정하면 모든 파일에 자동 반영됨

### Phase 2 완료 체크리스트

- [x] `.env` 파일에 DATABASE_URL이 `postgresql+psycopg2://` 형식으로 설정됨
- [x] `backend/database.py`가 `os.getenv("DATABASE_URL")`을 사용함
- [x] `backend/app/core/config.py`의 Settings 클래스가 DATABASE_URL 환경변수를 사용함
- [x] `backend/alembic/env.py`가 `os.getenv("DATABASE_URL")`을 사용함
- [x] 모든 파일에서 DATABASE_URL f-string 조합 코드가 제거됨
- [x] Python 문법 오류가 없음 (import 문, 환경변수 참조 등)

## Phase 3: 배포 및 마이그레이션

### 오류 해결: ModuleNotFoundError: No module named 'psycopg2'

**원인**:
- requirements.txt에 psycopg2-binary를 추가했지만 Docker 컨테이너 내부에 설치되지 않음
- 기존에 빌드된 Docker 이미지는 psycopg2-binary가 없는 상태
- requirements.txt 변경 후 Docker 이미지를 재빌드하지 않아서 발생

**해결 방법**:
```bash
# FastAPI 컨테이너 중지 및 제거
docker compose stop fastapi
docker compose rm -f fastapi

# 이미지 재빌드 (--no-cache로 완전히 새로 빌드)
docker compose build --no-cache fastapi

# 또는 docker compose up 시 --build 옵션 사용
docker compose up -d --build fastapi
```

**왜 이렇게 해야 하는가**:
- Docker는 Dockerfile을 기반으로 이미지를 빌드하고 캐싱함
- requirements.txt 변경만으로는 자동으로 재설치되지 않음
- `--build` 또는 `build --no-cache`로 강제 재빌드 필요
- 재빌드 시 `RUN pip install -r requirements.txt` 단계에서 psycopg2-binary 설치됨

### 7. docker-compose.yml의 fastapi depends_on 수정
```yaml
  fastapi:
      build: ./backend
      container_name: fastapi-server
      restart: always
      working_dir: /code
      volumes:
        - ./backend:/code
      ports:
        - "8000:8000"
      depends_on:
        - postgres
      networks:
        - web
```
- **무엇을 하는가**: FastAPI가 MySQL 대신 PostgreSQL 시작을 대기하도록 변경

### 8. Docker 이미지 재빌드 (psycopg2-binary 설치)
```bash
# FastAPI 컨테이너 중지 및 제거
docker compose stop fastapi
docker compose rm -f fastapi

# 이미지 재빌드
docker compose build --no-cache fastapi

# 컨테이너 재시작
docker compose up -d fastapi
```
- **무엇을 하는가**: requirements.txt 변경사항을 Docker 이미지에 반영
- `--no-cache`: 캐시를 사용하지 않고 완전히 새로 빌드
- 재빌드 시 psycopg2-binary가 설치됨

### 9. 새 Alembic 마이그레이션 초기화
```bash
# 기존 마이그레이션 폴더 백업
mv backend/alembic/versions backend/alembic/versions_mysql_backup

# 새 versions 폴더 생성
mkdir backend/alembic/versions

# PostgreSQL용 초기 마이그레이션 생성
docker exec fastapi-server alembic revision --autogenerate -m "initial postgresql migration"

# 마이그레이션 적용
docker exec fastapi-server alembic upgrade head
```
- **무엇을 하는가**: PostgreSQL에 맞는 새로운 마이그레이션 히스토리 시작
- 기존 MySQL 마이그레이션은 백업 폴더에 보관

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/requirements.txt | 수정 | psycopg2-binary 추가 |
| docker-compose.yml | 수정 | postgres 서비스 추가, fastapi depends_on 변경 |
| backend/.env | 수정 | DATABASE_URL 환경변수 추가 (postgresql+psycopg2) |
| backend/.env.example | 수정 | DATABASE_URL 예시 업데이트 |
| backend/database.py | 수정 | os.getenv("DATABASE_URL") 사용 |
| backend/app/core/config.py | 수정 | Settings에 DATABASE_URL 환경변수 추가 |
| backend/alembic/env.py | 수정 | os.getenv("DATABASE_URL") 사용 |
| backend/alembic/versions_mysql_backup/ | 생성 | 기존 마이그레이션 백업 |

## 완료 체크리스트

- [ ] `docker compose up -d postgres` 실행 시 PostgreSQL 컨테이너 정상 시작
- [ ] `docker exec postgres-server psql -U hexsera -d hexdb -c "\dt"` 실행 시 테이블 목록 출력
- [ ] `docker compose up -d fastapi` 실행 시 FastAPI 정상 시작 (로그에 "Database connected successfully" 출력)
- [ ] `curl http://localhost:8000/api/` 실행 시 헬스 체크 응답 수신
- [ ] `curl -X POST http://localhost:8000/api/v1/register -H "Content-Type: application/json" -d '{"email":"test@test.com","nickname":"test","password":"test123","birth_date":"2000-01-01"}'` 실행 시 201 응답
- [ ] MySQL 컨테이너(`mysql-server`)가 여전히 존재하고 데이터 보존됨
