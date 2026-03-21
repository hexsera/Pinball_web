# OAuth 2.0 내부 서비스 도입 실행계획

## 전체 흐름도

```
[로그인]
사용자 클릭
  │
  ▼
Login.jsx → auth.signinRedirect() 호출 (react-oidc-context)
  │  react-oidc-context가 state 생성/저장, redirect 처리
  ▼
GET /api/v1/oauth/authorize?response_type=code&client_id=...&redirect_uri=...&state=...
  │
  ├─ 미로그인 → /login 페이지로 리다이렉트 (자격증명 입력 후 재시도)
  │
  └─ 로그인됨 → Authorization Code 생성 (in-memory 저장, 10분 유효)
                │
                ▼
              /callback?code=...&state=... 으로 리다이렉트
                │
                ▼
              react-oidc-context가 자동 처리:
                state 검증, POST /api/v1/oauth/token, token 저장, 자동 갱신 설정
                │
                ▼
              AuthContext에서 auth.user로 사용자 정보 접근
                │
                ▼
              / 또는 /admin 으로 이동

[API 요청]
axiosInstance 인터셉터
  → auth.user?.access_token 읽기 (react-oidc-context)
  → Authorization: Bearer <token> 헤더 자동 추가
  → API 호출

[회원가입]
Register.jsx (3단계 입력)
  │
  ▼
POST /api/v1/register (기존 유지)
  │
  ▼
성공 → auth.signinRedirect() 호출 → [로그인] 플로우와 동일
```

---

## 요구사항 요약

**요구사항**: 현재 일반 로그인/회원가입에 OAuth 2.0 Authorization Code Flow를 도입한다. Google 같은 외부 서비스가 아닌 Pinball_web 내부 서비스 간 인증에 적용한다.

**목적**: 현재 로그인 방식은 이메일+비밀번호를 직접 서버로 전송하는 단순 방식이다. OAuth 2.0을 도입하면 토큰 기반 인증으로 보안이 강화되고, 향후 서드파티 클라이언트가 생길 경우 표준 방식으로 권한을 위임할 수 있다.

---

## 현재상태 분석

- **프론트엔드**: 이메일+비밀번호를 `POST /api/v1/login`으로 직접 전송. `@react-oauth/google`로 Google OAuth는 이미 구현됨. AuthContext는 localStorage에 `{ id, name, role, email }` 저장.
- **백엔드**: FastAPI + Authlib. 로그인 시 DB에서 User 조회 후 bcrypt 비교 후 LoginResponse 반환. JWT 토큰 없음. 세션 없음.
- **문제점**: 토큰 없이 사용자 정보만 반환하므로 API 요청마다 인증 불가. localStorage XSS 취약.

---

## 구현 방법

**선택 기술**:
- 백엔드: `Authlib` (이미 설치됨) — OAuth 2.0 Authorization Server 기능 제공. `python-jose`로 JWT Access Token/Refresh Token 발급.
- 프론트엔드: `react-oidc-context` (주간 265K 다운로드, 2026 React 표준) — Authorization Code Flow, state 관리, token 교환, token 저장, 자동 갱신을 모두 자동 처리.

**플로우**:
```
클라이언트 → Authorization Endpoint (code 요청)
          → 로그인 페이지 (자격증명 입력)
          → code 발급 → 클라이언트로 리다이렉트
클라이언트 → Token Endpoint (code 교환) ← react-oidc-context 자동 처리
          → Access Token + Refresh Token 반환 + 저장 + 자동 갱신
클라이언트 → API 요청 시 Authorization: Bearer <token> 헤더 사용
```

**PHASE 1**: 프론트엔드 — react-oidc-context 설정, 로그인/회원가입 연동, axios 인터셉터
**PHASE 2**: 백엔드 — Authorization Server 구현 (Authorization Endpoint, Token Endpoint)

---

## 구현 단계

### PHASE 1 — 프론트엔드

#### 1-1. 패키지 설치
```bash
source ~/.nvm/nvm.sh && npm install react-oidc-context
```
- **무엇을 하는가**: Authorization Code Flow 전체(state 관리, token 교환, token 저장, 자동 갱신)를 처리하는 React 전용 라이브러리 설치
- 내부적으로 `oidc-client-ts`를 사용하며, React Context와 `useAuth()` Hook을 제공
- `auth.signinRedirect()` 한 줄로 로그인 시작, `/callback` 처리도 자동

#### 1-2. AuthProvider 설정 (App.jsx)
```javascript
// frontend/src/App.jsx 수정
import { AuthProvider } from 'react-oidc-context';

const oidcConfig = {
  authority: window.location.origin,         // 백엔드 = 같은 도메인
  client_id: 'pinball-web-client',
  redirect_uri: `${window.location.origin}/callback`,
  scope: 'openid profile',
  metadataUrl: undefined,                    // OIDC discovery 미사용
  metadata: {                                // 엔드포인트 직접 지정
    authorization_endpoint: '/api/v1/oauth/authorize',
    token_endpoint: '/api/v1/oauth/token',
  },
  automaticSilentRenew: true,               // Access Token 만료 전 자동 갱신
};

export default function App() {
  return (
    <AuthProvider {...oidcConfig}>
      {/* 기존 라우터 구조 유지 */}
    </AuthProvider>
  );
}
```
- **무엇을 하는가**: 앱 전체에 OIDC 인증 Context를 제공하는 Provider 설정
- `metadata`로 OIDC discovery 없이 백엔드 엔드포인트를 직접 지정 (내부 서버에 필수)
- `automaticSilentRenew: true`로 토큰 만료 전 자동 갱신 활성화

#### 1-3. OAuthCallback 라우트 추가 (App.jsx)
```javascript
// frontend/src/App.jsx 라우터 부분
import { useAuth } from 'react-oidc-context';

// /callback 경로에 추가할 컴포넌트
function OAuthCallback() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) navigate('/');
    if (!auth.isLoading && auth.error) navigate('/login');
  }, [auth.isLoading, auth.isAuthenticated, auth.error]);

  return <div>로그인 처리 중...</div>;
}

// 라우터에 추가
<Route path="/callback" element={<OAuthCallback />} />
```
- **무엇을 하는가**: `/callback` 경로에서 react-oidc-context가 자동으로 code 수신 → token 교환 → 저장을 처리, 이 컴포넌트는 완료 후 리다이렉트만 담당
- state 검증, token POST, sessionStorage 저장은 라이브러리가 자동 처리

#### 1-4. AuthContext 수정 (react-oidc-context 연동)
```javascript
// frontend/src/contexts/AuthContext.jsx 수정
import { useAuth as useOidcAuth } from 'react-oidc-context';

export function useAuth() {
  const oidc = useOidcAuth();
  return {
    user: oidc.user?.profile ?? null,        // 기존 컴포넌트 호환성 유지
    isAuthenticated: oidc.isAuthenticated,
    login: () => oidc.signinRedirect(),      // 기존 login() 호출부 호환
    logout: () => oidc.removeUser(),
    getAccessToken: () => oidc.user?.access_token ?? null,
  };
}
```
- **무엇을 하는가**: 기존 `useAuth()` 인터페이스를 유지하면서 내부를 react-oidc-context로 교체
- 기존 컴포넌트에서 `useAuth()`를 호출하는 코드를 수정 없이 그대로 사용 가능

#### 1-5. Login.jsx 수정
```javascript
// frontend/src/pages/Login/Login.jsx 수정 부분
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();

  const handleLoginClick = () => {
    login(); // auth.signinRedirect() → Authorization Endpoint로 리다이렉트
  };
  // ... 기존 폼 구조 유지
}
```
- **무엇을 하는가**: 기존 로그인 버튼에 `login()` 연결만 추가
- state 생성, redirect URL 구성은 react-oidc-context가 자동 처리

#### 1-6. Register.jsx 수정
```javascript
// frontend/src/pages/Register/Register.jsx 수정 부분
import { useAuth } from '../../contexts/AuthContext';

const { login } = useAuth();

const handleRegister = async () => {
  await axios.post('/api/v1/register', { email, nickname, password, birth_date });
  login(); // 회원가입 후 바로 OAuth 플로우 시작
};
```
- **무엇을 하는가**: 회원가입 완료 후 `login()` 호출로 OAuth 플로우 자동 시작
- 회원가입 API 자체는 변경 없이 유지

#### 1-7. API 요청에 Bearer Token 추가 (axios 인터셉터)
```javascript
// frontend/src/api/axiosInstance.js
import axios from 'axios';
import { getOidcUser } from '../contexts/AuthContext'; // auth 인스턴스 참조

const axiosInstance = axios.create({ baseURL: '/api/v1' });

axiosInstance.interceptors.request.use((config) => {
  const token = getOidcUser()?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```
- **무엇을 하는가**: 모든 API 요청에 자동으로 `Authorization: Bearer <token>` 헤더 추가
- react-oidc-context의 user 객체에서 access_token을 직접 읽어 사용
- 기존 `axios` 직접 호출 코드는 이 인스턴스로 교체

---

### PHASE 2 — 백엔드

#### 2-1. 패키지 추가
```text
# backend/requirements.txt 추가
python-jose[cryptography]==3.3.0
```
- **무엇을 하는가**: JWT(Access Token, Refresh Token) 서명 및 검증 라이브러리 추가
- Authlib는 이미 설치됨 — Authorization Server 기능에 사용
- `python-jose`는 JWT 생성/검증에 사용 (HS256)

#### 2-2. OAuth 클라이언트 등록 (DB 없이 설정 파일로 관리)
```python
# backend/app/core/oauth_clients.py
OAUTH_CLIENTS = {
  'pinball-web-client': {
    'client_id': 'pinball-web-client',
    'redirect_uris': ['https://hexsera.com/callback', 'http://localhost:5173/callback'],
    'scope': 'openid profile',
    'grant_types': ['authorization_code'],
    'response_types': ['code'],
  }
}
```
- **무엇을 하는가**: 내부 클라이언트(프론트엔드)를 OAuth 서버에 등록
- 현재는 단일 내부 클라이언트이므로 DB가 아닌 설정 파일로 관리
- `redirect_uris`로 허용된 주소 외에는 code 발급 차단

#### 2-3. Authorization Code 저장소 (in-memory)
```python
# backend/app/core/auth_codes.py
import secrets, time
from typing import Dict

_codes: Dict[str, dict] = {}

def create_code(user_id: int, client_id: str, redirect_uri: str) -> str:
  code = secrets.token_urlsafe(32)
  _codes[code] = {
    'user_id': user_id, 'client_id': client_id,
    'redirect_uri': redirect_uri,
    'expires_at': time.time() + 600  # 10분
  }
  return code

def consume_code(code: str) -> dict | None:
  data = _codes.pop(code, None)
  if data and data['expires_at'] > time.time():
    return data
  return None
```
- **무엇을 하는가**: Authorization Code를 서버 메모리에 임시 저장 (10분 유효)
- `consume_code`는 code를 꺼내면 즉시 삭제 — 재사용 방지
- 단일 서버 환경이므로 in-memory로 충분 (다중 서버 시 Redis 필요)

#### 2-4. JWT 토큰 유틸리티
```python
# backend/app/core/jwt_utils.py
from jose import jwt
from datetime import datetime, timedelta
from app.core.config import settings

ALGORITHM = 'HS256'

def create_access_token(user_id: int, email: str, role: str) -> str:
  payload = {
    'sub': str(user_id), 'email': email, 'role': role,
    'exp': datetime.utcnow() + timedelta(hours=1),
    'iat': datetime.utcnow(), 'type': 'access'
  }
  return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int) -> str:
  payload = {
    'sub': str(user_id),
    'exp': datetime.utcnow() + timedelta(days=30),
    'iat': datetime.utcnow(), 'type': 'refresh'
  }
  return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
  return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
```
- **무엇을 하는가**: Access Token(1시간)과 Refresh Token(30일)을 JWT로 생성/검증
- `sub`에 user_id를 저장해 API에서 현재 사용자를 식별
- `SECRET_KEY`는 환경변수에서 로드 (기존 config.py 확장)

#### 2-5. Authorization Endpoint 구현
```python
# backend/app/api/v1/oauth.py (신규 파일)
@router.get('/oauth/authorize')
async def authorize(
  response_type: str, client_id: str, redirect_uri: str, state: str,
  current_user: dict = Depends(get_current_user_optional),
  db: Session = Depends(get_db)
):
  client = OAUTH_CLIENTS.get(client_id)
  if not client or redirect_uri not in client['redirect_uris']:
    raise HTTPException(400, 'Invalid client or redirect_uri')

  if current_user is None:
    return RedirectResponse(f'/login?next=/oauth/authorize&client_id={client_id}&redirect_uri={redirect_uri}&state={state}')

  code = create_code(current_user['id'], client_id, redirect_uri)
  return RedirectResponse(f'{redirect_uri}?code={code}&state={state}')
```
- **무엇을 하는가**: 프론트엔드가 code를 요청하는 첫 번째 엔드포인트
- 클라이언트 검증 후 현재 로그인 상태 확인, 미로그인 시 로그인 페이지로 보냄
- 로그인 완료 후 code를 redirect_uri에 붙여 프론트로 리다이렉트

#### 2-6. Token Endpoint 구현
```python
# backend/app/api/v1/oauth.py 계속
@router.post('/oauth/token')
async def token(
  grant_type: str = Form(...), code: str = Form(...),
  redirect_uri: str = Form(...), client_id: str = Form(...),
  db: Session = Depends(get_db)
):
  code_data = consume_code(code)
  if not code_data or code_data['redirect_uri'] != redirect_uri:
    raise HTTPException(400, 'Invalid or expired code')

  user = db.query(User).filter(User.id == code_data['user_id']).first()
  access_token = create_access_token(user.id, user.email, user.role)
  refresh_token = create_refresh_token(user.id)
  return {'access_token': access_token, 'refresh_token': refresh_token,
          'token_type': 'Bearer', 'expires_in': 3600,
          'user': {'id': user.id, 'email': user.email, 'nickname': user.nickname, 'role': user.role}}
```
- **무엇을 하는가**: code를 받아 Access Token + Refresh Token을 발급하는 엔드포인트
- `redirect_uri` 검증으로 code를 탈취해도 다른 주소로 token 교환 불가
- `consume_code`로 code를 즉시 소비 — 동일 code 재사용 불가

#### 2-7. Bearer Token 인증 의존성 추가
```python
# backend/app/core/dependencies.py 신규 또는 수정
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, Security

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
  credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
  db: Session = Depends(get_db)
):
  if not credentials:
    raise HTTPException(401, 'Not authenticated')
  payload = decode_token(credentials.credentials)
  user = db.query(User).filter(User.id == int(payload['sub'])).first()
  if not user:
    raise HTTPException(401, 'User not found')
  return user
```
- **무엇을 하는가**: `Authorization: Bearer <token>` 헤더를 검증하는 FastAPI 의존성 함수
- 기존 API Key 의존성과 함께 사용하거나 교체하여 엔드포인트 보호
- 이 함수를 `Depends(get_current_user)`로 라우터에 적용

#### 2-8. config.py에 SECRET_KEY 추가
```python
# backend/app/core/config.py 수정
class Settings(BaseSettings):
  # 기존 항목...
  SECRET_KEY: str = 'change-me-in-production'

settings = Settings()
```
- **무엇을 하는가**: JWT 서명에 사용할 비밀키를 환경변수로 관리
- `.env` 파일에 `SECRET_KEY=<랜덤 256비트 값>` 추가 필요
- 프로덕션에서는 `openssl rand -hex 32`로 생성한 값 사용

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/App.jsx` | 수정 | AuthProvider 설정, `/callback` 라우트 추가 |
| `frontend/src/contexts/AuthContext.jsx` | 수정 | react-oidc-context 기반으로 교체, 기존 인터페이스 유지 |
| `frontend/src/pages/Login/Login.jsx` | 수정 | `login()` 호출로 OAuth 플로우 시작 연결 |
| `frontend/src/pages/Register/Register.jsx` | 수정 | 회원가입 후 `login()` 호출로 OAuth 플로우 연동 |
| `frontend/src/api/axiosInstance.js` | 생성 | Bearer Token 자동 주입 axios 인터셉터 |
| `backend/requirements.txt` | 수정 | `python-jose[cryptography]` 추가 |
| `backend/app/core/oauth_clients.py` | 생성 | 내부 OAuth 클라이언트 등록 설정 |
| `backend/app/core/auth_codes.py` | 생성 | Authorization Code 임시 저장소 |
| `backend/app/core/jwt_utils.py` | 생성 | JWT 토큰 생성/검증 유틸 |
| `backend/app/api/v1/oauth.py` | 생성 | Authorization Endpoint, Token Endpoint |
| `backend/app/core/config.py` | 수정 | `SECRET_KEY` 환경변수 추가 |
| `backend/app/core/dependencies.py` | 생성/수정 | Bearer Token 인증 의존성 함수 |
| `backend/.env` | 수정 | `SECRET_KEY` 값 추가 |

---

## 완료 체크리스트

- [ ] 로그인 버튼 클릭 시 `/api/v1/oauth/authorize`로 리다이렉트되는가
- [ ] `/callback` 경로에서 react-oidc-context가 자동으로 token 교환을 완료하는가
- [ ] 로그인 성공 후 `auth.isAuthenticated`가 true가 되는가
- [ ] 로그인 후 API 요청의 Request Header에 `Authorization: Bearer <token>`이 포함되는가
- [ ] 회원가입 완료 후 자동으로 OAuth 로그인 플로우가 시작되는가
- [ ] 유효하지 않은 code로 token 요청 시 400 오류가 반환되는가
- [ ] Access Token 만료(1시간) 전 자동 갱신(`automaticSilentRenew`)이 동작하는가
- [ ] 개발(localhost:5173)과 프로덕션(hexsera.com) 환경 모두에서 redirect_uri가 동작하는가
