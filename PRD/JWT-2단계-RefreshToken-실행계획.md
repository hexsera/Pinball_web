# JWT 2단계 — Refresh Token 도입 실행계획

## 요구사항 요약

**요구사항**: 백엔드에 Refresh Token 발급/검증 엔드포인트를 추가하고, 프론트엔드 응답 인터셉터에서 401 수신 시 자동으로 토큰을 갱신한 뒤 원 요청을 재시도한다.

**목적**: 1단계에서 Access Token 수명을 길게(1~7일) 잡아 감춘 보안 약점을 제거한다. Access를 15분으로 단축하고, 만료 시 사용자에게 로그아웃 없이 자동 갱신하여 사용성을 유지한다.

---

## 현재상태 분석

- **백엔드**: `POST /api/v1/auth/login`은 Access Token만 발급. Refresh Token 발급·저장·검증 로직 없음. `JWT_EXPIRE_MINUTES`는 config에 있으나 현재 60분 기본값.
- **DB**: `models.py`에 RefreshToken 테이블 없음. Refresh Token을 서버에 저장할 곳이 없음.
- **프론트엔드**: `api.js` 응답 인터셉터는 401 수신 시 즉시 로그아웃만 함. 갱신 시도 없음. `authStore.js`는 Access Token만 관리.
- **AuthContext**: 로그인/로그아웃 시 localStorage의 `user` 객체와 `access_token`을 함께 관리.

---

## 구현 방법

- **Refresh Token 저장**: DB에 `refresh_tokens` 테이블을 만들어 토큰 문자열, user_id, 만료일, 폐기 여부를 기록한다. Rotation은 3단계에서 적용하므로 이번에는 단순 저장만 한다.
- **쿠키 발급**: 로그인 응답 시 Refresh Token을 `HttpOnly + Secure + SameSite=Lax` 쿠키로 Set-Cookie한다. JSON body에는 포함하지 않는다.
- **갱신 엔드포인트**: `POST /api/v1/auth/refresh`는 쿠키에서 Refresh Token을 읽어 검증 후 새 Access Token을 반환한다.
- **로그아웃 엔드포인트**: `POST /api/v1/auth/logout`은 DB에서 Refresh Token을 폐기하고 쿠키를 만료시킨다.
- **프론트 인터셉터**: 401 수신 시 `/auth/refresh`를 호출하고 성공하면 새 Access Token으로 원 요청을 재시도한다. 갱신 실패 시에만 로그아웃한다.

---

## 구현 단계

### 1. DB에 RefreshToken 테이블 추가 (백엔드 `models.py`)

```python
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
```

- `token` 컬럼에 UNIQUE + INDEX를 걸어 조회 성능 확보 및 중복 방지.
- `revoked` 플래그로 발급된 토큰을 논리 삭제(실제 행 유지)한다. 이후 Rotation 감지에 활용 가능.
- `ondelete="CASCADE"`: 사용자 삭제 시 해당 사용자의 모든 Refresh Token도 자동 삭제.

---

### 2. Alembic 마이그레이션 생성 및 적용 (백엔드)

```bash
docker compose exec fastapi alembic revision --autogenerate -m "add refresh_tokens table"
docker compose exec fastapi alembic upgrade head
```

- 위 명령으로 마이그레이션 파일을 생성하고 DB에 반영한다.
- 적용 전 `alembic/versions/` 에 생성된 파일을 열어 `refresh_tokens` 테이블 생성 구문이 포함됐는지 확인한다.

---

### 3. `security.py`에 Refresh Token 생성 함수 추가 (백엔드)

```python
import secrets
from datetime import datetime, timedelta, timezone

REFRESH_TOKEN_EXPIRE_DAYS = 30

def create_refresh_token() -> tuple[str, datetime]:
    token = secrets.token_urlsafe(64)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return token, expires_at
```

- `secrets.token_urlsafe(64)`는 암호학적으로 안전한 난수 문자열을 생성한다. JWT가 아닌 불투명 토큰(opaque token)을 사용해 서버가 DB 조회로만 검증한다.
- 반환값 `(token, expires_at)` 을 호출 측에서 DB 저장과 쿠키 설정에 각각 사용한다.
- `JWT_EXPIRE_MINUTES`는 `config.py`에서 15로 변경한다.

---

### 4. 로그인 엔드포인트에 Refresh Token 발급 추가 (백엔드 `auth.py`)

```python
from fastapi import Response

def _create_login_response(user, db: Session, response: Response) -> LoginResponse:
    # Access Token
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})

    # Refresh Token 생성 & DB 저장
    refresh_token_str, expires_at = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token=refresh_token_str, expires_at=expires_at))
    db.commit()

    # HttpOnly 쿠키 설정
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        httponly=True,
        secure=True,
        samesite="lax",
        expires=int(expires_at.timestamp()),
        path="/api/v1/auth",   # refresh/logout 경로에만 쿠키 전송
    )
    return LoginResponse(message="Login successful", user_id=user.id,
                         email=user.email, nickname=user.nickname,
                         role=user.role, access_token=token, token_type="bearer")
```

- `response: Response`는 FastAPI가 라우터에서 `Response`를 매개변수로 선언하면 자동 주입한다.
- `path="/api/v1/auth"`로 설정해 Refresh Token 쿠키가 인증 관련 경로에만 전송되도록 범위를 제한한다.
- `login`, `register`, `google_login` 라우터 함수 시그니처에 `response: Response`를 추가하고 `_create_login_response`에 전달한다.

---

### 5. `/api/v1/auth/refresh` 엔드포인트 추가 (백엔드 `auth.py`)

```python
from fastapi import Cookie
from datetime import datetime, timezone

@router.post("/refresh")
def refresh_access_token(
    refresh_token: str = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    record = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.now(timezone.utc),
    ).first()

    if not record:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == record.user_id).first()
    new_access = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return {"access_token": new_access, "token_type": "bearer"}
```

- 쿠키를 `Cookie(default=None)`으로 받는다. FastAPI가 요청 쿠키에서 `refresh_token` 키를 자동으로 읽는다.
- `revoked == False` AND `expires_at > now` 조건을 한 번의 쿼리로 처리해 불필요한 분기를 줄인다.
- 응답은 `access_token`만 반환한다. Rotation(Refresh 재발급)은 4단계에서 추가한다.

---

### 6. `/api/v1/auth/logout` 엔드포인트 추가 (백엔드 `auth.py`)

```python
@router.post("/logout")
def logout(
    response: Response,
    refresh_token: str = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if refresh_token:
        record = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
        if record:
            record.revoked = True
            db.commit()

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return {"message": "Logged out"}
```

- DB에서 Refresh Token을 폐기(`revoked=True`)한 뒤 쿠키를 삭제한다.
- 쿠키가 없어도 에러 없이 성공으로 응답한다(멱등성 보장).

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

- `original._retry` 플래그로 갱신 후 재시도한 요청이 또 401을 받을 때 무한 루프를 방지한다.
- refresh 호출에는 `withCredentials: true`를 명시해 쿠키가 함께 전송되도록 한다.
- 갱신 성공 시 `original.headers`에 새 토큰을 설정하고 `api(original)`로 원 요청을 재시도한다.
- 갱신 실패 시에만 로그아웃 처리한다.

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
- `api.post`를 사용해 요청 인터셉터가 Access Token을 헤더에 자동 부착하도록 한다.

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/models.py` | 수정 | `RefreshToken` 모델 클래스 추가 |
| `backend/alembic/versions/…` | 생성 | `refresh_tokens` 테이블 마이그레이션 |
| `backend/app/core/security.py` | 수정 | `create_refresh_token()` 함수 추가, `JWT_EXPIRE_MINUTES` 15분으로 변경 |
| `backend/app/core/config.py` | 수정 | `JWT_EXPIRE_MINUTES` 기본값 `"15"`로 변경 |
| `backend/app/api/v1/auth.py` | 수정 | 로그인에 Refresh 발급 추가, `/refresh` · `/logout` 엔드포인트 추가 |
| `backend/app/schemas/user.py` | 수정 | `RefreshResponse` 스키마 추가(선택) |
| `frontend/src/lib/api.js` | 수정 | 응답 인터셉터에 자동 갱신·재시도 로직 추가 |
| `frontend/src/contexts/AuthContext.jsx` | 수정 | `logout`에 `POST /auth/logout` 호출 추가 |

---

## 완료 체크리스트

- [ ] 로그인 후 브라우저 개발자 도구 → Application → Cookies에서 `refresh_token` 쿠키가 `HttpOnly`로 표시되는지 확인
- [ ] `access_token`이 localStorage에 저장되고, `JWT_EXPIRE_MINUTES=1`(테스트용)로 설정했을 때 1분 후 API 요청이 자동으로 갱신된 뒤 정상 응답하는지 확인
- [ ] 갱신 성공 후 브라우저 Network 탭에서 `/auth/refresh` 호출 → 원 API 재시도 흐름이 보이는지 확인
- [ ] `POST /api/v1/auth/logout` 호출 후 쿠키가 삭제되고 이후 `/auth/refresh` 호출 시 401이 반환되는지 확인
- [ ] Refresh Token 만료(`expires_at` 과거 값으로 직접 DB 수정)된 상태에서 `/auth/refresh` 호출 시 401이 반환되는지 확인
- [ ] `docker compose exec fastapi pytest` 모든 기존 테스트 통과 확인
