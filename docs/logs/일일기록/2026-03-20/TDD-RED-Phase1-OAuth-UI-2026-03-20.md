# TDD RED 계획: PHASE 1 — 프론트엔드 OAuth 연동 UI

## 구현 목표

Google OAuth 2.0 소셜 로그인 UI 및 Authorization Code → JWT 교환 흐름을 프론트엔드에 구현한다.

- Login.jsx: 구글 로그인 버튼 추가, 자체 로그인 시 JWT 교환 추가
- OAuthCallback.jsx: OAuth 콜백 페이지 신규 생성
- Register.jsx: 회원가입 후 JWT 교환 및 홈 이동
- AuthContext.jsx: logout 시 서버 쿠키 삭제 API 호출
- App.jsx: `/oauth/callback` 라우트 추가

---

## RED 테스트 목록

### 파일 1: `frontend/src/test/Login.test.jsx` (기존 파일에 추가)

1. **구글_로그인_버튼이_렌더링된다**: 로그인 페이지에 "구글로 로그인" 텍스트를 가진 버튼이 존재한다
2. **구글_로그인_버튼_클릭_시_API를_호출한다**: 버튼 클릭 시 `GET /api/v1/auth/google/login` 호출된다
3. **구글_로그인_버튼_클릭_시_반환된_URL로_이동한다**: API 응답의 `authorization_url`로 `window.location.href`가 변경된다
4. **자체_로그인_성공_시_authorization_code로_JWT를_교환한다**: `/api/v1/login` 성공 후 응답의 `authorization_code`로 `POST /api/v1/auth/token`을 호출한다
5. **JWT_교환_성공_후_사용자_정보를_localStorage에_저장한다**: `/api/v1/auth/token` 응답 후 기존처럼 user 정보가 localStorage에 저장된다
6. **JWT_교환_실패_시_로그인_에러를_표시한다**: `/api/v1/auth/token` 호출이 실패하면 에러 상태가 표시된다

### 파일 2: `frontend/src/test/OAuthCallback.test.jsx` (신규 파일)

7. **OAuthCallback_진입_시_로딩_스피너가_표시된다**: 컴포넌트 마운트 즉시 로딩 UI가 보인다
8. **URL에서_authorization_code를_추출하여_토큰_교환을_호출한다**: URL 쿼리파라미터 `?code=abc123`에서 코드를 추출해 `POST /api/v1/auth/token`을 호출한다
9. **토큰_교환_성공_시_user_정보를_localStorage에_저장한다**: 응답 데이터를 localStorage `user` 키에 저장한다
10. **토큰_교환_성공_시_일반_사용자는_홈으로_이동한다**: role이 `user`이면 `/`로 navigate한다
11. **토큰_교환_성공_시_관리자는_관리자_페이지로_이동한다**: role이 `admin`이면 `/admin`으로 navigate한다
12. **토큰_교환_실패_시_로그인_페이지로_이동한다**: API 오류 발생 시 `/login`으로 navigate한다
13. **URL에_code_파라미터가_없으면_로그인_페이지로_이동한다**: `?code` 없이 진입하면 즉시 `/login`으로 navigate한다

### 파일 3: `frontend/src/test/Register.test.jsx` (신규 파일)

14. **회원가입_성공_후_authorization_code로_JWT를_교환한다**: `/api/v1/register` 성공 후 응답의 `authorization_code`로 `POST /api/v1/auth/token`을 호출한다
15. **JWT_교환_성공_후_홈으로_이동한다**: 토큰 교환 성공 시 `/login`이 아닌 `/`로 이동한다
16. **JWT_교환_성공_후_user_정보가_localStorage에_저장된다**: 토큰 교환 후 localStorage에 user 정보가 저장된다

### 파일 4: `frontend/src/test/AuthContext.test.jsx` (신규 파일)

17. **logout_시_POST_auth_logout을_호출한다**: `logout()` 함수 실행 시 `POST /api/v1/auth/logout` API를 호출한다
18. **logout_시_localStorage의_user가_제거된다**: API 호출과 함께 기존처럼 localStorage에서 user 정보가 삭제된다

---

## 테스트 파일 위치

| 테스트 파일 | 대상 컴포넌트 |
|------------|-------------|
| `frontend/src/test/Login.test.jsx` | `pages/Login/Login.jsx` (기존 파일에 테스트 추가) |
| `frontend/src/test/OAuthCallback.test.jsx` | `pages/OAuthCallback/OAuthCallback.jsx` (신규) |
| `frontend/src/test/Register.test.jsx` | `pages/Register/Register.jsx` (신규) |
| `frontend/src/test/AuthContext.test.jsx` | `contexts/AuthContext.jsx` (신규) |

---

## 실패 예상 이유

모든 테스트는 아직 구현이 없으므로 다음 이유로 실패한다:
- 테스트 1~3: Login.jsx에 구글 로그인 버튼 없음
- 테스트 4~6: Login.jsx의 handleLogin이 auth/token 호출 없음
- 테스트 7~13: OAuthCallback.jsx 파일 자체가 없음
- 테스트 14~16: Register.jsx가 로그인 페이지로 이동하며 auth/token 호출 없음
- 테스트 17~18: AuthContext.logout이 API 호출 없음
