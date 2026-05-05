# JWT 2단계 — Refresh Token 도입 실행계획

## 요구사항 요약

**요구사항**: 백엔드에 Refresh Token 발급/검증 엔드포인트를 추가하고, 프론트엔드 응답 인터셉터에서 401 수신 시 자동으로 토큰을 갱신한 뒤 원 요청을 재시도한다.

**목적**: 1단계에서 Access Token 수명을 길게(1~7일) 잡아 감춘 보안 약점을 제거한다. Access를 15분으로 단축하고, 만료 시 사용자에게 로그아웃 없이 자동 갱신하여 사용성을 유지한다.

---

## 현재상태 분석

- **백엔드**: `POST /api/v1/auth/login`은 Access Token만 발급. Refresh Token 발급·저장·검증 로직 없음. `JWT_EXPIRE_MINUTES` 기본값 60분.
- **Redis**: `docker-compose.yml`에 `redis-server` 운영 중. `backend/app/redis_client.py`에 싱글턴 클라이언트 모듈 존재. `redis==7.1.1` 설치됨. `monthly_scores`, `game_sessions`에서 이미 사용 중. **1단계(설치/모듈 생성)는 완료 상태.**
- **프론트엔드**: `api.js` 응답 인터셉터는 401 수신 시 즉시 로그아웃만 함. 갱신 시도 없음.
- **AuthContext**: 로그인/로그아웃 시 localStorage의 `user` 객체와 `access_token`을 함께 관리.

---

## 구현 방법

- **Refresh Token 저장소**: Redis를 사용한다. `SETEX refresh:{token} {TTL} {user_id}` 한 줄로 저장·만료를 동시에 처리한다. PostgreSQL 테이블/마이그레이션/만료 청소 작업이 필요 없다.
- **키 구조**: `refresh:{token_string}` → `value: user_id`. 조회 시 키 존재 여부만 확인하면 검증 완료.
- **쿠키 발급**: 로그인 응답 시 Refresh Token을 `HttpOnly + Secure + SameSite=Lax` 쿠키로 Set-Cookie한다. JSON body에는 포함하지 않는다.
- **갱신 엔드포인트**: `POST /api/v1/auth/refresh`는 쿠키에서 Refresh Token을 읽어 Redis에서 검증 후 새 Access Token을 반환한다.
- **로그아웃 엔드포인트**: `POST /api/v1/auth/logout`은 Redis에서 키를 삭제하고 쿠키를 만료시킨다.
- **프론트 인터셉터**: 401 수신 시 `/auth/refresh`를 호출하고 성공하면 새 Access Token으로 원 요청을 재시도한다. 갱신 실패 시에만 로그아웃한다.

---

## 구현 단계

### 1. ~~`redis-py` 설치 및 Redis 연결 모듈 추가~~ (완료)

> `backend/app/redis_client.py`와 `redis==7.1.1`이 이미 존재한다. `auth.py`에서 `from app.redis_client import redis_client`로 바로 import하면 된다.

---

### 2. `config.py`에 Refresh Token 수명 추가 및 JWT 수명 변경 (백엔드)

```python
# backend/app/core/config.py 수정
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "15"))  # 60 → 15
```

- `REDIS_HOST`, `REDIS_PORT`는 이미 `redis_client.py`에서 `os.getenv`로 직접 읽고 있으므로 추가 불필요.
- `REFRESH_TOKEN_EXPIRE_DAYS`와 `JWT_EXPIRE_MINUTES`(15분)만 추가한다.

---

### 3. `security.py`에 Refresh Token 생성 함수 추가 (백엔드)

```python
import secrets

REFRESH_TOKEN_EXPIRE_DAYS = 30

def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)
```

- `secrets.token_urlsafe(64)`는 암호학적으로 안전한 난수 문자열(약 86자)을 생성한다.
- JWT가 아닌 불투명 토큰(opaque token)으로, 서버가 Redis 조회로만 검증한다. 토큰 자체에 정보가 없어 탈취해도 payload를 읽을 수 없다.
- 만료 시간 계산은 Redis `SETEX`의 TTL 인자로 처리하므로 함수에서 별도 반환하지 않는다.

---

### 4. 로그인 엔드포인트에 Refresh Token 발급 추가 (백엔드 `auth.py`)

```python
from fastapi import Response
from app.core.redis import redis_client
from app.core.security import create_refresh_token
from app.core.config import settings

REFRESH_TTL = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600  # seconds

def _create_login_response(user, response: Response) -> LoginResponse:
    access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})

    refresh_token = create_refresh_token()
    redis_client.setex(f"refresh:{refresh_token}", REFRESH_TTL, str(user.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TTL,
        path="/api/v1/auth",
    )
    return LoginResponse(message="Login successful", user_id=user.id,
                         email=user.email, nickname=user.nickname,
                         role=user.role, access_token=access_token, token_type="bearer")
```

- `redis_client.setex(key, ttl_seconds, value)`: 저장과 동시에 TTL을 설정한다. 만료 후 Redis가 자동으로 키를 삭제한다.
- 키 형식 `refresh:{token}`으로 네임스페이스를 분리해 다른 Redis 키와 충돌을 방지한다.
- `db: Session` 파라미터를 제거했으므로 기존 `_create_login_response` 호출부(`login`, `register`, `google_login`)에서 `db` 인자도 제거한다.
- `path="/api/v1/auth"`: 쿠키가 `/api/v1/auth/refresh`, `/api/v1/auth/logout` 경로에만 전송된다.

---

### 5. `/api/v1/auth/refresh` 엔드포인트 추가 (백엔드 `auth.py`)

```python
from fastapi import Cookie

@router.post("/refresh")
def refresh_access_token(
    refresh_token: str = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    user_id = redis_client.get(f"refresh:{refresh_token}")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {"access_token": new_access, "token_type": "bearer"}
```

- `redis_client.get(key)`는 키가 없거나 만료됐으면 `None`을 반환한다. 별도 만료 비교 로직이 필요 없다.
- Redis 조회 결과는 `str(user_id)` 이므로 `int()` 변환 후 DB 조회에 사용한다.
- Rotation(Refresh 재발급)은 4단계에서 추가한다. 이번 단계는 검증 후 Access만 재발급한다.

---

### 6. `/api/v1/auth/logout` 엔드포인트 추가 (백엔드 `auth.py`)

```python
@router.post("/logout")
def logout(
    response: Response,
    refresh_token: str = Cookie(default=None),
):
    if refresh_token:
        redis_client.delete(f"refresh:{refresh_token}")

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return {"message": "Logged out"}
```

- `redis_client.delete(key)`는 키가 없어도 에러 없이 동작한다(멱등성 보장).
- DB 접근이 필요 없으므로 `db: Session` 의존성이 없다.
- 쿠키가 없어도 정상 응답한다.

---

### 7. 프론트엔드 응답 인터셉터에 자동 갱신 로직 추가 (`frontend/src/lib/api.js`)

```javascript
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        useAuthStore.getState().setAccessToken(data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        useAuthStore.getState().clearAccessToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

- `original._retry` 플래그: 갱신 후 재시도한 요청이 또 401을 받으면 무한 루프를 방지한다.
- refresh 호출에 `withCredentials: true`를 명시해 HttpOnly 쿠키가 함께 전송된다.
- 갱신 성공 시 `api(original)`로 원 요청을 재시도해 화면은 성공 응답만 받는다.
- 갱신 실패 시(Redis 키 만료 등)에만 로그아웃 처리한다.

---

### 8. `AuthContext.jsx`에 logout API 호출 추가 (프론트엔드)

```javascript
const logout = async () => {
  try {
    await api.post('/auth/logout', {}, { withCredentials: true });
  } finally {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('user');
    useAuthStore.getState().clearAccessToken();
  }
};
```

- `finally`로 API 실패 여부와 관계없이 클라이언트 상태를 초기화한다.
- `api.post`를 사용해 요청 인터셉터가 Access Token을 헤더에 자동 부착한다.

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/core/config.py` | 수정 | `REFRESH_TOKEN_EXPIRE_DAYS` 추가, `JWT_EXPIRE_MINUTES` 기본값 15로 변경 |
| `backend/app/core/security.py` | 수정 | `create_refresh_token()` 함수 추가 |
| `backend/app/api/v1/auth.py` | 수정 | 로그인에 Refresh 발급 추가, `/refresh` · `/logout` 엔드포인트 추가 |
| `frontend/src/lib/api.js` | 수정 | 응답 인터셉터에 자동 갱신·재시도 로직 추가 |
| `frontend/src/contexts/AuthContext.jsx` | 수정 | `logout`에 `POST /auth/logout` 호출 추가 |

---

## 완료 체크리스트

- [ ] 로그인 후 브라우저 개발자 도구 → Application → Cookies에서 `refresh_token` 쿠키가 `HttpOnly`로 표시되는지 확인
- [ ] `docker compose exec redis-server redis-cli KEYS "refresh:*"` 실행 시 로그인한 사용자의 키가 보이는지 확인
- [ ] `JWT_EXPIRE_MINUTES=1`(테스트용)로 설정 후 1분 대기 → API 요청 시 Network 탭에서 `/auth/refresh` 자동 호출 후 원 요청 재시도가 보이는지 확인
- [ ] 로그아웃 후 `docker compose exec redis-server redis-cli KEYS "refresh:*"` 에서 해당 키가 사라졌는지 확인
- [ ] 로그아웃 후 브라우저 Cookies에서 `refresh_token` 쿠키가 삭제됐는지 확인
- [ ] Redis 키를 수동으로 삭제(`DEL refresh:{token}`)한 상태에서 `/auth/refresh` 호출 시 401이 반환되는지 확인
- [ ] `docker compose exec fastapi pytest` 모든 기존 테스트 통과 확인
