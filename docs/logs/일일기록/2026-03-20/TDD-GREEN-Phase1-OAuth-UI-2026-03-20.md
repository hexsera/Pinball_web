# TDD GREEN 완료: PHASE 1 — 프론트엔드 OAuth 연동 UI

## 구현 완료 항목

- Login.jsx: 구글 로그인 버튼 추가, handleLogin에서 authorization_code → JWT 교환 추가
- OAuthCallback.jsx: OAuth 콜백 페이지 신규 생성 (로딩 스피너, JWT 교환, role 기반 이동)
- Register.jsx: 회원가입 성공 후 JWT 교환 및 홈 이동 처리 추가
- AuthContext.jsx: logout 함수에 POST /api/v1/auth/logout API 호출 추가
- App.jsx: /oauth/callback 라우트 추가

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/pages/Login/Login.jsx` | handleGoogleLogin 함수 추가, 구글 로그인 버튼 JSX 추가, handleLogin에서 authorization_code로 /api/v1/auth/token 호출 추가 |
| `frontend/src/pages/OAuthCallback/OAuthCallback.jsx` | 신규 생성: useSearchParams로 code 추출, CircularProgress 로딩 표시, JWT 교환, role 기반 navigate |
| `frontend/src/pages/Register/Register.jsx` | useAuth import 추가, handleRegister step2에서 /api/v1/auth/token 호출 후 login() 및 navigate('/') |
| `frontend/src/contexts/AuthContext.jsx` | axios import 추가, logout 함수에 await axios.post('/api/v1/auth/logout') 추가 |
| `frontend/src/App.jsx` | OAuthCallback import 및 /oauth/callback 라우트 추가 |

## 통과한 테스트 목록 (19개)

### AuthContext.test.jsx (2개)
1. logout_시_POST_auth_logout을_호출한다
2. logout_시_localStorage의_user가_제거된다

### Login.test.jsx (7개)
3. 로그인 성공 시 localStorage에 email이 저장된다 (기존)
4. 구글_로그인_버튼이_렌더링된다
5. 구글_로그인_버튼_클릭_시_GET_auth_google_login을_호출한다
6. 구글_로그인_버튼_클릭_시_반환된_URL로_이동한다
7. 자체_로그인_성공_시_authorization_code로_JWT를_교환한다
8. JWT_교환_성공_후_사용자_정보를_localStorage에_저장한다
9. JWT_교환_실패_시_로그인_에러를_표시한다

### OAuthCallback.test.jsx (7개)
10. OAuthCallback_진입_시_로딩_스피너가_표시된다
11. URL에서_authorization_code를_추출하여_토큰_교환을_호출한다
12. 토큰_교환_성공_시_user_정보를_localStorage에_저장한다
13. 토큰_교환_성공_시_일반_사용자는_홈으로_이동한다
14. 토큰_교환_성공_시_관리자는_관리자_페이지로_이동한다
15. 토큰_교환_실패_시_로그인_페이지로_이동한다
16. URL에_code_파라미터가_없으면_로그인_페이지로_이동한다

### Register.test.jsx (3개)
17. 회원가입_성공_후_authorization_code로_JWT를_교환한다
18. JWT_교환_성공_후_홈으로_이동한다
19. JWT_교환_성공_후_user_정보가_localStorage에_저장된다

## 다음 단계
- REFACTOR 단계: 중복 코드 제거 및 코드 정리 (동작 변경 없음)
