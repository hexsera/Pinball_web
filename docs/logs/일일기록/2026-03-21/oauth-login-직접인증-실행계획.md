# OAuth 로그인 직접 인증 실행계획

## 요구사항 요약

**요구사항**: 프론트 로그인 폼에서 이메일+비밀번호를 백엔드로 직접 전송하고, 백엔드가 DB 검증 후 Authorization Code를 발급하면 프론트가 이를 Token으로 교환하는 흐름을 구현한다.

**목적**: 기존 `GET /oauth/authorize`는 Bearer Token이 있어야 진입 가능한 구조라 최초 로그인이 불가능하다. 프론트가 자격증명을 직접 제출해 code를 받는 새 엔드포인트를 추가해 이 문제를 해결한다.

---

## 현재상태 분석

- **프론트**: `Login.jsx`에 이메일/비밀번호 입력 필드가 있지만 `handleLogin`이 `login()`(= `signinRedirect()`)만 호출해 자격증명을 전송하지 않는다.
- **백엔드**: `GET /oauth/authorize`는 `get_current_user_optional` 의존성으로 Bearer Token을 먼저 요구한다. 최초 로그인 시 토큰이 없으므로 항상 `/login`으로 리다이렉트되어 순환 구조가 된다.
- **기존 자산 재사용 가능**: `auth_codes.py`(code 생성/소비), `jwt_utils.py`(token 발급), `oauth_clients.py`(client 검증), `/oauth/token` 엔드포인트, `axiosInstance.js`(Bearer 자동 주입), `react-oidc-context`(token 저장/갱신)은 모두 그대로 사용한다.

---

## 구현 방법

**새 엔드포인트 `POST /oauth/authorize`** 를 추가한다. 이 엔드포인트는 이메일+비밀번호+client_id+redirect_uri를 받아 DB 검증 후 Authorization Code를 JSON으로 반환한다. 프론트는 이 code를 받아 기존 `POST /oauth/token`으로 교환한다. `react-oidc-context`의 자동 흐름(`signinRedirect`) 대신 프론트가 두 번의 API 호출을 직접 수행하는 방식이다.

---

## 구현 단계

### 1. 백엔드 — `POST /oauth/authorize` 엔드포인트 추가

```python
# backend/app/api/v1/oauth.py — router에 추가
from app.schemas.user import LoginRequest

class AuthorizeRequest(BaseModel):
    email: str
    password: str
    client_id: str
    redirect_uri: str

@router.post("/oauth/authorize")
def authorize_with_credentials(body: AuthorizeRequest, db: Session = Depends(get_db)):
    client = OAUTH_CLIENTS.get(body.client_id)
    if not client or body.redirect_uri not in client["redirect_uris"]:
        raise HTTPException(status_code=400, detail="Invalid client or redirect_uri")

    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    code = create_code(user.id, body.client_id, body.redirect_uri)
    return {"code": code}
```
- **무엇을 하는가**: 기존 `GET /oauth/authorize`를 대체하지 않고 `POST` 메서드로 별도 추가. 자격증명 검증 후 code를 JSON으로 반환해 프론트가 직접 사용하도록 한다.
- `verify_password`는 `app.core.security`에 이미 존재하므로 import만 추가한다.
- `create_code`, `OAUTH_CLIENTS`는 기존 import 그대로 사용한다.

### 2. 프론트 — `Login.jsx` handleLogin 수정

```javascript
// frontend/src/pages/Login/Login.jsx
import axiosInstance from '../../api/axiosInstance';

const REDIRECT_URI = `${window.location.origin}/callback`;
const CLIENT_ID = 'pinball-web-client';

const handleLogin = async () => {
  try {
    const { data } = await axiosInstance.post('/oauth/authorize', {
      email: username,
      password,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    });
    const params = new URLSearchParams({ code: data.code, state: 'login' });
    window.location.href = `${REDIRECT_URI}?${params.toString()}`;
  } catch {
    alert('이메일 또는 비밀번호가 올바르지 않습니다.');
  }
};
```
- **무엇을 하는가**: `username`/`password` 값을 `POST /oauth/authorize`로 전송하고 받은 code를 `/callback?code=...&state=...` 형식으로 URL에 붙여 이동한다.
- `window.location.href`로 이동하면 `react-oidc-context`가 `/callback` 라우트에서 code를 감지해 자동으로 `POST /oauth/token` 교환을 수행한다.
- `axiosInstance`를 사용하므로 기존 Bearer 인터셉터가 그대로 동작한다.

### 3. 프론트 — `App.jsx` oidcConfig에 `userInfoEndpoint` 제거 확인 및 `response_mode` 설정

```javascript
// frontend/src/App.jsx
const oidcConfig = {
  authority: window.location.origin,
  client_id: 'pinball-web-client',
  redirect_uri: `${window.location.origin}/callback`,
  scope: 'openid profile',
  metadata: {
    authorization_endpoint: `${window.location.origin}/api/v1/oauth/authorize`,
    token_endpoint: '/api/v1/oauth/token',
    userinfo_endpoint: '/api/v1/oauth/me',  // 추가
  },
  automaticSilentRenew: true,
  response_mode: 'query',  // code를 query string으로 받도록 명시
};
```
- **무엇을 하는가**: `react-oidc-context`가 `/callback?code=...`에서 code를 올바르게 파싱하려면 `response_mode: 'query'`가 명시되어야 한다.
- `userinfo_endpoint`를 `/api/v1/oauth/me`로 지정해 로그인 후 사용자 프로필을 가져올 수 있게 한다. 이 엔드포인트는 이미 `oauth.py`에 구현되어 있다.

### 4. 백엔드 — `GET /oauth/me` OIDC 표준 필드 확인

```python
# backend/app/api/v1/oauth.py — 기존 /oauth/me 수정
@router.get("/oauth/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "sub": str(current_user.id),        # OIDC 필수 필드
        "email": current_user.email,
        "nickname": current_user.nickname,
        "role": current_user.role,
    }
```
- **무엇을 하는가**: `react-oidc-context`는 `userinfo_endpoint` 응답에서 `sub` 필드를 필수로 요구한다. 기존 응답의 `id` → `sub`(string)으로 수정한다.
- `AuthContext.jsx`의 `profile.sub`가 이 값을 읽으므로 프론트 변경 없이 연동된다.

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/oauth.py` | 수정 | `POST /oauth/authorize` 엔드포인트 추가, `/oauth/me` `sub` 필드 수정 |
| `frontend/src/pages/Login/Login.jsx` | 수정 | `handleLogin`에서 `POST /oauth/authorize` 호출 후 `/callback`으로 이동 |
| `frontend/src/App.jsx` | 수정 | `oidcConfig`에 `userinfo_endpoint`, `response_mode: 'query'` 추가 |

---

## 완료 체크리스트

- [ ] 로그인 버튼 클릭 시 브라우저 Network 탭에 `POST /api/v1/oauth/authorize` 요청이 보인다
- [ ] 올바른 이메일+비밀번호 입력 시 `/callback?code=...` 로 이동한다
- [ ] `/callback` 페이지에서 "로그인 처리 중..." 후 `/` 또는 `/admin`으로 이동한다
- [ ] 로그인 완료 후 브라우저 sessionStorage에 `oidc.user:...` 키로 token이 저장된다
- [ ] 로그인 후 API 요청의 Request Header에 `Authorization: Bearer <token>`이 포함된다
- [ ] 잘못된 비밀번호 입력 시 "이메일 또는 비밀번호가 올바르지 않습니다." 알림이 뜬다
- [ ] `npm run build`가 오류 없이 완료된다
