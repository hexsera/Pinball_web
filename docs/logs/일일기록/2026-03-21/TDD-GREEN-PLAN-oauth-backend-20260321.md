# TDD GREEN 계획: OAuth 2.0 Authorization Server 백엔드

## 요구사항 요약

**요구사항**: TDD RED 단계에서 작성한 30개 테스트를 통과하는 최소한의 프로덕션 코드를 작성한다.

**목적**: Bearer Token 기반 OAuth 2.0 Authorization Code Flow를 백엔드에 구현해 토큰 인증 체계를 확립한다.

---

## 현재상태 분석

- `requirements.txt`: `python-jose` 없음, `Authlib==1.6.9` 있음
- `app/core/`: `config.py`, `security.py`만 존재. `auth_codes.py`, `jwt_utils.py`, `dependencies.py` 없음
- `app/api/v1/oauth.py`: 파일 없음 — 테스트에서 `/api/v1/oauth/*` 404 반환
- `main.py`: oauth 라우터 미등록
- `config.py`: `os.getenv` 기반 `Settings` 클래스, `SECRET_KEY` 없음

---

## 구현 방법

- JWT 생성/검증: `python-jose[cryptography]` (HS256 알고리즘)
- Authorization Code: 서버 메모리 dict (`_codes`) — 단일 프로세스 환경
- Bearer 인증: FastAPI `HTTPBearer` 의존성으로 헤더 파싱 후 JWT 검증
- 클라이언트 등록: DB 없이 설정 파일(`oauth_clients.py`) dict로 관리

---

## 구현 단계

### 1. requirements.txt — python-jose 추가

```text
python-jose[cryptography]==3.3.0
```
- JWT 서명(HS256) 및 검증에 사용. `cryptography` 백엔드 포함 버전으로 설치

---

### 2. oauth_clients.py — 내부 클라이언트 등록

```python
# backend/app/core/oauth_clients.py
OAUTH_CLIENTS = {
    "pinball-web-client": {
        "client_id": "pinball-web-client",
        "redirect_uris": [
            "https://hexsera.com/callback",
            "http://localhost:5173/callback",
        ],
        "scope": "openid profile",
        "grant_types": ["authorization_code"],
        "response_types": ["code"],
    }
}
```
- 허용된 `redirect_uris` 외 주소로 code 발급 차단. DB 없이 설정 파일로 관리

---

### 3. auth_codes.py — Authorization Code 임시 저장소

```python
# backend/app/core/auth_codes.py
import secrets, time
from typing import Dict

_codes: Dict[str, dict] = {}

def create_code(user_id: int, client_id: str, redirect_uri: str) -> str:
    code = secrets.token_urlsafe(32)
    _codes[code] = {
        "user_id": user_id, "client_id": client_id,
        "redirect_uri": redirect_uri,
        "expires_at": time.time() + 600,
    }
    return code

def consume_code(code: str) -> dict | None:
    data = _codes.pop(code, None)
    if data and data["expires_at"] > time.time():
        return data
    return None
```
- `consume_code`는 pop으로 즉시 삭제 — 재사용 방지. 만료 시 None 반환

---

### 4. config.py — SECRET_KEY 추가

```python
# backend/app/core/config.py (기존 Settings 클래스에 추가)
SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
```
- JWT 서명 키. 환경변수 `SECRET_KEY`로 주입, 없으면 개발용 기본값 사용

---

### 5. jwt_utils.py — JWT 생성/검증

```python
# backend/app/core/jwt_utils.py
from jose import jwt
from datetime import datetime, timedelta
from app.core.config import settings

ALGORITHM = "HS256"

def create_access_token(user_id: int, email: str, role: str) -> str:
    payload = {
        "sub": str(user_id), "email": email, "role": role,
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iat": datetime.utcnow(), "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(days=30),
        "iat": datetime.utcnow(), "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
```
- Access Token: 만료 1시간, sub/email/role/type='access' 포함
- Refresh Token: 만료 30일, sub/type='refresh' 포함 (email/role 없음)
- `decode_token`: 잘못된 토큰 시 `jose.JWTError` 발생

---

### 6. dependencies.py — Bearer Token 인증 의존성

```python
# backend/app/core/dependencies.py
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.jwt_utils import decode_token
import sys; sys.path.insert(0, '/code')
from models import User

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```
- `auto_error=False`: 헤더 없을 때 자동 에러 대신 None 반환 → 직접 401 처리
- JWT 검증 실패 또는 사용자 없으면 401 반환

---

### 7. oauth.py — Authorization/Token/Me 엔드포인트

```python
# backend/app/api/v1/oauth.py
from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core.oauth_clients import OAUTH_CLIENTS
from app.core.auth_codes import create_code, consume_code
from app.core.jwt_utils import create_access_token, create_refresh_token
from app.core.dependencies import get_current_user
import sys; sys.path.insert(0, '/code')
from models import User

router = APIRouter()

@router.get("/oauth/authorize")
def authorize(
    response_type: str, client_id: str, redirect_uri: str, state: str,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    client = OAUTH_CLIENTS.get(client_id)
    if not client or redirect_uri not in client["redirect_uris"]:
        raise HTTPException(400, "Invalid client or redirect_uri")
    if current_user is None:
        return RedirectResponse(f"/login?next=/oauth/authorize&...")
    code = create_code(current_user.id, client_id, redirect_uri)
    return RedirectResponse(f"{redirect_uri}?code={code}&state={state}")

@router.post("/oauth/token")
def token(
    grant_type: str = Form(...), code: str = Form(...),
    redirect_uri: str = Form(...), client_id: str = Form(...),
    db: Session = Depends(get_db),
):
    code_data = consume_code(code)
    if not code_data or code_data["redirect_uri"] != redirect_uri:
        raise HTTPException(400, "Invalid or expired code")
    user = db.query(User).filter(User.id == code_data["user_id"]).first()
    return {
        "access_token": create_access_token(user.id, user.email, user.role),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "Bearer", "expires_in": 3600,
        "user": {"id": user.id, "email": user.email, "nickname": user.nickname, "role": user.role},
    }

@router.get("/oauth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email,
            "nickname": current_user.nickname, "role": current_user.role}
```
- `get_current_user_optional`: Bearer 헤더 있으면 user 반환, 없으면 None 반환 (별도 구현 필요)
- `/oauth/me`: Bearer Token 검증 후 user 정보 반환 — `test_bearer_auth.py` 용

---

### 8. main.py — oauth 라우터 등록

```python
# backend/main.py (기존 import 줄에 추가)
from app.api.v1 import users, auth, monthly_scores, game_visits, friends, chat, pinball_ai, oauth

# 라우터 등록 (기존 코드 아래에 추가)
app.include_router(oauth.router, prefix="/api/v1", tags=["OAuth"])
```
- `/api/v1/oauth/authorize`, `/api/v1/oauth/token`, `/api/v1/oauth/me` 경로로 등록

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/requirements.txt` | 수정 | `python-jose[cryptography]==3.3.0` 추가 |
| `backend/app/core/oauth_clients.py` | 생성 | 내부 클라이언트 설정 dict |
| `backend/app/core/auth_codes.py` | 생성 | `create_code`, `consume_code` 함수 |
| `backend/app/core/config.py` | 수정 | `SECRET_KEY` 필드 추가 |
| `backend/app/core/jwt_utils.py` | 생성 | `create_access_token`, `create_refresh_token`, `decode_token` |
| `backend/app/core/dependencies.py` | 생성 | `get_current_user`, `get_current_user_optional` 의존성 |
| `backend/app/api/v1/oauth.py` | 생성 | `/authorize`, `/token`, `/me` 엔드포인트 |
| `backend/main.py` | 수정 | oauth 라우터 등록 |

---

## 완료 체크리스트

- [ ] `docker compose exec fastapi pytest tests/test_auth_codes.py -v` — 6개 모두 PASSED
- [ ] `docker compose exec fastapi pytest tests/test_jwt_utils.py -v` — 9개 모두 PASSED
- [ ] `docker compose exec fastapi pytest tests/test_oauth_endpoints.py -v` — 11개 모두 PASSED
- [ ] `docker compose exec fastapi pytest tests/test_bearer_auth.py -v` — 4개 모두 PASSED
- [ ] 기존 테스트(`test_google_auth.py`, `test_friend_requests.py` 등) 회귀 없음
