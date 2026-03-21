# TDD RED 계획: OAuth PHASE 1 — 프론트엔드 (react-oidc-context 도입)

## 구현 목표
현재 localStorage 기반 인증을 react-oidc-context 기반 OAuth 2.0 Authorization Code Flow로 교체한다.
기존 useAuth() 인터페이스를 유지하면서 내부를 OIDC로 교체하고, Bearer Token 자동 주입 axiosInstance를 추가한다.

---

## RED 테스트 목록

### 파일 1: `frontend/src/test/AuthContext.test.jsx` (신규)

| # | 테스트명 | 검증할 동작 |
|---|---------|-----------|
| 1 | `useAuth()는 isAuthenticated를 반환한다` | useAuth() 훅이 isAuthenticated 속성을 가진다 |
| 2 | `useAuth()는 login 함수를 반환한다` | useAuth() 훅이 login 함수를 가진다 |
| 3 | `useAuth()는 logout 함수를 반환한다` | useAuth() 훅이 logout 함수를 가진다 |
| 4 | `useAuth()는 getAccessToken 함수를 반환한다` | useAuth() 훅이 getAccessToken 함수를 가진다 |
| 5 | `login() 호출 시 signinRedirect가 실행된다` | login() 호출 → oidc.signinRedirect() 호출 |
| 6 | `logout() 호출 시 removeUser가 실행된다` | logout() 호출 → oidc.removeUser() 호출 |
| 7 | `인증된 상태에서 getAccessToken은 토큰 문자열을 반환한다` | auth.user.access_token이 있으면 반환 |
| 8 | `미인증 상태에서 getAccessToken은 null을 반환한다` | auth.user가 없으면 null 반환 |
| 9 | `인증된 상태에서 user는 profile 객체를 반환한다` | oidc.user.profile이 있으면 반환 |
| 10 | `미인증 상태에서 user는 null을 반환한다` | oidc.user가 없으면 user는 null |

### 파일 2: `frontend/src/test/OAuthCallback.test.jsx` (신규)

| # | 테스트명 | 검증할 동작 |
|---|---------|-----------|
| 11 | `로딩 중에는 "로그인 처리 중..." 텍스트를 표시한다` | isLoading=true → "로그인 처리 중..." |
| 12 | `인증 완료 후 /로 이동한다` | isAuthenticated=true, isLoading=false → navigate('/') |
| 13 | `에러 발생 시 /login으로 이동한다` | error 있음, isLoading=false → navigate('/login') |

### 파일 3: `frontend/src/test/axiosInstance.test.js` (신규)

| # | 테스트명 | 검증할 동작 |
|---|---------|-----------|
| 14 | `axiosInstance는 기본 baseURL이 /api/v1이다` | axiosInstance.defaults.baseURL === '/api/v1' |
| 15 | `access_token이 있으면 Authorization 헤더를 추가한다` | 인터셉터가 Bearer 헤더를 config에 추가 |
| 16 | `access_token이 없으면 Authorization 헤더를 추가하지 않는다` | 토큰 없으면 헤더 없음 |

### 파일 4: `frontend/src/test/Login.test.jsx` (기존 수정)

| # | 테스트명 | 검증할 동작 |
|---|---------|-----------|
| 17 | `로그인 버튼 클릭 시 signinRedirect가 호출된다` | 로그인 버튼 클릭 → login() → signinRedirect() 호출 |
| 18 | `구글 로그인 버튼이 렌더링된다` | 기존 테스트 유지 |
| 19 | `구글 로그인 버튼 클릭 시 googleLogin 함수가 호출된다` | 기존 테스트 유지 |

### 파일 5: `frontend/src/test/Register.test.jsx` (신규 또는 기존 수정)

| # | 테스트명 | 검증할 동작 |
|---|---------|-----------|
| 20 | `회원가입 성공(201) 후 login()이 호출된다` | POST 201 응답 → login() (signinRedirect) 호출 |
| 21 | `회원가입 실패 시 alert가 표시된다` | 에러 응답 → alert 호출 |

---

## 테스트 파일 위치

| 파일 | 유형 |
|------|------|
| `frontend/src/test/AuthContext.test.jsx` | 신규 |
| `frontend/src/test/OAuthCallback.test.jsx` | 신규 |
| `frontend/src/test/axiosInstance.test.js` | 신규 |
| `frontend/src/test/Login.test.jsx` | 수정 (기존 파일 대체) |
| `frontend/src/test/Register.test.jsx` | 신규 |

---

## Mock 전략

- `react-oidc-context`: `vi.mock('react-oidc-context', ...)` — `useAuth`, `AuthProvider` mock
- `axios`: `vi.mock('axios')` — HTTP 호출 mock
- `react-router-dom`: `useNavigate` mock — 라우터 이동 검증
- `@react-oauth/google`: 기존 mock 유지
- `../../components/Aurora/Aurora`: null 반환 mock 유지
