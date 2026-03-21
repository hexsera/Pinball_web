# 구글 로그인 GREEN 계획 실행계획

## 요구사항 요약

**요구사항**: 6개의 RED 테스트를 통과하는 최소한의 프론트엔드 코드를 작성한다.

**목적**: TDD GREEN 단계 — 테스트가 통과하도록 `@react-oauth/google` 패키지 설치, Provider 래핑, 구글 로그인 버튼 추가, 환경변수 설정. Phase 2(Backend), Phase 3(Google Cloud Console)은 제외.

## 현재상태 분석

- `main.jsx`: `GoogleOAuthProvider` 래핑 없음, `App`을 직접 렌더링 중
- `Login.jsx`: 이메일/비밀번호 폼만 있음. `useGoogleLogin` hook 미사용, 구글 버튼 없음
- `frontend/.env`: `VITE_GOOGLE_CLIENT_ID` 환경변수 없음
- `@react-oauth/google` 패키지: 미설치

## 구현 방법

- `@react-oauth/google` 패키지의 `useGoogleLogin` hook을 사용해 Authorization Code Flow 구현
- `flow: 'auth-code'` 옵션으로 브라우저에 Access Token이 노출되지 않도록 설정
- 성공 콜백에서 기존 `login()` 함수를 재사용하여 localStorage 저장 및 navigate

## 구현 단계

### 1. 패키지 설치
```bash
cd /home/hexsera/Pinball_web/frontend && source ~/.nvm/nvm.sh && npm install @react-oauth/google
```
- **무엇을 하는가**: React 앱에서 Google OAuth 2.0을 처리하는 패키지 설치
- `@react-oauth/google`은 Google Identity Services 기반으로 `useGoogleLogin` hook 제공

### 2. GoogleOAuthProvider 래핑 (`frontend/src/main.jsx`)
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);
```
- **무엇을 하는가**: 앱 전체에서 `useGoogleLogin` hook을 사용할 수 있도록 최상위에 Provider 래핑
- `clientId`는 `VITE_GOOGLE_CLIENT_ID` 환경변수에서 읽음

### 3. 구글 로그인 버튼 추가 (`frontend/src/pages/Login/Login.jsx`)
```jsx
import { useGoogleLogin } from '@react-oauth/google';

// 기존 Login 함수 내부에 추가
const googleLogin = useGoogleLogin({
  flow: 'auth-code',
  onSuccess: async (codeResponse) => {
    const res = await axios.post('/api/v1/auth/google', { code: codeResponse.code });
    if (res.status === 200) {
      login({ id: res.data.user_id, name: res.data.nickname, role: res.data.role, email: res.data.email });
      navigate(res.data.role === 'admin' ? '/admin' : '/');
    }
  },
  onError: () => alert('구글 로그인에 실패했습니다.'),
});

// JSX 내 회원가입 버튼 아래에 추가
<Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
  <button onClick={() => googleLogin()}>구글로 로그인</button>
</Box>
```
- **무엇을 하는가**: 구글 로그인 팝업 → Authorization Code만 받아 백엔드로 전송
- `flow: 'auth-code'`가 없으면 Implicit Flow로 동작해 Access Token이 브라우저에 노출됨
- 성공 시 기존 `login()` 함수를 재사용해 localStorage 저장 및 역할 기반 페이지 이동

### 4. 환경변수 추가 (`frontend/.env`)
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```
- **무엇을 하는가**: Google Cloud Console에서 발급받을 클라이언트 ID를 환경변수로 관리
- 현재는 플레이스홀더 값. Phase 3 완료 후 실제 값으로 교체

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/main.jsx` | 수정 | `GoogleOAuthProvider` 래핑 추가 |
| `frontend/src/pages/Login/Login.jsx` | 수정 | `useGoogleLogin` hook 및 구글 로그인 버튼 추가 |
| `frontend/.env` | 수정 | `VITE_GOOGLE_CLIENT_ID` 환경변수 추가 |

## 완료 체크리스트

- [ ] `npm install @react-oauth/google` 성공
- [ ] `npx vitest run src/test/Login.test.jsx` 7개 테스트 모두 통과
- [ ] 기존 이메일/비밀번호 로그인 회귀 테스트 통과
- [ ] 구글 로그인 버튼이 렌더링된다 테스트 통과
- [ ] 버튼 클릭 시 googleLogin 함수가 호출된다 테스트 통과
- [ ] 성공 시 POST /api/v1/auth/google 호출 테스트 통과
- [ ] role=user → / 이동 테스트 통과
- [ ] role=admin → /admin 이동 테스트 통과
- [ ] 실패 시 alert 호출 테스트 통과
