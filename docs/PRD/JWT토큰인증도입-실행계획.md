# JWT 토큰 인증 도입 실행계획

## 요구사항 요약

**요구사항**: 일반 로그인 및 구글 로그인 응답에 JWT 액세스 토큰을 추가 발급한다. 구글 최초 로그인 시 자동 회원가입을 처리한다. 기존 localStorage 저장 방식은 유지하면서 `access_token`을 추가 저장한다.

**목적**: 향후 API 인증을 토큰 기반으로 전환하기 위한 준비 단계. 현재는 토큰 발급·수신에 집중하며, API 헤더 인증 전환은 다음 단계로 미룬다.

## 현재상태 분석

- `POST /api/v1/login`: 성공 시 `{message, user_id, email, nickname, role}` 반환 — JWT 없음
- `POST /api/v1/auth/google`: DB에 없는 구글 계정은 401 에러 반환 — 자동 회원가입 없음
- `User` 모델: `google_id`, `auth_provider` 컬럼 없음
- `LoginResponse` 스키마: `access_token` 필드 없음
- 프론트엔드 `AuthContext`: `login(userData)` 호출 시 `localStorage.setItem('user', JSON.stringify(userData))` 저장
- `python-jose` 미설치

## 구현 방법

- JWT 생성: `python-jose[cryptography]` 라이브러리로 `HS256` 서명 토큰 생성
- DB 확장: `users` 테이블에 `google_id`, `auth_provider` 컬럼 추가 후 Alembic 마이그레이션
- 구글 자동 가입: `google_id`(`sub`) 기준으로 신규 여부 판단 후 없으면 자동 생성
- 프론트엔드: 기존 `login()` 호출 유지, `access_token`만 별도로 `localStorage.setItem('access_token', ...)` 추가

## 구현 단계

### 1. 패키지 설치 — requirements.txt 수정

```text
python-jose[cryptography]==3.3.0
```

- `python-jose`는 2026년 기준 FastAPI 공식 문서에서 JWT 처리에 권장하는 표준 패키지
- `[cryptography]` 옵션은 HS256 서명에 필요한 암호화 백엔드를 함께 설치

---

### 2. 환경변수 추가 — backend/.env 및 .env.example

```env
JWT_SECRET_KEY=<your-random-secret-key>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

- `JWT_SECRET_KEY`: 토큰 서명에 사용하는 비밀키. 실제 값은 절대 커밋하지 않음 (`.env.example`에는 플레이스홀더만 기재)
- `JWT_EXPIRE_MINUTES`: 토큰 유효 시간(분). 기본 60분

---

### 3. config.py — JWT 설정 추가

```python
# app/core/config.py
class Settings:
    # ... 기존 필드 유지 ...
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
```

- 기존 `Settings` 클래스에 3개 필드만 추가, 나머지 코드 변경 없음

---

### 4. security.py — create_access_token 함수 추가

```python
# app/core/security.py
from datetime import datetime, timedelta, timezone
from jose import jwt

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
```

- `data`에는 `{"sub": user_id, "email": email, "role": role}` 형태로 전달
- `exp` 클레임을 자동으로 payload에 추가해 만료 시간을 서명에 포함시킴
- 기존 `hash_password`, `verify_password`, `verify_api_key` 함수는 변경 없음

---

### 5. models.py — User 모델 컬럼 추가

```python
# models.py — User 클래스 내부에 추가
google_id     = Column(String(255), nullable=True, unique=True)
auth_provider = Column(String(20), nullable=False, default='local')
```

- `google_id`: 구글 userinfo의 `sub` 값 저장. 이메일이 같아도 계정 식별은 `sub`로 하는 것이 안전
- `auth_provider`: `'local'`(이메일 가입) | `'google'`(OAuth 가입). `DEFAULT 'local'`로 기존 row 자동 처리

---

### 6. Alembic 마이그레이션 생성 및 적용

```bash
docker compose exec fastapi alembic revision --autogenerate -m "add google_id and auth_provider to users"
docker compose exec fastapi alembic upgrade head
```

- autogenerate가 모델 변경을 감지해 `ADD COLUMN` SQL을 자동 생성
- `auth_provider`의 `DEFAULT 'local'`이 마이그레이션에 포함됐는지 생성된 파일을 직접 확인 후 적용

---

### 7. schemas/user.py — LoginResponse에 access_token 추가

```python
# app/schemas/user.py
class LoginResponse(BaseModel):
    """로그인 응답"""
    message: str
    user_id: int
    email: str
    nickname: str
    role: str
    access_token: str   # 추가
    token_type: str     # 추가
```

- 기존 필드 `message`, `user_id`, `email`, `nickname`, `role`은 제거하지 않음
- 프론트엔드의 기존 응답 파싱 코드가 그대로 동작하도록 하위 호환 유지

---

### 8. auth.py — 일반 로그인에 JWT 발급 추가

```python
# app/api/v1/auth.py — login 엔드포인트 반환 부분 수정
from app.core.security import hash_password, verify_password, create_access_token

token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})

return LoginResponse(
    message="Login successful",
    user_id=user.id,
    email=user.email,
    nickname=user.nickname,
    role=user.role,
    access_token=token,
    token_type="bearer"
)
```

- `create_access_token` import 추가 후 로그인 성공 분기에서 토큰 생성
- 기존 인증 로직(`verify_password`, 401 처리)은 변경 없음

---

### 9. auth.py — 구글 로그인: 자동 가입 + JWT 발급

```python
# app/api/v1/auth.py — google_login 엔드포인트 3단계 부분 교체
import uuid
from datetime import date

user = db.query(User).filter(User.google_id == google_user["sub"]).first()

if not user:
    # 이메일로 기존 local 계정 존재 여부 확인
    existing = db.query(User).filter(User.email == google_user["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered with a different provider")
    # 신규 구글 계정 자동 가입
    user = User(
        email=google_user["email"],
        nickname=google_user.get("name", google_user["email"].split("@")[0]),
        password=hash_password(str(uuid.uuid4())),  # 사용 불가 비밀번호
        birth_date=date.today(),                    # 임시값
        role="user",
        google_id=google_user["sub"],
        auth_provider="google"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})

return LoginResponse(
    message="Login successful",
    user_id=user.id,
    email=user.email,
    nickname=user.nickname,
    role=user.role,
    access_token=token,
    token_type="bearer"
)
```

- `google_id`(`sub`) 기준으로 조회해야 이메일이 변경된 구글 계정도 올바르게 식별
- 동일 이메일로 local 가입한 계정이 있으면 충돌 방지를 위해 400 에러 반환
- `birth_date`: 구글 userinfo에 제공되지 않으므로 `date.today()` 임시 저장

---

### 10. 프론트엔드 — access_token localStorage 추가 저장

```javascript
// frontend/src/pages/Login/Login.jsx
// 일반 로그인 성공 콜백 수정
login({
  id: response.data.user_id,
  name: response.data.nickname,
  role: response.data.role,
  email: response.data.email
});
localStorage.setItem('access_token', response.data.access_token); // 추가

// 구글 로그인 성공 콜백도 동일하게 적용
login({
  id: res.data.user_id,
  name: res.data.nickname,
  role: res.data.role,
  email: res.data.email
});
localStorage.setItem('access_token', res.data.access_token); // 추가
```

- 기존 `login(userData)` 호출 및 `localStorage.setItem('user', ...)` 로직은 변경 없음
- `access_token`을 별도 키로 저장해 기존 코드와 충돌 없음
- `AuthContext`의 `logout()`에 `localStorage.removeItem('access_token')` 추가 필요

---

### 11. AuthContext — 로그아웃 시 access_token 제거

```javascript
// frontend/src/contexts/AuthContext.jsx — logout 함수 수정
const logout = () => {
  setUser(null);
  setIsLoggedIn(false);
  localStorage.removeItem('user');
  localStorage.removeItem('access_token'); // 추가
};
```

- 로그아웃 시 토큰이 localStorage에 남아있으면 보안 문제가 될 수 있으므로 함께 제거

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/requirements.txt` | 수정 | `python-jose[cryptography]==3.3.0` 추가 |
| `backend/.env` | 수정 | `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES` 추가 |
| `backend/.env.example` | 수정 | 위 3개 항목 플레이스홀더 추가 |
| `backend/app/core/config.py` | 수정 | `Settings`에 JWT 설정 3개 필드 추가 |
| `backend/app/core/security.py` | 수정 | `create_access_token()` 함수 추가 |
| `backend/app/schemas/user.py` | 수정 | `LoginResponse`에 `access_token`, `token_type` 필드 추가 |
| `backend/app/api/v1/auth.py` | 수정 | 일반 로그인·구글 로그인 양쪽에 JWT 발급, 구글 자동 가입 로직 추가 |
| `backend/models.py` | 수정 | `User`에 `google_id`, `auth_provider` 컬럼 추가 |
| `backend/alembic/versions/xxx.py` | 생성 | `google_id`, `auth_provider` 컬럼 추가 마이그레이션 |
| `frontend/src/pages/Login/Login.jsx` | 수정 | 로그인·구글 로그인 콜백에 `access_token` localStorage 저장 추가 |
| `frontend/src/contexts/AuthContext.jsx` | 수정 | `logout()`에 `access_token` 제거 추가 |

## 완료 체크리스트

- [ ] `POST /api/v1/login` 응답 JSON에 `access_token`, `token_type` 필드가 존재한다
- [ ] `POST /api/v1/auth/google` 응답 JSON에 `access_token`, `token_type` 필드가 존재한다
- [ ] `jwt.io`에서 토큰 디코딩 시 `sub`, `email`, `role`, `exp` 클레임이 존재한다
- [ ] 구글 최초 로그인 시 `users` 테이블에 새 row가 생성된다
- [ ] 구글 자동 가입 row의 `auth_provider = 'google'`, `birth_date = 오늘 날짜` 임을 DB에서 확인한다
- [ ] 기존 이메일 가입 유저의 `auth_provider = 'local'` 임을 DB에서 확인한다
- [ ] 로그인 후 브라우저 DevTools → Application → localStorage에 `user`(기존)와 `access_token`(신규) 두 항목이 모두 존재한다
- [ ] 로그아웃 후 localStorage에서 `user`와 `access_token` 항목이 모두 사라진다
- [ ] 기존 프론트엔드 기능(점수 저장, 프로필 표시 등)이 로그인 후 정상 동작한다
- [ ] Docker 컨테이너 재빌드 후 에러 없이 서버가 기동된다 (`docker compose logs -f fastapi`)
