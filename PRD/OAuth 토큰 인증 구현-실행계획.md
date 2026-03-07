# OAuth 토큰 인증 구현 실행계획

## 요구사항 요약

**요구사항**: 평문 비밀번호 비교 + localStorage 기반 인증을 JWT(Access/Refresh Token) 방식으로 교체하고, 비밀번호를 bcrypt로 해싱해 저장한다.

**목적**: 현재 평문 비밀번호가 DB에 저장되고, 인증 없이 모든 API에 접근 가능한 보안 취약점을 해결한다.

## 현재상태 분석

- `backend/app/api/v1/auth.py`: `user.password != login_request.password` 로 평문 직접 비교
- `backend/app/core/security.py`: `X-API-Key` 헤더 방식만 존재, JWT 없음
- `backend/app/api/deps.py`: `get_db()` 만 존재, `get_current_user()` 없음
- `backend/models.py`: `User.password` 컬럼 `String(255)` — bcrypt 해시 저장 가능한 길이
- `backend/models.py`: `refresh_token` 컬럼 없음 — Alembic 마이그레이션 필요
- `backend/requirements.txt`: `python-jose`, `passlib` 미포함
- 모든 라우터(users, monthly_scores, game_visits, friends)에 인증 의존성 미적용

## 구현 방법

- **JWT**: `python-jose[cryptography]` 로 HS256 알고리즘 Access/Refresh Token 생성/검증
- **비밀번호**: `passlib[bcrypt]` 로 해싱 및 검증
- **인증 의존성**: FastAPI `Depends`로 `get_current_user()` 를 각 라우터에 주입
- **Refresh Token 저장**: DB `users.refresh_token` 컬럼에 저장 (Alembic 마이그레이션)
- **보호 범위**: 조회성 API(GET monthly_scores, GET game_visits)는 공개, 쓰기/삭제 API는 인증 필요

## PHASE 1 — 비밀번호 해싱 저장

> JWT 인증과 독립적으로 먼저 적용한다. 이 단계 완료 후 로그인은 여전히 기존 방식으로 동작하되, 비밀번호는 bcrypt 해시로 저장된다.

### 1. 패키지 추가 (`backend/requirements.txt`)
```text
passlib[bcrypt]==1.7.4
```
- `passlib[bcrypt]`: bcrypt 해싱 알고리즘 지원 라이브러리
- PHASE 1에서는 `python-jose` 불필요 (PHASE 2에서 추가)

### 2. bcrypt 유틸 구현 (`backend/app/core/security.py`)
```python
from passlib.context import CryptContext
from fastapi import HTTPException, Depends
from fastapi.security import APIKeyHeader
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def verify_api_key(api_key: str = Depends(API_KEY_HEADER)) -> str:
    if api_key is None:
        raise HTTPException(status_code=401, detail="API Key is missing")
    if api_key != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key
```
- 기존 `verify_api_key` 유지, `hash_password` / `verify_password` 추가
- `CryptContext`: `bcrypt` 알고리즘으로 해싱. `deprecated="auto"` 는 구버전 해시 자동 감지

### 3. auth.py / users.py 수정 — 로그인/회원가입에 bcrypt 적용
```python
# auth.py POST /register: 비밀번호 해싱 후 저장
from app.core.security import hash_password, verify_password

db_user = User(password=hash_password(user.password), ...)

# auth.py POST /login: 평문 비교 → verify_password 로 교체
if not verify_password(login_request.password, user.password):
    raise HTTPException(status_code=401, detail="Invalid email or password")

# users.py POST "": create_user 에도 동일하게 적용
db_user = User(password=hash_password(user.password), ...)
```
- 기존 `user.password != login_request.password` 평문 비교 제거
- `users.py` `create_user` 도 동일하게 `hash_password` 적용

### 4. seed.py — admin 계정 생성에 hash_password 적용
```python
# backend/seed.py
from app.core.security import hash_password

admin_user = User(
    password=hash_password(os.getenv("ADMIN_PASSWORD")),
    ...
)
```
- 컨테이너 기동 시 자동으로 실행되는 시딩 로직
- 적용하지 않으면 admin 비밀번호만 평문으로 남음

### 5. tests/conftest.py — sample_users fixture에 hash_password 적용
```python
# backend/tests/conftest.py
from app.core.security import hash_password

user1 = User(password=hash_password("password1"), ...)
user2 = User(password=hash_password("password2"), ...)
```
- fixture는 DB에 직접 삽입하므로 반드시 해싱 필요
- 미적용 시 테스트에서 로그인 API 호출 시 인증 실패 발생

### 6. scripts/mock/seed_mock_data.py — mock 유저 생성에 hash_password 적용
```python
# backend/scripts/mock/seed_mock_data.py
from app.core.security import hash_password

user = User(password=hash_password("password123!"), ...)
```
- mock 데이터도 평문 저장 시 DB 전체 일관성이 깨짐

### 7. 기존 유저 비밀번호 재해싱 스크립트
```python
# backend/scripts/rehash_passwords.py
import sys; sys.path.insert(0, '/code')
from app.db.session import SessionLocal
from app.core.security import hash_password
from models import User

db = SessionLocal()
for user in db.query(User).all():
    if not user.password.startswith("$2b$"):
        user.password = hash_password(user.password)
db.commit()
db.close()
print("완료")
```
```bash
docker compose exec fastapi python /code/scripts/rehash_passwords.py
```
- `$2b$` 로 시작하지 않는 평문 비밀번호만 재해싱, 이미 해시된 경우 스킵
- 스크립트는 1회 실행 후 삭제해도 무방

---

## PHASE 2 — JWT 토큰 인증

> PHASE 1 완료 후 진행. 로그인 응답에 토큰을 추가하고, 보호 API에 인증 의존성을 적용한다.

### 5. 패키지 추가 (`backend/requirements.txt`)
```text
python-jose[cryptography]==3.3.0
```
- `python-jose`: JWT 생성/검증 라이브러리 (HS256 알고리즘 사용)

### 6. 환경변수 추가 (`backend/.env`, `backend/app/core/config.py`)
```python
# config.py 추가 항목
SECRET_KEY: str = os.getenv("SECRET_KEY")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
```
```text
# .env 추가 항목
SECRET_KEY=your-secret-key-here-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```
- `SECRET_KEY`: JWT 서명에 사용하는 비밀키. 운영 환경에서는 반드시 무작위 값으로 설정

### 7. JWT 유틸 추가 (`backend/app/core/security.py`)
```python
from datetime import datetime, timedelta
from jose import jwt

def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm="HS256")

def create_refresh_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
```
- `decode_token`: 토큰 위조/만료 시 `JWTError` 예외 발생

### 8. DB 마이그레이션 — refresh_token 컬럼 추가
```python
# backend/models.py User 클래스에 추가
refresh_token = Column(String(512), nullable=True)
```
```bash
docker compose exec fastapi alembic revision --autogenerate -m "add refresh_token to users"
docker compose exec fastapi alembic upgrade head
```
- `String(512)`: JWT는 기본적으로 200~400자이므로 512자로 충분
- `nullable=True`: 기존 유저 데이터 보존을 위해 nullable 설정

### 9. auth.py 수정 — 토큰 반환 및 /token/refresh 엔드포인트
```python
# POST /login 응답에 토큰 추가
from app.core.security import create_access_token, create_refresh_token

access_token = create_access_token({"sub": str(user.id)})
refresh_token_str = create_refresh_token({"sub": str(user.id)})
user.refresh_token = refresh_token_str
db.commit()
return {"access_token": access_token, "refresh_token": refresh_token_str, "token_type": "bearer"}

# POST /token/refresh 신규 엔드포인트
@router.post("/token/refresh")
def refresh_token(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
    except Exception:
        raise HTTPException(401, "Invalid refresh token")
    if user is None or user.refresh_token != body.refresh_token:
        raise HTTPException(401, "Invalid refresh token")
    return {"access_token": create_access_token({"sub": str(user.id)}), "token_type": "bearer"}
```
- 로그인 성공 시 refresh_token을 DB에 저장해 재사용 방지

### 10. get_current_user 의존성 구현 (`backend/app/api/deps.py`)
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from app.core.security import decode_token
import sys; sys.path.insert(0, '/code')
from models import User

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db = Depends(get_db)
) -> User:
    try:
        payload = decode_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```
- `HTTPBearer()`: `Authorization: Bearer <token>` 헤더를 자동 파싱

### 11. 보호 API에 의존성 적용

**보호 대상 (인증 필요):**

| 라우터 | 보호할 엔드포인트 | 이유 |
|--------|------------------|------|
| users.py | PUT /{user_id}, DELETE /{user_id} | 본인 정보 수정/삭제 |
| users.py | POST "" (관리자용) | 관리자만 직접 유저 생성 |
| monthly_scores.py | POST "", PUT /{user_id}, DELETE /{user_id} | 점수 쓰기/삭제 |
| game_visits.py | DELETE "" | 방문 기록 삭제 |
| friends.py | POST "", POST /accept, POST /reject | 친구 관계 변경 |

**공개 유지 (인증 불필요):**
- GET /users, GET /users/{id}: 사용자 검색/조회
- GET /monthly-scores: 랭킹 조회
- GET /game-visits: 통계 조회
- POST /game-visits, PUT /game-visits: 익명 방문 기록

```python
# 예시: users.py PUT 엔드포인트
from app.api.deps import get_current_user
from models import User as UserModel

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)  # 추가
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    ...
```
- `Depends(get_current_user)` 를 함수 파라미터에 추가하는 것만으로 적용
- 관리자(`role="admin"`)는 모든 보호 API에 접근 가능

## 수정/생성할 파일 목록

### PHASE 1

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/requirements.txt` | 수정 | `passlib[bcrypt]` 추가 |
| `backend/app/core/security.py` | 수정 | `hash_password`, `verify_password` 함수 추가 |
| `backend/app/api/v1/auth.py` | 수정 | 로그인 `verify_password` 적용, 회원가입 `hash_password` 적용 |
| `backend/app/api/v1/users.py` | 수정 | `create_user` 에 `hash_password` 적용 |
| `backend/seed.py` | 수정 | admin 계정 생성 시 `hash_password` 적용 |
| `backend/tests/conftest.py` | 수정 | `sample_users` fixture 에 `hash_password` 적용 |
| `backend/scripts/mock/seed_mock_data.py` | 수정 | mock 유저 생성 시 `hash_password` 적용 |
| `backend/scripts/rehash_passwords.py` | 생성 | 기존 평문 비밀번호 bcrypt 재해싱 1회성 스크립트 |

### PHASE 2

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/requirements.txt` | 수정 | `python-jose[cryptography]` 추가 |
| `backend/.env` | 수정 | `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` 추가 |
| `backend/app/core/config.py` | 수정 | JWT 관련 환경변수 3개 Settings 클래스에 추가 |
| `backend/app/core/security.py` | 수정 | JWT 생성/검증 함수 추가 |
| `backend/models.py` | 수정 | `User.refresh_token` 컬럼 추가 |
| `backend/app/api/deps.py` | 수정 | `get_current_user()` 의존성 함수 추가 |
| `backend/app/api/v1/auth.py` | 수정 | 로그인 토큰 반환, `/token/refresh` 엔드포인트 추가 |
| `backend/app/api/v1/users.py` | 수정 | PUT/DELETE/POST에 `get_current_user` 의존성 적용 |
| `backend/app/api/v1/monthly_scores.py` | 수정 | POST/PUT/DELETE에 `get_current_user` 의존성 적용 |
| `backend/app/api/v1/game_visits.py` | 수정 | DELETE에 `get_current_user` 의존성 적용 |
| `backend/app/api/v1/friends.py` | 수정 | POST/accept/reject에 `get_current_user` 의존성 적용 |
| `backend/alembic/versions/*.py` | 생성 | `users.refresh_token` 컬럼 추가 마이그레이션 |

## 완료 체크리스트

### PHASE 1

- [ ] 회원가입(`POST /api/v1/register`) 후 DB `users.password` 값이 `$2b$` 로 시작하는 문자열이다
- [ ] 재해싱 스크립트 실행 후 DB `SELECT password FROM users` 에서 모든 값이 `$2b$` 로 시작한다
- [ ] bcrypt 해시된 비밀번호로 `POST /api/v1/login` 호출 시 HTTP 200이 반환된다
- [ ] 틀린 비밀번호로 `POST /api/v1/login` 호출 시 HTTP 401이 반환된다
- [ ] `docker compose exec fastapi pytest` 실행 시 기존 테스트가 모두 통과한다

### PHASE 2

- [ ] `docker compose exec fastapi alembic upgrade head` 실행 후 에러 없이 완료된다
- [ ] `POST /api/v1/login` 응답 JSON에 `access_token`, `refresh_token`, `token_type` 필드가 있다
- [ ] `Authorization` 헤더 없이 `PUT /api/v1/users/{id}` 호출 시 HTTP 401이 반환된다
- [ ] 유효한 `Authorization: Bearer <token>` 헤더로 `PUT /api/v1/users/{id}` 호출 시 HTTP 200이 반환된다
- [ ] `POST /api/v1/token/refresh` 에 유효한 Refresh Token 전송 시 새 `access_token`이 반환된다
- [ ] 만료되거나 위조된 토큰으로 보호된 API 호출 시 HTTP 401이 반환된다
- [ ] `GET /api/v1/users`, `GET /api/v1/monthly-scores` 는 토큰 없이 HTTP 200이 반환된다
- [ ] `POST /api/v1/game-visits` 는 토큰 없이 익명 방문 기록이 생성된다
