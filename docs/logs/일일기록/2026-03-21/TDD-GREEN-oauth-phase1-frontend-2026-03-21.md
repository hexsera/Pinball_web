# TDD GREEN 완료: OAuth PHASE 1 — 프론트엔드

## 구현 완료 항목
- AuthContext: react-oidc-context 기반으로 교체, localStorage 병행(OIDC→localStorage 동기화)
- OAuthCallback 컴포넌트 신규 생성
- axiosInstance 신규 생성 (Bearer Token 자동 주입)
- Login: 로그인 버튼 → signinRedirect 연결
- Register: 회원가입 성공 후 login() 호출
- App.jsx: react-oidc-context AuthProvider 교체, /callback 라우트 추가

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/contexts/AuthContext.jsx` | react-oidc-context 기반 교체, localStorage 동기화, getOidcUser export |
| `frontend/src/pages/OAuthCallback.jsx` | 신규 생성 — /callback 처리 컴포넌트 |
| `frontend/src/api/axiosInstance.js` | 신규 생성 — Bearer Token 자동 주입 |
| `frontend/src/pages/Login/Login.jsx` | handleLogin → login() 호출로 변경 |
| `frontend/src/pages/Register/Register.jsx` | 성공 후 navigate('/login') → login() 호출로 변경 |
| `frontend/src/App.jsx` | OIDC AuthProvider 교체, /callback 라우트 추가 |

## 통과한 테스트 목록 (26개)

### AuthContext.test.jsx (15개)
1. useAuth()는 isAuthenticated를 반환한다
2. useAuth()는 isLoggedIn을 반환한다
3. useAuth()는 login 함수를 반환한다
4. useAuth()는 logout 함수를 반환한다
5. useAuth()는 getAccessToken 함수를 반환한다
6. login() 호출 시 signinRedirect가 실행된다
7. logout() 호출 시 removeUser가 실행된다
8. logout() 호출 시 localStorage에서 user가 제거된다
9. 인증된 상태에서 getAccessToken은 토큰 문자열을 반환한다
10. 미인증 상태에서 getAccessToken은 null을 반환한다
11. 인증된 상태에서 user는 {id, name, role, email} 형식을 반환한다
12. OIDC 미인증 + localStorage에 user가 있으면 localStorage user를 반환한다
13. OIDC 미인증 + localStorage에 user가 없으면 user는 null이다
14. OIDC 미인증 + localStorage user가 있으면 isLoggedIn은 true다
15. OIDC 인증 완료 시 localStorage에 {id, name, role, email} 형식으로 저장된다

### OAuthCallback.test.jsx (3개)
16. 로딩 중에는 "로그인 처리 중..." 텍스트를 표시한다
17. 인증 완료 후 /로 이동한다
18. 에러 발생 시 /login으로 이동한다

### axiosInstance.test.js (3개)
19. axiosInstance는 기본 baseURL이 /api/v1이다
20. access_token이 있으면 Authorization 헤더를 추가한다
21. access_token이 없으면 Authorization 헤더를 추가하지 않는다

### Login.test.jsx (3개)
22. 로그인 버튼 클릭 시 signinRedirect가 호출된다
23. 구글 로그인 버튼이 렌더링된다
24. 구글 로그인 버튼 클릭 시 googleLogin 함수가 호출된다

### Register.test.jsx (2개)
25. 회원가입 성공(201) 후 login()이 호출된다
26. 회원가입 실패 시 alert가 표시된다

## 다음 단계
- REFACTOR 단계 또는 PHASE 2 백엔드 구현
