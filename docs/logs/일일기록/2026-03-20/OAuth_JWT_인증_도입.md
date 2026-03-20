# OAuth 2.0 구글 로그인 및 JWT 인증 도입 PRD

## 목표

1. Google OAuth 2.0을 통한 소셜 로그인을 지원한다.
2. 자체 로그인(이메일+비밀번호)에도 Authorization Code 교환 후 JWT 토큰을 발급하는 방식을 적용한다.
3. 기존 localStorage 세션 방식을 즉시 제거하지 않고 혼용하되, JWT는 로그인 시에만 사용한다.

## 현재상태 분석

- **백엔드**: FastAPI + PostgreSQL, `pwdlib(bcrypt)`로 비밀번호 해싱
- **프론트엔드**: React/Vite + Axios, `AuthContext`에서 localStorage에 `{id, name, role, email}` 저장
- **현재 인증 흐름**: `POST /api/v1/login`에 email+password 전송 → 서버에서 검증 → `LoginResponse` 반환 → localStorage 저장
- **현재 엔드포인트**: `POST /api/v1/login`, `POST /api/v1/register`
- **User 모델**: `id`, `user_id(UUID)`, `email`, `nickname`, `password`, `birth_date`, `role`
- **JWT 미구현 상태**, OAuth 관련 코드 없음

## 실행 방법 및 단계

### PHASE 1: 프론트엔드 — OAuth 연동 UI

#### 1단계: 로그인 페이지에 구글 로그인 버튼 추가

- `Login.jsx`에 "구글로 로그인" 버튼을 추가한다.
- 버튼 클릭 시 `GET /api/v1/auth/google/login`을 호출하여 받은 URL로 브라우저를 이동시킨다.

#### 2단계: OAuth 콜백 페이지 생성

- `frontend/src/pages/OAuthCallback/OAuthCallback.jsx` 페이지를 생성한다.
- 구글 인증 완료 후 리다이렉트되는 페이지로, 진입 즉시 로딩 스피너를 표시한다.
- URL 파라미터에서 Authorization Code를 추출하여 `POST /api/v1/auth/token`으로 JWT 토큰을 교환한다.
- JWT 교환 성공 시 사용자 정보를 기존 방식대로 localStorage에 저장하고, role 기반으로 페이지를 이동한다.

#### 3단계: 자체 로그인 및 회원가입 흐름에 JWT 교환 추가

- `Login.jsx`의 `handleLogin` 함수를 수정한다. 기존 `POST /api/v1/login` 호출 후 응답에서 `authorization_code`를 받아 `POST /api/v1/auth/token`으로 JWT를 교환한다.
- `Register.jsx`의 회원가입 완료 처리를 수정한다. 기존 `POST /api/v1/register` 호출 후 응답에서 `authorization_code`를 받아 `POST /api/v1/auth/token`으로 JWT를 교환하고, 로그인 페이지 이동 대신 바로 홈으로 이동한다.
- JWT Access Token은 httpOnly Cookie에 저장한다 (백엔드 응답에서 Set-Cookie 헤더로 처리). 기존 사용자 정보(`{id, name, role, email}`)는 기존 방식대로 localStorage에 유지한다.

#### 4단계: AuthContext 수정

- `AuthContext`의 `logout` 함수에서 JWT 쿠키를 제거하는 `POST /api/v1/auth/logout` 요청을 추가한다.
- 쿠키 삭제는 서버에서 처리하므로 프론트엔드에서 직접 쿠키를 조작하지 않는다.
- `App.jsx` 라우터에 `/oauth/callback` 라우트를 추가한다.

### PHASE 2: 백엔드 — Authorization Code + JWT 발급

#### 5단계: JWT 패키지 설치 및 설정

- `PyJWT` 패키지를 `requirements.txt`에 추가한다.
- `backend/app/core/config.py`에 JWT 관련 설정을 추가한다: `JWT_SECRET_KEY`, `JWT_ALGORITHM(HS256)`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`.
- `backend/.env`에 `JWT_SECRET_KEY` 값을 추가한다.

#### 6단계: Authorization Code 저장소 구현

- `backend/app/core/auth_code_store.py` 파일을 생성한다.
- Python 딕셔너리를 사용하여 메모리 기반 Authorization Code 저장소를 구현한다.
- 저장 형태: `{code: {user_id, email, nickname, role, created_at, expires_at}}`.
- Authorization Code는 생성 후 5분간 유효하며, 1회 사용 시 삭제된다.

#### 7단계: 자체 로그인 및 회원가입 Authorization Code 발급 엔드포인트

- 기존 `POST /api/v1/login` 엔드포인트의 응답을 변경한다. 이메일/비밀번호 검증 성공 시 Authorization Code를 생성하여 메모리에 저장하고, 기존 `LoginResponse`에 `authorization_code` 필드를 추가하여 반환한다.
- 기존 `POST /api/v1/register` 엔드포인트의 응답을 변경한다. 사용자 생성 성공 시 동일한 방식으로 Authorization Code를 생성하여 기존 `UserResponse`에 `authorization_code` 필드를 추가하여 반환한다.

#### 8단계: Authorization Code → JWT 토큰 교환 엔드포인트

- `POST /api/v1/auth/token` 엔드포인트를 새로 생성한다.
- Authorization Code를 검증한 뒤 JWT Access Token을 생성하고, `Set-Cookie` 헤더에 `httpOnly`, `Secure`, `SameSite=Strict` 속성으로 토큰을 설정하여 응답한다.
- 쿠키 방식으로 전달하므로 응답 body의 `access_token` 필드는 빈 문자열 또는 생략한다.

#### 9단계: 로그아웃 엔드포인트

- `POST /api/v1/auth/logout` 엔드포인트를 새로 생성한다.
- `Set-Cookie` 헤더로 JWT 쿠키를 만료 처리(maxAge=0)하여 브라우저에서 삭제되도록 응답한다.

#### 10단계: Google OAuth 엔드포인트

- `GET /api/v1/auth/google/login` — 구글 OAuth 인증 URL을 생성하여 반환한다.
- `GET /api/v1/auth/google/callback` — 구글에서 리다이렉트된 Authorization Code를 받아 구글 토큰 서버에서 Access Token을 교환하고, 구글 사용자 정보를 조회한 뒤, DB에 사용자가 없으면 자동 생성하고, 자체 Authorization Code를 발급하여 프론트엔드로 리다이렉트한다.

#### 11단계: User 모델 변경

- `User` 모델에 `provider` 컬럼을 추가한다 (`"local"` 또는 `"google"`, 기본값 `"local"`).
- `password` 컬럼을 nullable로 변경한다 (구글 로그인 사용자는 비밀번호가 없다).
- Alembic 마이그레이션을 생성하고 적용한다.

---

## 엔드포인트 상세

### 기존 엔드포인트 (변경)

#### `POST /api/v1/register` — 회원가입

**요청 데이터:**
```json
{
  "email": "user@example.com",
  "nickname": "홍길동",
  "password": "mypassword",
  "birth_date": "2000-01-01"
}
```

**처리과정:**
1. 이메일 중복 여부를 DB에서 확인한다. 이미 존재하면 400 에러를 반환한다.
2. 비밀번호를 bcrypt로 해싱하여 DB에 사용자를 저장한다.
3. Authorization Code를 생성하여 메모리 저장소에 저장한다. 저장 내용과 만료 시간은 로그인과 동일하다.
4. 기존 `UserResponse` 필드에 `authorization_code`를 추가하여 반환한다.

**응답 데이터 (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "nickname": "홍길동",
  "birth_date": "2000-01-01",
  "role": "user",
  "authorization_code": "550e8400-e29b-41d4-a716-446655440000"
}
```

**에러 응답 (400):**
```json
{
  "detail": "Email already registered"
}
```

---

#### `POST /api/v1/login` — 자체 로그인

**요청 데이터:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**처리과정:**
1. 이메일로 DB에서 사용자를 조회한다.
2. 사용자가 존재하지 않으면 401 에러를 반환한다.
3. 입력된 비밀번호와 DB에 저장된 해시 비밀번호를 bcrypt로 비교한다.
4. 비밀번호가 일치하지 않으면 401 에러를 반환한다.
5. 랜덤 문자열로 Authorization Code를 생성한다(uuid4 사용).
6. 해당 코드와 사용자 정보(user_id, email, nickname, role)를 메모리 저장소에 저장한다. 만료 시간은 현재 시각 + 5분이다.
7. 기존 LoginResponse 필드에 authorization_code를 추가하여 반환한다.

**응답 데이터 (200):**
```json
{
  "message": "Login successful",
  "user_id": 1,
  "email": "user@example.com",
  "nickname": "홍길동",
  "role": "user",
  "authorization_code": "550e8400-e29b-41d4-a716-446655440000"
}
```

**에러 응답 (401):**
```json
{
  "detail": "Invalid email or password"
}
```

---

### 신규 엔드포인트

#### `POST /api/v1/auth/token` — Authorization Code → JWT 교환

**요청 데이터:**
```json
{
  "authorization_code": "550e8400-e29b-41d4-a716-446655440000"
}
```

**처리과정:**
1. 메모리 저장소에서 전달받은 authorization_code를 조회한다.
2. 코드가 존재하지 않으면 401 에러를 반환한다.
3. 코드의 expires_at이 현재 시각보다 이전이면 만료된 코드이므로 저장소에서 삭제하고 401 에러를 반환한다.
4. 코드가 유효하면 저장소에서 사용자 정보(user_id, email, nickname, role)를 꺼낸다.
5. 해당 코드를 저장소에서 즉시 삭제한다(1회 사용).
6. 사용자 정보를 payload에 담아 JWT Access Token을 생성한다. payload에는 `sub`(user_id), `email`, `nickname`, `role`, `exp`(만료시각)이 포함된다.
7. JWT 토큰을 `Set-Cookie` 헤더에 담아 응답한다. 쿠키 속성은 `httpOnly=true`(JS 접근 차단), `Secure=true`(HTTPS 전송만 허용), `SameSite=Strict`(CSRF 방지), `Path=/api`, `Max-Age=3600`(1시간)으로 설정한다.

**JWT payload 구조:**
```json
{
  "sub": "1",
  "email": "user@example.com",
  "nickname": "홍길동",
  "role": "user",
  "exp": 1710000000
}
```

**응답 데이터 (200):**
- 응답 body: `{"message": "Login successful"}`
- 응답 헤더: `Set-Cookie: access_token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=3600`

**에러 응답 (401):**
```json
{
  "detail": "Invalid or expired authorization code"
}
```

---

#### `POST /api/v1/auth/logout` — 로그아웃

**요청 데이터:** 없음 (브라우저가 자동으로 쿠키를 전송)

**처리과정:**
1. `Set-Cookie` 헤더로 `access_token` 쿠키를 `Max-Age=0`으로 설정하여 브라우저에서 즉시 삭제되도록 응답한다.
2. 별도의 DB 조회나 토큰 검증 없이 쿠키 삭제만 수행한다.

**응답 데이터 (200):**
- 응답 body: `{"message": "Logout successful"}`
- 응답 헤더: `Set-Cookie: access_token=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0`

---

#### `GET /api/v1/auth/google/login` — 구글 OAuth 인증 URL 생성

**요청 데이터:** 없음 (GET 요청)

**처리과정:**
1. 환경변수에서 `GOOGLE_CLIENT_ID`와 `GOOGLE_REDIRECT_URI`를 읽는다.
2. 구글 OAuth 2.0 인증 URL을 조합한다. URL에는 client_id, redirect_uri, response_type=code, scope=openid email profile, 그리고 CSRF 방지를 위한 state 파라미터가 포함된다.
3. state 값은 랜덤 문자열로 생성하여 메모리 저장소에 임시 저장한다.
4. 조합된 구글 인증 URL을 응답으로 반환한다.

**응답 데이터 (200):**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid+email+profile&state=abc123"
}
```

---

#### `GET /api/v1/auth/google/callback` — 구글 OAuth 콜백 처리

**요청 데이터:** 쿼리 파라미터 `code`(구글 Authorization Code), `state`(CSRF 검증용)

**처리과정:**
1. 쿼리 파라미터에서 `code`와 `state`를 추출한다.
2. 메모리 저장소에서 state 값을 검증한다. 일치하지 않으면 400 에러를 반환한다.
3. 검증된 state를 저장소에서 삭제한다.
4. 구글 토큰 엔드포인트(`https://oauth2.googleapis.com/token`)에 POST 요청을 보낸다. 요청 본문에는 code, client_id, client_secret, redirect_uri, grant_type=authorization_code가 포함된다.
5. 구글로부터 access_token을 받는다.
6. 받은 access_token으로 구글 사용자 정보 API(`https://www.googleapis.com/oauth2/v2/userinfo`)에 GET 요청을 보내 email, name 등을 조회한다.
7. 조회한 email로 DB에서 사용자를 검색한다.
8. 사용자가 존재하지 않으면 새로운 User를 생성한다. 이때 provider는 "google", password는 null, nickname은 구글 name, birth_date는 기본값(2000-01-01)으로 설정한다.
9. 자체 Authorization Code를 생성하여 메모리 저장소에 저장한다.
10. 프론트엔드 콜백 페이지(`/oauth/callback?code={authorization_code}`)로 리다이렉트한다.

**응답:** HTTP 302 리다이렉트 → `/oauth/callback?code={자체_authorization_code}`

**에러 응답 (400):**
```json
{
  "detail": "Invalid state parameter"
}
```

---

## 데이터 모델 변경

### User 모델 변경사항

| 컬럼 | 변경 | 설명 |
|------|------|------|
| `provider` | 신규 추가 | `String(20)`, 기본값 `"local"`, `"local"` 또는 `"google"` |
| `password` | 수정 | `nullable=True`로 변경 (구글 사용자는 비밀번호 없음) |

### 신규 스키마

| 스키마 | 필드 | 용도 |
|--------|------|------|
| `TokenRequest` | `authorization_code: str` | Authorization Code → JWT 교환 요청 |
| `TokenResponse` | `message: str` | JWT 토큰 응답 (토큰은 Set-Cookie 헤더로 전달) |
| `GoogleLoginResponse` | `authorization_url: str` | 구글 인증 URL 응답 |
| `LoginResponse` (수정) | 기존 필드 + `authorization_code: str` | 로그인 응답에 코드 추가 |
| `UserResponse` (수정) | 기존 필드 + `authorization_code: str` | 회원가입 응답에 코드 추가 |

---

## 프론트엔드 화면 변경사항

| 페이지 | 변경 내용 |
|--------|-----------|
| `Login.jsx` | "구글로 로그인" 버튼 추가. 자체 로그인 성공 후 Authorization Code로 JWT 교환 로직 추가. JWT는 httpOnly Cookie로 서버가 처리하므로 프론트엔드에서 토큰을 직접 저장하지 않는다 |
| `Register.jsx` | 회원가입 성공 후 로그인 페이지 이동 대신, Authorization Code로 JWT 교환 후 바로 홈으로 이동하도록 변경 |
| `OAuthCallback.jsx` (신규) | 구글 로그인 완료 후 리다이렉트 처리. 진입 즉시 로딩 스피너를 표시한다. URL에서 Authorization Code 추출 → `POST /api/v1/auth/token` 호출(JWT는 서버가 Cookie로 설정) → 응답의 사용자 정보를 localStorage에 저장 → 페이지 이동 |
| `AuthContext.jsx` | logout 함수에서 localStorage 제거와 함께 `POST /api/v1/auth/logout`을 호출하여 서버 측에서 JWT 쿠키를 삭제한다 |
| `App.jsx` (라우터) | `/oauth/callback` 라우트 추가 |

---

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|-------------|------|
| `PyJWT` | JWT 토큰 생성 및 검증 (백엔드) |
| `httpx` | 구글 OAuth 토큰 교환 및 사용자 정보 조회를 위한 HTTP 클라이언트 (백엔드) |
| `uuid4` (표준 라이브러리) | Authorization Code 생성 |
| `Alembic` (기존) | DB 마이그레이션 |

## 테스트 방법

1. 자체 로그인 시 Authorization Code 발급을 확인한다: `POST /api/v1/login` 호출 후 응답에 `authorization_code`가 포함되는지 확인한다.
2. 회원가입 시 Authorization Code 발급을 확인한다: `POST /api/v1/register` 호출 후 응답에 `authorization_code`가 포함되는지 확인한다.
3. 회원가입 후 자동 로그인을 확인한다: 회원가입 완료 후 로그인 페이지를 거치지 않고 바로 홈으로 이동하며, JWT 쿠키가 설정되는지 확인한다.
2. Authorization Code로 JWT 토큰 교환을 확인한다: 발급받은 코드로 `POST /api/v1/auth/token`을 호출하여 `access_token`이 반환되는지 확인한다.
3. Authorization Code 1회 사용 제한을 확인한다: 같은 코드로 두 번 토큰 교환을 시도하여 두 번째 요청이 401로 거부되는지 확인한다.
4. Authorization Code 만료를 확인한다: 5분이 지난 코드로 토큰 교환을 시도하여 401로 거부되는지 확인한다.
5. 구글 로그인 URL 생성을 확인한다: `GET /api/v1/auth/google/login`을 호출하여 올바른 구글 인증 URL이 반환되는지 확인한다.
6. 구글 OAuth 콜백 처리를 확인한다: 구글 인증 완료 후 콜백 엔드포인트가 자체 Authorization Code와 함께 프론트엔드로 리다이렉트하는지 확인한다.
7. 구글 신규 사용자 자동 가입을 확인한다: 처음 구글 로그인하는 사용자가 DB에 자동 생성되는지 확인한다.
8. 프론트엔드에서 구글 로그인 버튼 동작을 확인한다: 버튼 클릭 시 구글 로그인 페이지로 이동되는지 확인한다.
9. JWT 토큰이 httpOnly Cookie로 설정되는지 확인한다: 브라우저 개발자 도구 → Application → Cookies에서 확인하며, JS(`document.cookie`)로는 접근이 불가능해야 한다.
10. 로그아웃 시 JWT 쿠키가 삭제되는지 확인한다: `POST /api/v1/auth/logout` 호출 후 쿠키가 제거되는지 확인한다.

## 체크리스트

- [ ] `POST /api/v1/login` 응답에 `authorization_code` 필드가 포함된다
- [ ] `POST /api/v1/register` 응답에 `authorization_code` 필드가 포함된다
- [ ] 회원가입 완료 후 로그인 페이지를 거치지 않고 홈으로 이동하며 JWT 쿠키가 설정된다
- [ ] `POST /api/v1/auth/token` 성공 시 응답 헤더에 `Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict`가 포함된다
- [ ] JWT payload에 `sub`(user_id), `email`, `nickname`, `role`, `exp` 필드가 모두 포함된다
- [ ] 동일한 Authorization Code로 두 번째 토큰 교환 시 401 에러가 반환된다
- [ ] 만료된 Authorization Code로 토큰 교환 시 401 에러가 반환된다
- [ ] `GET /api/v1/auth/google/login`이 구글 인증 URL을 반환한다
- [ ] 구글 OAuth 콜백이 자체 Authorization Code와 함께 `/oauth/callback`으로 리다이렉트한다
- [ ] 처음 구글 로그인하는 사용자가 `provider="google"`로 DB에 생성된다
- [ ] 로그인 페이지에 구글 로그인 버튼이 표시된다
- [ ] 브라우저 JS(`document.cookie`)에서 JWT 쿠키가 보이지 않는다 (httpOnly 검증)
- [ ] 구글 로그인 후 localStorage에 사용자 정보(`{id, name, role, email}`)가 저장된다
- [ ] `POST /api/v1/auth/logout` 호출 시 JWT 쿠키가 브라우저에서 삭제된다
- [ ] User 테이블에 `provider` 컬럼이 추가되고, `password` 컬럼이 nullable로 변경된다
