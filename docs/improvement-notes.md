# 개선 사항 노트 (improvement-notes.md)

> 이 문서는 현재 코드베이스의 기술 부채와 잠재적 개선 항목을 기록한다.
> 작성 기준일: 2026-02-17

---

## 1. 폴더 구조 개선 사항

### 1.1 nginx.conf 중복
- **파일**: `./nginx.conf` (프로덕션용, docker-compose 참조), `./nginx/nginx.conf` (로컬 개발용)
- **문제**: 두 파일 내용이 다르고, 어느 파일이 유효한지 이름만으로 구분 불가
- **권장**: `./nginx/nginx.conf`를 삭제하거나 `nginx.conf.dev`로 이름 변경

### 1.2 프론트엔드 .env.example 없음
- **파일**: `frontend/` 디렉토리에 `.env.example` 없음
- **문제**: `vite.config.js`의 프록시 타겟(`http://localhost:8000`)이 하드코딩되어 있어 환경별 설정 분리 불가
- **권장**: `frontend/.env.example` 생성, `VITE_API_URL` 항목 추가

### 1.3 html/ 레거시 디렉토리
- **파일**: `./html/` (audio, assets, images, index.html 포함)
- **문제**: 실 서비스는 `frontend/dist/`를 사용하며 `html/`은 사용되지 않는 레거시로 보임
- **권장**: 사용 여부 확인 후 삭제 또는 목적 주석 추가

### 1.4 docker-compose에 민감 정보 하드코딩
- **파일**: `docker-compose.yml` (environment 섹션)
- **문제**: `CF_DNS_API_TOKEN`, `POSTGRES_PASSWORD`, `MYSQL_ROOT_PASSWORD` 등 민감 정보가 직접 노출
- **권장**: `.env` 파일로 외부화 후 `${VARIABLE}` 형식으로 참조

---

## 2. API 설계 개선 사항

### 2.1 API 버전 불일치
- **파일**: `backend/main.py` (라우터 등록부)
- **문제**: 대부분의 라우터는 `/api/v1/` 접두사를 사용하나, `friends` 라우터만 `/api/friend-requests`(버전 없음)로 등록
- **권장**: `prefix="/api/v1/friend-requests"`로 변경하고, 프론트엔드 호출 URL도 동기화

### 2.2 인증 의존성 미사용
- **파일**: `backend/app/core/security.py`, `backend/app/api/v1/*.py`
- **문제**: `verify_api_key` 의존성이 정의되어 있으나 어떤 라우터에도 적용되지 않아 모든 엔드포인트가 인증 없이 공개
- **권장**: 관리자 작업(사용자 삭제, 목록 조회) 등에 `Depends(verify_api_key)` 추가

### 2.3 디버그 print 문
- **파일**: `backend/app/api/v1/friends.py` (108, 157, 194, 221번째 줄)
- **문제**: `print()` 문이 프로덕션 코드에 남아있어 서버 로그에 불필요한 출력 발생
- **권장**: `import logging` + `logger.debug()`/`logger.info()`로 교체

### 2.4 디버그 엔드포인트 노출
- **파일**: `backend/main.py`
- **문제**: `GET /api/test`, `GET /api/debug/db-info` 엔드포인트가 프로덕션에 노출 — DB 연결 URL 정보 유출 가능
- **권장**: 환경 변수(`DEBUG=true`)로 제어하거나 삭제

### 2.5 HTTP 상태 코드 매직 넘버
- **파일**: `backend/app/api/v1/monthly_scores.py` 등
- **문제**: `status_code=404` 등 숫자 직접 사용. `status.HTTP_404_NOT_FOUND`와 혼용
- **권장**: 전체 코드에서 `from fastapi import status` 후 `status.HTTP_*` 형식으로 통일

### 2.6 sys.path 하드코딩
- **파일**: `backend/app/api/v1/` 하위 5개 파일
- **문제**: 파일 상단에 `sys.path.insert(0, '/code')`로 Docker 컨테이너 내부 절대 경로를 하드코딩
- **권장**: `models.py`를 `backend/app/db/` 또는 `backend/app/models/`로 이동하여 상대 import 사용

---

## 3. 프론트엔드 개선 사항

### 3.1 라우트 가드 없음
- **파일**: `frontend/src/App.jsx`
- **문제**: `/admin`, `/pinball`, `/user/account` 등 인증이 필요한 라우트에 접근 제한 없음. URL 직접 입력 시 비로그인 상태에서 접근 가능
- **권장**: `ProtectedRoute` 컴포넌트를 구현하여 미로그인 시 `/login`으로 리다이렉트, 관리자 페이지는 `role === 'admin'` 추가 검증

### 3.2 API 서비스 레이어 부재
- **파일**: `frontend/src/services/` (비어있음), `frontend/src/pages/` 하위 8개 파일
- **문제**: Login, Register, FriendPage, Pinball 등 모든 페이지에서 axios를 직접 호출. API URL이 각 파일에 분산되어 URL 변경 시 전체 수정 필요
- **권장**: `frontend/src/services/api.js`에 엔드포인트별 함수 집중

### 3.3 환경 변수 미사용
- **파일**: `frontend/vite.config.js`
- **문제**: 개발 서버 프록시 타겟이 `http://localhost:8000`으로 하드코딩되어 있어 다른 포트 사용 시 파일 수정 필요
- **권장**: `frontend/.env` 파일에 `VITE_API_URL` 정의, `vite.config.js`에서 `process.env.VITE_API_URL`로 참조

### 3.4 Dashboard 자동 리다이렉트 없음
- **파일**: `frontend/src/pages/Dashboard/Dashboard.jsx`
- **문제**: 비로그인 사용자가 `/dashboard` 접근 시 로그인 버튼만 표시되고 자동으로 로그인 페이지로 이동하지 않음
- **권장**: 3.1 라우트 가드 적용으로 함께 해결

### 3.5 axios 호출 패턴 불일치
- **파일**: `frontend/src/pages/` 하위 파일들
- **문제**: `HeaderUserInfo.jsx`는 `.then().catch()` 체인, `FriendPage.jsx`는 `async/await` 방식 혼용
- **권장**: `async/await` + `try/catch`로 통일

---

## 4. 의존성 버전 현황

> 기준일: 2026-02-17 / PyPI·npm registry 실측값

### 4.1 백엔드 (requirements.txt)

| 패키지 | 현재 버전 | 최신 버전 | 상태 |
|--------|-----------|-----------|------|
| `fastapi` | 0.109.0 | 0.129.0 | ⚠️ minor 20단계 차이 |
| `uvicorn` | 0.27.0 | 0.40.0 | ⚠️ minor 13단계 차이 |
| `alembic` | 1.13.1 | 1.18.4 | ⚠️ minor 5단계 차이 |
| `pytest` | 8.0.0 | 9.0.2 | ⚠️ major 버전 업 |
| `httpx` | 0.27.0 | 0.28.1 | ℹ️ minor 1단계 차이 |
| `Faker` | 24.0.0 | 40.4.0 | ⚠️ major 16단계 차이 |
| `sqlalchemy` | 2.0.25 | 2.0.46 | ✅ patch만 차이 |
| `psycopg2-binary` | 2.9.9 | 2.9.11 | ✅ patch만 차이 |
| `pymysql` | 1.1.0 | 1.1.2 | ✅ patch만 차이 |

**우선 업데이트 대상**:
- `pytest 8→9`: 주요 변경사항 확인 후 업데이트. 기존 테스트 통과 여부 검증 필요
- `fastapi 0.109→0.129`: Pydantic v2 완전 전환·응답 모델 변경 등 minor 릴리스마다 deprecation 있음
- `uvicorn 0.27→0.40`: lifespan 이벤트 처리 변경 포함

**업데이트 주의사항**:
- `fastapi` + `uvicorn`은 호환 버전을 함께 올려야 함
- `pytest 9.x`에서는 일부 픽스처 API 시그니처 변경 → 테스트 전체 재실행 필수
- `Faker`는 테스트 전용 패키지이므로 부담 없이 업데이트 가능

### 4.2 프론트엔드 (package.json)

| 패키지 | 현재 버전 | 최신 버전 | 상태 |
|--------|-----------|-----------|------|
| `matter-js` | ^0.20.0 | 0.20.0 | ⚠️ pre-1.0 고착 상태 |
| `@mui/x-data-grid` | ^8.26.0 | 8.27.1 | ✅ patch |
| `vite` | ^7.3.0 | 7.3.1 | ✅ patch |
| `@vitejs/plugin-react` | ^5.1.2 | 5.1.4 | ✅ patch |
| `jsdom` | ^28.0.0 | 28.1.0 | ✅ patch |
| `react` | ^19.2.3 | 19.2.4 | ✅ patch |
| `react-router-dom` | ^7.11.0 | 7.13.0 | ✅ minor 2단계 |
| 나머지 패키지 | — | — | ✅ 최신 또는 최신에 근접 |

**특이사항 — `matter-js 0.20.0`**:
- 2026-02-17 기준으로도 `0.20.0`이 최신이며 1.0 정식 릴리스 없음
- 프로젝트가 현재 최신 버전을 사용 중이지만 라이브러리 자체가 장기간 pre-1.0 상태로 유지됨
- 대안 물리 엔진(`Rapier.js`, `planck.js`) 검토 필요 여부를 중장기 과제로 기록
- `Pinball.jsx`에서 `Matter.*` API를 직접 호출하는 코드가 다수 있어 교체 비용이 높음

**@mui/material v7 + @mui/x v8 버전 혼용**:
- MUI core(v7)와 MUI X(v8)는 독립 버저닝이므로 혼용은 의도된 것이며 지원되는 조합임
- 단, 공식 호환 매트릭스 확인 권장 (MUI X v8 → MUI core v6 이상 필요)

---

## 5. 구버전 API 사용 현황

> 현재 설치된 라이브러리 버전 기준으로, 이미 deprecated되었거나 이전 메이저 버전 스타일로 작성된 코드 목록

### 5.1 백엔드

#### 5.1.1 SQLAlchemy 1.x 스타일 `query()` API — 34곳 (심각도: 높음)

- **패턴**: `db.query(Model).filter(...).first()` / `.all()` / `.delete()`
- **현재 SQLAlchemy 버전**: 2.0.25 (SQLAlchemy 2.0에서 deprecated)
- **권장 패턴**: `select()` + `db.execute()` 스타일

| 파일 | 해당 줄 (대표) |
|------|----------------|
| `backend/app/api/v1/users.py` | 31, 59, 75, 91, 100, 113, 128, 137, 140, 144 |
| `backend/app/api/v1/auth.py` | 27, 56 |
| `backend/app/api/v1/monthly_scores.py` | 41, 51, 83, 104, 126, 148 |
| `backend/app/api/v1/game_visits.py` | 56, 68, 117, 125, 215 |
| `backend/app/api/v1/friends.py` | 38, 53, 76, 131, 179, 206 |
| `backend/seed.py` | 15 |

**마이그레이션 예시**:
```python
# 구버전 (SQLAlchemy 1.x 스타일 — deprecated)
user = db.query(User).filter(User.email == email).first()

# 신버전 (SQLAlchemy 2.0 권장)
from sqlalchemy import select
stmt = select(User).where(User.email == email)
user = db.execute(stmt).scalar_one_or_none()
```

#### 5.1.2 Pydantic v2 — `class Config:` 이너 클래스 패턴 (심각도: 낮음)

- **패턴**: 스키마 내부에 `class Config: from_attributes = True` 사용
- **현재 Pydantic 버전**: v2 (FastAPI 0.109 내장)
- **문제**: `from_attributes`는 이미 v2 이름이지만, 이너 `class Config` 선언 방식 자체가 Pydantic v2에서 deprecated

| 파일 | 줄 |
|------|----|
| `backend/app/schemas/user.py` | ~41-42 |
| `backend/app/schemas/monthly_score.py` | ~24-25 |
| `backend/app/schemas/friendship.py` | ~28-29 |

**마이그레이션 예시**:
```python
# 구버전 (Pydantic v2에서 deprecated)
class UserResponse(BaseModel):
    id: int
    class Config:
        from_attributes = True

# 신버전 (Pydantic v2 권장)
from pydantic import BaseModel, ConfigDict
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
```

#### 5.1.3 `Base.metadata.create_all()` 프로덕션 코드 내 사용 (심각도: 중간)

- **파일**: `backend/main.py` (28번째 줄)
- **문제**: 서버 시작 시 `Base.metadata.create_all(bind=engine)` 직접 호출. Alembic이 적용된 프로젝트에서 마이그레이션 이력을 우회하는 안티패턴
- **권장**: `main.py`에서 해당 호출 제거, `alembic upgrade head`로만 스키마 관리
- **참고**: `tests/conftest.py`의 테스트용 `create_all()`은 허용 범위

---

### 5.2 프론트엔드

#### 5.2.1 MUI `Grid` + `size` prop 혼용 (심각도: 낮음)

- **파일**: `frontend/src/pages/HomePage/HomePage.jsx` (4, 88, 90, 112번째 줄)
- **문제**: `@mui/material`에서 `Grid`를 import하면서 MUI v6+의 `Grid2` 전용 `size` prop 문법을 사용
  ```jsx
  // 현재 코드 — Grid를 import했으나 Grid2 문법 사용
  import { ..., Grid, ... } from '@mui/material';
  <Grid size={{ xs: 12, md: 8 }}>  // ← size prop은 Grid2 API
  ```
- **현재 상태**: MUI v7 하위호환 레이어 덕분에 동작하지만, 향후 버전에서 `Grid` 제거 시 깨질 수 있음
- **권장**:
  ```jsx
  // 옵션 A — Grid2로 교체 (권장)
  import { Grid2 as Grid } from '@mui/material';

  // 옵션 B — 기존 Grid 문법으로 통일
  <Grid item xs={12} md={8}>
  ```

---

**전체 요약**:

| 항목 | 심각도 | 영향 파일 수 | 수정 비용 |
|------|--------|-------------|-----------|
| SQLAlchemy `query()` API | 높음 | 6개 파일 (34곳) | 높음 |
| Pydantic `class Config` 이너 클래스 | 낮음 | 3개 파일 | 매우 낮음 |
| `metadata.create_all()` 프로덕션 호출 | 중간 | 1개 파일 | 낮음 |
| MUI `Grid` + `size` prop 혼용 | 낮음 | 1개 파일 | 낮음 |
