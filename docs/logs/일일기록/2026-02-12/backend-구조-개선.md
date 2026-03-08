# Backend 폴더 구조 개선 PRD

## 목표

현재 backend 폴더는 레거시 파일(database.py, auth.py, models.py)과 새 모듈화 구조(app/)가 혼재하는 상태다.
전문적인 FastAPI 프로젝트 구조로 정리하여 유지보수성과 확장성을 높인다.

## 현재상태 분석

**이중 구조 혼재 문제:**
- `database.py` (레거시) vs `app/db/session.py` (새 구조): 동일한 DB 세션 설정이 두 곳에 존재
- `auth.py` (레거시, API Key 하드코딩) vs `app/core/security.py` (환경변수 사용): 동일한 API Key 검증 로직 중복
- `models.py` (root에 위치): 모든 라우터가 `sys.path.insert(0, '/code')`로 절대경로 하드코딩 후 import

**보안 문제:**
- 비밀번호 평문 저장 및 평문 비교 (해싱 없음)
- API Key가 `auth.py`에 하드코딩 (환경변수 미사용)

**구현되지 않은 기능:**
- Score API: 점수 저장만 있고 조회/갱신 없음
- 인증: 모든 엔드포인트가 인증 없음 (users CRUD 포함)

**불필요한 파일:**
- `migrate_data.py`: MySQL→PostgreSQL 마이그레이션 완료 후 불필요
- `database.py`, `auth.py`: 새 구조로 교체 후 불필요

## 실행 방법 및 단계

1. **models.py를 app/models/ 로 이동**: `app/models/__init__.py`, `app/models/user.py`, `app/models/score.py` 등으로 분리
2. **모든 라우터의 import 경로 정규화**: `sys.path.insert` 제거, `from app.models.user import User` 형태로 통일
3. **app/db/base.py 수정**: root의 models.py 대신 app/models/ 에서 import
4. **레거시 파일 삭제**: `database.py`, `auth.py` 삭제, 모든 코드가 `app/db/session.py`, `app/core/security.py` 사용 확인 후 삭제
5. **비밀번호 해싱 구현**: `passlib[bcrypt]` 설치, register/login 엔드포인트에 해싱 적용
6. **Score 조회/갱신 API 구현**: `GET /api/v1/scores/user/{user_id}`, `PUT /api/v1/scores/{id}` 엔드포인트 추가
7. **migrate_data.py 삭제**: 마이그레이션 완료 확인 후 삭제
8. **requirements.txt 정리**: pymysql 제거 (PostgreSQL 전환 완료), passlib[bcrypt] 추가

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|-------------|------|
| FastAPI | 웹 프레임워크 (현재 사용 중, 유지) |
| SQLAlchemy 2.x | ORM (현재 사용 중, 유지) |
| Alembic | DB 마이그레이션 (현재 사용 중, 유지) |
| passlib[bcrypt] | 비밀번호 해싱 (신규 추가) |
| psycopg2-binary | PostgreSQL 드라이버 (현재 사용 중, 유지) |
| python-dotenv | 환경변수 로드 (현재 사용 중, 유지) |

## 최종 목표 구조

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── auth.py, users.py, scores.py, high_scores.py
│   │       ├── monthly_scores.py, game_visits.py, friends.py
│   ├── core/
│   │   ├── config.py
│   │   └── security.py
│   ├── db/
│   │   ├── session.py
│   │   └── base.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py, score.py, friendship.py
│   │   ├── high_score.py, monthly_score.py, game_visit.py
│   └── schemas/
│       ├── user.py, score.py, friendship.py
│       ├── high_score.py, monthly_score.py, game_visit.py
├── alembic/
├── tests/
├── main.py
├── seed.py
├── requirements.txt
├── Dockerfile
├── alembic.ini
├── pytest.ini
├── .env
└── .env.example
```

## 테스트 방법

1. Docker 컨테이너 재빌드 후 `docker compose up -d` 실행, FastAPI 정상 기동 확인
2. `http://localhost:8000/docs` Swagger UI에서 모든 엔드포인트 목록 정상 표시 확인
3. POST /api/v1/register 로 회원가입 후 DB에서 비밀번호가 해시값으로 저장됐는지 확인
4. POST /api/v1/login 으로 로그인 시 해시 비밀번호 검증 후 정상 응답 확인
5. `docker exec fastapi-server python -c "from app.models.user import User; print('OK')"` 실행

## 체크리스트

- [ ] `docker compose up -d` 실행 시 fastapi 컨테이너가 오류 없이 기동됨
- [ ] Swagger UI(`/docs`)에서 모든 기존 엔드포인트가 정상 표시됨
- [ ] root에 `database.py`, `auth.py`, `migrate_data.py` 파일이 존재하지 않음
- [ ] 모든 라우터 파일에 `sys.path.insert` 코드가 존재하지 않음
- [ ] 회원가입 후 DB의 password 컬럼 값이 `$2b$` 로 시작하는 bcrypt 해시값임
- [ ] 올바른 비밀번호로 로그인 시 200 응답, 틀린 비밀번호로 로그인 시 401 응답
- [ ] requirements.txt에 `pymysql`이 없고 `passlib[bcrypt]`가 있음
