# TDD GREEN 계획: OAuth PHASE 1 — 프론트엔드

## 통과시킬 테스트 목록

1. `useAuth()는 isAuthenticated를 반환한다`
2. `useAuth()는 login 함수를 반환한다`
3. `useAuth()는 logout 함수를 반환한다`
4. `useAuth()는 getAccessToken 함수를 반환한다`
5. `login() 호출 시 signinRedirect가 실행된다`
6. `logout() 호출 시 removeUser가 실행된다`
7. `인증된 상태에서 getAccessToken은 토큰 문자열을 반환한다`
8. `미인증 상태에서 getAccessToken은 null을 반환한다`
9. `인증된 상태에서 user는 profile 객체를 반환한다`
10. `미인증 상태에서 user는 null을 반환한다`
11. `로딩 중에는 "로그인 처리 중..." 텍스트를 표시한다`
12. `인증 완료 후 /로 이동한다`
13. `에러 발생 시 /login으로 이동한다`
14. `axiosInstance는 기본 baseURL이 /api/v1이다`
15. `access_token이 있으면 Authorization 헤더를 추가한다`
16. `access_token이 없으면 Authorization 헤더를 추가하지 않는다`
17. `로그인 버튼 클릭 시 signinRedirect가 호출된다`
18. `구글 로그인 버튼이 렌더링된다`
19. `구글 로그인 버튼 클릭 시 googleLogin 함수가 호출된다`
20. `회원가입 성공(201) 후 login()이 호출된다`
21. `회원가입 실패 시 alert가 표시된다` (이미 통과)

---

## 구현 계획

| 테스트 | 작성할 코드 | 파일 위치 |
|--------|------------|----------|
| 1-10 (AuthContext) | `useAuth()`를 react-oidc-context의 `useAuth`를 감싸는 방식으로 재구현. `isAuthenticated`, `user(profile)`, `login(signinRedirect)`, `logout(removeUser)`, `getAccessToken(access_token)` 반환 | `frontend/src/contexts/AuthContext.jsx` |
| 11-13 (OAuthCallback) | `useAuth`에서 isLoading/isAuthenticated/error 읽어 조건부 navigate. 로딩 중 "로그인 처리 중..." 렌더링 | `frontend/src/pages/OAuthCallback.jsx` (신규) |
| 14-16 (axiosInstance) | axios.create({baseURL:'/api/v1'}), request interceptor에서 `getOidcUser()?.access_token` 읽어 Bearer 헤더 추가 | `frontend/src/api/axiosInstance.js` (신규) |
| 17-19 (Login) | handleLogin에서 login() (signinRedirect) 호출. 구글 로그인 버튼 유지 | `frontend/src/pages/Login/Login.jsx` |
| 20 (Register) | 회원가입 201 후 navigate('/login') → login() 호출로 변경 | `frontend/src/pages/Register/Register.jsx` |

### 추가 필요 작업
- `getOidcUser` 함수를 AuthContext에서 export (axiosInstance에서 사용)
- App.jsx: react-oidc-context AuthProvider로 교체, /callback 라우트 추가

## 구현 원칙
- 각 테스트를 통과하는 데 필요한 최소한의 코드만 작성
- 리팩토링, 최적화, 기능 추가 없음
