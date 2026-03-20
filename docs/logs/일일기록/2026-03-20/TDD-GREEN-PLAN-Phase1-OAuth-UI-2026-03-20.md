# TDD GREEN 계획: PHASE 1 — 프론트엔드 OAuth 연동 UI

## 통과시킬 테스트 목록

| # | 테스트명 | 검증하는 동작 | 파일 |
|---|---------|-------------|------|
| 1 | 구글_로그인_버튼이_렌더링된다 | "구글로 로그인" 텍스트 버튼 존재 | Login.test.jsx |
| 2 | 구글_로그인_버튼_클릭_시_GET_auth_google_login을_호출한다 | axios.get('/api/v1/auth/google/login') 호출 | Login.test.jsx |
| 3 | 구글_로그인_버튼_클릭_시_반환된_URL로_이동한다 | window.location.href = authorization_url | Login.test.jsx |
| 4 | 자체_로그인_성공_시_authorization_code로_JWT를_교환한다 | axios.post('/api/v1/auth/token', {authorization_code}) | Login.test.jsx |
| 5 | JWT_교환_성공_후_사용자_정보를_localStorage에_저장한다 | auth/token 성공 후 localStorage에 user 저장 | Login.test.jsx |
| 6 | JWT_교환_실패_시_로그인_에러를_표시한다 | auth/token 실패 시 Alert 렌더링 | Login.test.jsx |
| 7 | OAuthCallback_진입_시_로딩_스피너가_표시된다 | role="progressbar" 요소 렌더링 | OAuthCallback.test.jsx |
| 8 | URL에서_authorization_code를_추출하여_토큰_교환을_호출한다 | URL ?code=abc123 → POST /api/v1/auth/token | OAuthCallback.test.jsx |
| 9 | 토큰_교환_성공_시_user_정보를_localStorage에_저장한다 | 응답 user_id/email 등을 localStorage user에 저장 | OAuthCallback.test.jsx |
| 10 | 토큰_교환_성공_시_일반_사용자는_홈으로_이동한다 | role=user → navigate('/') | OAuthCallback.test.jsx |
| 11 | 토큰_교환_성공_시_관리자는_관리자_페이지로_이동한다 | role=admin → navigate('/admin') | OAuthCallback.test.jsx |
| 12 | 토큰_교환_실패_시_로그인_페이지로_이동한다 | axios 오류 → navigate('/login') | OAuthCallback.test.jsx |
| 13 | URL에_code_파라미터가_없으면_로그인_페이지로_이동한다 | URL에 ?code 없음 → navigate('/login') | OAuthCallback.test.jsx |
| 14 | 회원가입_성공_후_authorization_code로_JWT를_교환한다 | 회원가입 후 POST /api/v1/auth/token | Register.test.jsx |
| 15 | JWT_교환_성공_후_홈으로_이동한다 | navigate('/') 호출 (navigate('/login') 미호출) | Register.test.jsx |
| 16 | JWT_교환_성공_후_user_정보가_localStorage에_저장된다 | auth/token 성공 후 localStorage user 저장 | Register.test.jsx |
| 17 | logout_시_POST_auth_logout을_호출한다 | axios.post('/api/v1/auth/logout') 호출 | AuthContext.test.jsx |

---

## 구현 계획 상세

### 1. `frontend/src/pages/Login/Login.jsx` 수정

**현재 상태:**
- 이메일/비밀번호 입력 + 로그인 버튼 + 회원가입 버튼
- `handleLogin`: POST /api/v1/login → 성공 시 login() 호출 → 페이지 이동

**변경사항:**

#### 1-1. 구글 로그인 버튼 추가 (테스트 1, 2, 3 통과)

```jsx
// 추가할 함수
const handleGoogleLogin = async () => {
  const response = await axios.get('/api/v1/auth/google/login');
  window.location.href = response.data.authorization_url;
};
```

```jsx
// JSX에 추가 (회원가입 버튼 아래)
<Button
  variant="outlined"
  sx={{ width: '300px', borderColor: COLORS.text, color: COLORS.text }}
  onClick={handleGoogleLogin}
>
  구글로 로그인
</Button>
```

#### 1-2. handleLogin 수정 (테스트 4, 5, 6 통과)

현재 흐름:
```
POST /api/v1/login → 성공 → login({ id, name, role, email }) → 페이지 이동
```

변경 흐름:
```
POST /api/v1/login
  → 성공(200) → authorization_code 추출
    → POST /api/v1/auth/token({ authorization_code })
      → 성공(200) → login({ id, name, role, email }) → 페이지 이동
      → 실패 → setLoginError(true)
  → 실패 → setLoginError(true) [기존과 동일]
```

핵심 코드 변경:
```js
// 기존
if (response.status === 200) {
  login({ id: response.data.user_id, ... });
  navigate(...)
}

// 변경
if (response.status === 200) {
  const tokenResponse = await axios.post('/api/v1/auth/token', {
    authorization_code: response.data.authorization_code,
  });
  login({
    id: tokenResponse.data.user_id,
    name: tokenResponse.data.nickname,
    role: tokenResponse.data.role,
    email: tokenResponse.data.email,
  });
  if (tokenResponse.data.role === 'admin') {
    navigate('/admin');
  } else {
    navigate('/');
  }
}
```

> **주의**: 기존 테스트 `로그인 성공 시 localStorage에 email이 저장된다`가 이미 이 흐름에 맞춰 mock을 2개(post x2) 세팅하므로 기존 테스트도 유지된다.

---

### 2. `frontend/src/pages/OAuthCallback/OAuthCallback.jsx` 신규 생성

**디렉토리**: `frontend/src/pages/OAuthCallback/` 생성 필요

**구현 흐름:**
```
컴포넌트 마운트
  → useSearchParams로 URL에서 code 추출
  → code 없음 → navigate('/login') 즉시 반환
  → code 있음 → 로딩 스피너 표시(상태: loading=true)
    → POST /api/v1/auth/token({ authorization_code: code })
      → 성공 → login({ id, name, role, email }) → localStorage 저장
        → role=admin → navigate('/admin')
        → role=user → navigate('/')
      → 실패 → navigate('/login')
```

**사용할 MUI 컴포넌트:**
- `CircularProgress`: role="progressbar" 자동 부여 (테스트 7 통과)
- `Box`: 레이아웃

**전체 코드:**
```jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      navigate('/login');
      return;
    }

    axios.post('/api/v1/auth/token', { authorization_code: code })
      .then((response) => {
        const data = response.data;
        login({ id: data.user_id, name: data.nickname, role: data.role, email: data.email });
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      })
      .catch(() => {
        navigate('/login');
      });
  }, []);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
}

export default OAuthCallback;
```

---

### 3. `frontend/src/pages/Register/Register.jsx` 수정

**현재 상태 (step 2 성공 시):**
```js
if (response.status === 201) {
  navigate('/login');
}
```

**변경 흐름:**
```
POST /api/v1/register
  → 성공(201) → authorization_code 추출
    → POST /api/v1/auth/token({ authorization_code })
      → 성공 → login({ id, name, role, email }) → navigate('/')
      → 실패 → navigate('/login') (기존과 유사 fallback)
  → 실패 → alert (기존 동일)
```

핵심 코드 변경:
```js
// 기존
if (response.status === 201) {
  navigate('/login');
}

// 변경
if (response.status === 201) {
  const tokenResponse = await axios.post('/api/v1/auth/token', {
    authorization_code: response.data.authorization_code,
  });
  login({
    id: tokenResponse.data.user_id,
    name: tokenResponse.data.nickname,
    role: tokenResponse.data.role,
    email: tokenResponse.data.email,
  });
  navigate('/');
}
```

> `useAuth`의 `login` import 추가 필요: `import { useAuth } from '../../contexts/AuthContext';`

---

### 4. `frontend/src/contexts/AuthContext.jsx` 수정

**현재 logout 함수:**
```js
const logout = () => {
  setUser(null);
  setIsLoggedIn(false);
  localStorage.removeItem('user');
};
```

**변경:**
```js
const logout = async () => {
  await axios.post('/api/v1/auth/logout');
  setUser(null);
  setIsLoggedIn(false);
  localStorage.removeItem('user');
};
```

> `import axios from 'axios';` 추가 필요

---

### 5. `frontend/src/App.jsx` 수정 (App 라우터에 `/oauth/callback` 라우트 추가)

```jsx
import OAuthCallback from './pages/OAuthCallback/OAuthCallback';
// ...
<Route path="/oauth/callback" element={<OAuthCallback />} />
```

---

## 구현 원칙

- 각 테스트를 통과하는 데 필요한 최소한의 코드만 작성한다
- 리팩토링, 최적화, 기능 추가 없음
- 기존 통과 테스트(`로그인 성공 시 localStorage에 email이 저장된다`, `logout_시_localStorage의_user가_제거된다`)가 깨지지 않도록 한다

## 예상 결과

구현 완료 후 모든 19개 테스트 통과:
- Login: 7개 ✓
- OAuthCallback: 7개 ✓
- Register: 3개 ✓
- AuthContext: 2개 ✓
