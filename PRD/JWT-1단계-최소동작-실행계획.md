# JWT 1단계 — 최소 동작 JWT 실행계획

## 요구사항 요약

**요구사항**: 현재 X-API-Key 기반 인증을 JWT Bearer 토큰 인증으로 교체한다.

**목적**: 사용자 신원을 토큰에 담아 인증하고, 이후 Refresh Token 도입(2단계) 등 JWT 기반 확장 인프라를 마련한다. 1단계에서는 복잡한 갱신 없이 수명이 긴 Access Token 하나만 사용한다.

## 현재상태 분석

- 백엔드: `create_access_token()` 함수 존재, `python-jose` 설치됨. 단, 보호 엔드포인트에 JWT 검증 의존성이 없고 `X-API-Key` 헤더를 사용 중.
- 프론트엔드: 로그인/회원가입 시 `access_token`을 `localStorage`에 저장하지만, API 요청 시 `Authorization` 헤더에 첨부하지 않음. 일부 엔드포인트는 하드코딩된 `X-API-Key` 헤더를 직접 사용 중.
- `AuthContext`는 `user` 정보만 localStorage에서 복원하고, 토큰은 복원하지 않음.
- axios 공용 인스턴스(인터셉터)가 없어 모든 페이지가 axios를 직접 호출함.

## 구현 방법

- 백엔드: `get_current_user()` JWT 검증 의존성 함수를 추가해 보호 엔드포인트에 적용. `JWT_EXPIRE_MINUTES`를 `.env`에서 7일로 설정.
- 프론트엔드: axios 공용 인스턴스(`src/lib/api.js`)를 생성하고 요청 인터셉터로 `Authorization: Bearer ...` 헤더를 자동 부착. 401 수신 시 로그아웃 처리. Zustand 스토어로 토큰 관리.
- 토큰은 Zustand 메모리에 저장하되, 새로고침 대비로 localStorage에도 임시 저장(1단계 한정 타협).

## 구현 단계

### 1. Zustand 설치 및 authStore 생성

```bash
# frontend/ 디렉토리에서 실행
source ~/.nvm/nvm.sh && npm install zustand
```

```js
// frontend/src/store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  accessToken: localStorage.getItem('access_token') || null,
  setAccessToken: (token) => {
    localStorage.setItem('access_token', token);
    set({ accessToken: token });
  },
  clearAccessToken: () => {
    localStorage.removeItem('access_token');
    set({ accessToken: null });
  },
}));
```

- `localStorage.getItem`으로 새로고침 시 토큰을 복원한다(1단계 임시 타협).
- `useAuthStore.getState()`로 React 바깥(인터셉터)에서도 접근 가능하다.

### 2. axios 공용 인스턴스 및 인터셉터 생성

```js
// frontend/src/lib/api.js
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAccessToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

- 모든 요청에 토큰을 자동으로 부착한다. 401 수신 시 토큰을 제거하고 로그인 페이지로 이동한다.
- 기존 `X-API-Key` 헤더 하드코딩을 이 인터셉터가 대체한다.

### 3. AuthContext에서 Zustand 연동 및 토큰 저장 통합

```jsx
// frontend/src/contexts/AuthContext.jsx — login/logout 수정
import { useAuthStore } from '../store/authStore';

const login = (userData, accessToken) => {
  setUser(userData);
  setIsLoggedIn(true);
  localStorage.setItem('user', JSON.stringify(userData));
  useAuthStore.getState().setAccessToken(accessToken);
};

const logout = () => {
  setUser(null);
  setIsLoggedIn(false);
  localStorage.removeItem('user');
  useAuthStore.getState().clearAccessToken();
};
```

- `login()` 시그니처에 `accessToken` 파라미터를 추가해 Zustand 스토어에 저장한다.
- 로그아웃 시 localStorage와 Zustand 스토어를 모두 정리한다.

### 4. 로그인/회원가입 페이지에서 토큰 전달

```jsx
// Login.jsx — handleLogin / googleLogin 성공 처리 수정
login(
  { id: response.data.user_id, name: response.data.nickname,
    role: response.data.role, email: response.data.email },
  response.data.access_token   // ← 추가
);
// 기존 localStorage.setItem('access_token', ...) 제거
```

```jsx
// Register.jsx — 회원가입 성공 처리도 동일 패턴 적용
login(
  { id: data.user_id, name: data.nickname, role: data.role, email: data.email },
  data.access_token
);
// 기존 localStorage.setItem('access_token', ...) 제거
```

- 토큰 저장 책임을 authStore 하나로 모은다.

### 5. 기존 axios 직접 호출을 api 인스턴스로 교체

```jsx
// 변경 전 (AdminUserMain.jsx, UserInfo.jsx 등)
import axios from 'axios';
await axios.put(`/api/v1/users/${id}`, data, {
  headers: { 'X-API-Key': 'hexsera-secret-api-key-2026' }
});

// 변경 후
import api from '../../lib/api';
await api.put(`/users/${id}`, data);
```

- `X-API-Key` 하드코딩 헤더를 모두 제거하고 `api` 인스턴스로 교체한다.
- 영향 파일: `AdminUserMain.jsx`, `UserInfo.jsx` (직접 X-API-Key를 사용 중인 곳 전체).

### 6. 백엔드 get_current_user 의존성 추가

```python
# backend/app/api/deps.py 에 추가
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: int = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    from models import User
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```

- JWT를 디코딩해 사용자를 조회하는 의존성 함수다.
- 실패 시 401을 반환하여 프론트엔드 인터셉터가 로그아웃 처리하게 한다.

### 7. 보호 엔드포인트에 get_current_user 적용

```python
# 예: backend/app/api/v1/users.py
from app.api.deps import get_current_user

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),   # ← 추가
):
    ...
```

- `verify_api_key` 의존성을 `get_current_user`로 교체한다.
- 적용 대상: users, game_sessions, notices(관리자 전용 포함) 등 인증이 필요한 라우터 전체.

### 8. .env JWT_EXPIRE_MINUTES 수정

```dotenv
# backend/.env
JWT_EXPIRE_MINUTES=10080   # 7일 (1단계 임시 — Refresh 도입 전 긴 수명)
```

- Refresh Token 없이 운영하는 1단계에서 사용자가 자주 로그아웃되지 않도록 수명을 늘린다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/store/authStore.js` | 생성 | Zustand 토큰 스토어 |
| `frontend/src/lib/api.js` | 생성 | axios 공용 인스턴스 + 인터셉터 |
| `frontend/src/contexts/AuthContext.jsx` | 수정 | login/logout에 authStore 연동 |
| `frontend/src/pages/Login/Login.jsx` | 수정 | login() 호출 시 토큰 전달, X-API-Key 제거 |
| `frontend/src/pages/Register/Register.jsx` | 수정 | login() 호출 시 토큰 전달 |
| `frontend/src/pages/admin/AdminUserMain.jsx` | 수정 | axios → api 인스턴스 교체, X-API-Key 제거 |
| `frontend/src/pages/UserInfo/UserInfo.jsx` | 수정 | axios → api 인스턴스 교체, X-API-Key 제거 |
| `backend/app/api/deps.py` | 수정 | get_current_user 의존성 함수 추가 |
| `backend/app/api/v1/users.py` | 수정 | verify_api_key → get_current_user 교체 |
| `backend/app/api/v1/notices.py` | 수정 | 쓰기/삭제 엔드포인트에 get_current_user 적용 |
| `backend/app/api/v1/game_sessions.py` | 수정 | get_current_user 적용 |
| `backend/.env` | 수정 | JWT_EXPIRE_MINUTES=10080 |

## 완료 체크리스트

- [o] 로그인 후 브라우저 DevTools → Application → localStorage에 `access_token`이 저장된다
- [ ] 로그인 후 API 요청 헤더에 `Authorization: Bearer <token>`이 포함된다 (Network 탭 확인)
- [ ] 토큰 없이 보호 엔드포인트 호출 시 401 응답이 반환된다
- [ ] 잘못된 토큰으로 호출 시 401 응답이 반환된다
- [ ] 401 수신 시 자동으로 로그인 페이지로 이동된다
- [ ] 새로고침 후에도 로그인 상태가 유지된다
- [ ] 로그아웃 후 localStorage에서 `access_token`이 제거된다
- [ ] AdminUserMain, UserInfo 페이지에서 X-API-Key 하드코딩이 제거되었다
- [ ] docker compose exec fastapi pytest 통과
