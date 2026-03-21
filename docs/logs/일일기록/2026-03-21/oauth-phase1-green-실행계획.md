# OAuth PHASE 1 프론트엔드 GREEN 단계 실행계획

## 요구사항 요약

**요구사항**: TDD RED 단계에서 작성한 20개의 실패 테스트를 통과시키는 최소한의 프로덕션 코드를 작성한다.

**목적**: localStorage 기반 인증과 react-oidc-context 기반 OAuth 2.0 을 병행 운용한다. OIDC 인증 완료 시 기존 localStorage 형식(`{id, name, role, email}`)으로 동기화하여 기존 컴포넌트를 수정 없이 유지한다. PHASE 2 백엔드 완료 전까지는 기존 localStorage 로그인 방식이 fallback으로 동작한다.

---

## 현재상태 분석

- `AuthContext.jsx`: localStorage에 직접 user 저장. `useAuth()`가 `{isLoggedIn, user, loading, login, logout}` 반환.
- `Login.jsx`: `axios.post('/api/v1/login')`으로 직접 자격증명 전송. signinRedirect 미사용.
- `Register.jsx`: 회원가입 성공(201) 후 `navigate('/login')`으로 이동. login() 미호출.
- `App.jsx`: 기존 커스텀 `AuthProvider`로 감싸짐. `/callback` 라우트 없음.
- `frontend/src/api/`: 디렉토리 없음. axiosInstance 미존재.
- `frontend/src/pages/OAuthCallback.jsx`: 파일 없음.

---

## 구현 방법

`react-oidc-context`의 `useAuth` 훅을 `AuthContext.jsx` 내부에서 호출한다. OIDC 인증 완료 시 `profile.sub`→`id`, `profile.nickname`→`name` 으로 변환하여 localStorage에 저장한다. 기존 컴포넌트는 `useAuth()` 인터페이스 변경 없이 그대로 동작한다. PHASE 2 완료 전까지는 기존 `POST /api/v1/login` 로그인 방식을 병행한다.

---

## 구현 단계

### 1. AuthContext.jsx — OIDC + localStorage 병행
```javascript
import { useEffect } from 'react';
import { useAuth as useOidcAuth } from 'react-oidc-context';

let _oidcUserRef = null;
export function getOidcUser() { return _oidcUserRef; }

export function useAuth() {
  const oidc = useOidcAuth();
  _oidcUserRef = oidc.user;

  // OIDC 인증 완료 시 기존 형식으로 localStorage 동기화
  useEffect(() => {
    if (oidc.isAuthenticated && oidc.user?.profile) {
      const p = oidc.user.profile;
      localStorage.setItem('user', JSON.stringify({
        id: p.sub, name: p.nickname, role: p.role, email: p.email,
      }));
    }
    if (!oidc.isAuthenticated) localStorage.removeItem('user');
  }, [oidc.isAuthenticated]);

  const localUser = JSON.parse(localStorage.getItem('user') ?? 'null');
  return {
    user: oidc.user?.profile ? { id: oidc.user.profile.sub, name: oidc.user.profile.nickname,
      role: oidc.user.profile.role, email: oidc.user.profile.email } : localUser,
    isLoggedIn: oidc.isAuthenticated || !!localUser,
    isAuthenticated: oidc.isAuthenticated,
    loading: oidc.isLoading,
    login: () => oidc.signinRedirect(),
    logout: () => { oidc.removeUser(); localStorage.removeItem('user'); },
    getAccessToken: () => oidc.user?.access_token ?? null,
  };
}

export function AuthProvider({ children }) { return children; }
```
- **무엇을 하는가**: OIDC 인증 완료 시 `profile.sub`→`id`, `profile.nickname`→`name`으로 변환해 localStorage에 저장
- OIDC 미인증 상태(PHASE 2 완료 전)에는 기존 localStorage의 user를 그대로 반환 — 기존 컴포넌트 무수정 동작
- `isLoggedIn`: 기존 컴포넌트 호환 / `isAuthenticated`: OIDC 전용 / 둘 다 제공
- `AuthProvider`는 더미로 유지(App.jsx에서 react-oidc-context AuthProvider가 실제 역할 수행)

### 2. OAuthCallback.jsx — 신규 생성
```javascript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useOidcAuth } from 'react-oidc-context';

export default function OAuthCallback() {
  const auth = useOidcAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) navigate('/');
    if (!auth.isLoading && auth.error) navigate('/login');
  }, [auth.isLoading, auth.isAuthenticated, auth.error]);

  return <div>로그인 처리 중...</div>;
}
```
- **무엇을 하는가**: `/callback` 경로에서 react-oidc-context가 code→token 교환 완료 후 결과에 따라 리다이렉트
- 로딩 중에는 "로그인 처리 중..." 표시, 완료 시 `/` 또는 에러 시 `/login`으로 이동

### 3. axiosInstance.js — 신규 생성
```javascript
import axios from 'axios';
import { getOidcUser } from '../contexts/AuthContext';

const axiosInstance = axios.create({ baseURL: '/api/v1' });

axiosInstance.interceptors.request.use((config) => {
  const token = getOidcUser()?.access_token;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export default axiosInstance;
```
- **무엇을 하는가**: 모든 API 요청에 자동으로 `Authorization: Bearer <token>` 헤더를 추가하는 axios 인스턴스
- `getOidcUser()`로 React Context 외부에서 현재 토큰을 읽음
- 토큰이 없으면 헤더를 추가하지 않음 (비로그인 API 요청 허용)

### 4. Login.jsx — 로그인 버튼에 signinRedirect 연결
```javascript
import { useAuth } from '../../contexts/AuthContext';

// 기존 handleLogin 함수 교체
const { login } = useAuth();
const handleLogin = () => { login(); };
```
- **무엇을 하는가**: 로그인 버튼 클릭 시 `login()`(= `signinRedirect()`)를 호출하여 OAuth Authorization Endpoint로 리다이렉트
- 기존 이메일/비밀번호 폼 UI는 그대로 유지

### 5. Register.jsx — 회원가입 성공 후 login() 호출
```javascript
import { useAuth } from '../../contexts/AuthContext';

const { login } = useAuth();

// 기존 201 성공 처리 부분 교체
if (response.status === 201) {
  login(); // navigate('/login') 대신 OAuth 플로우 시작
}
```
- **무엇을 하는가**: 회원가입 완료 후 `navigate('/login')` 대신 `login()`을 호출하여 바로 OAuth 플로우 시작
- 회원가입 API(`POST /api/v1/register`) 자체는 변경 없음

### 6. App.jsx — react-oidc-context AuthProvider 및 /callback 라우트 추가
```javascript
import { AuthProvider } from 'react-oidc-context';
import OAuthCallback from './pages/OAuthCallback';

const oidcConfig = {
  authority: window.location.origin,
  client_id: 'pinball-web-client',
  redirect_uri: `${window.location.origin}/callback`,
  scope: 'openid profile',
  metadata: {
    authorization_endpoint: '/api/v1/oauth/authorize',
    token_endpoint: '/api/v1/oauth/token',
  },
  automaticSilentRenew: true,
};

// <AuthProvider {...oidcConfig}> 로 전체 감싸기
// <Route path="/callback" element={<OAuthCallback />} /> 추가
```
- **무엇을 하는가**: 앱 전체에 OIDC Context를 제공하고 `/callback` 경로 등록
- `metadata`로 OIDC discovery 없이 백엔드 엔드포인트를 직접 지정

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/contexts/AuthContext.jsx` | 수정 | react-oidc-context 기반으로 교체, localStorage 병행(OIDC→localStorage 동기화), getOidcUser export 추가 |
| `frontend/src/pages/OAuthCallback.jsx` | 생성 | /callback 처리 컴포넌트 |
| `frontend/src/api/axiosInstance.js` | 생성 | Bearer Token 자동 주입 axios 인스턴스 |
| `frontend/src/pages/Login/Login.jsx` | 수정 | handleLogin → login() 호출로 변경 |
| `frontend/src/pages/Register/Register.jsx` | 수정 | 성공 후 navigate('/login') → login() 호출로 변경 |
| `frontend/src/App.jsx` | 수정 | react-oidc-context AuthProvider 교체, /callback 라우트 추가 |

---

## 완료 체크리스트

- [ ] `AuthContext.test.jsx` 10개 테스트 모두 통과
- [ ] `OAuthCallback.test.jsx` 3개 테스트 모두 통과
- [ ] `axiosInstance.test.js` 3개 테스트 모두 통과
- [ ] `Login.test.jsx` 3개 테스트 모두 통과
- [ ] `Register.test.jsx` 2개 테스트 모두 통과
- [ ] 총 21개 테스트 중 21개 통과 (0개 실패)
