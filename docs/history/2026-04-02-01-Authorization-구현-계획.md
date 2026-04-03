# Authorization 구현 계획

## Context

현재 Pinball_web 백엔드는 모든 API 엔드포인트가 인증/인가 없이 완전히 열려 있다.
프론트엔드는 일부 API 호출 시 `X-API-Key: hexsera-secret-api-key-2026`을 소스코드에 하드코딩해 사용하고 있어, 누구나 브라우저 DevTools에서 키를 확인하고 API를 직접 호출할 수 있다.

목표: JWT Bearer Token 기반으로 전환해 로그인한 사용자만 자신의 데이터를 수정하고, 관리자만 관리 기능을 사용할 수 있도록 강제한다.

---

## 구현 범위

- **백엔드**: JWT 검증 의존성 추가 + 각 엔드포인트에 인가 적용
- **프론트엔드**: axios 인터셉터 + X-API-Key 제거 + Protected Route 컴포넌트
- **monthly_scores POST** 인가는 추후 처리 (이번 범위 제외)

---

## 엔드포인트별 인가 매핑

| 엔드포인트 | 변경 후 |
|---|---|
| POST /login, /register, /auth/google | 공개 |
| GET /api/, /api/test | 공개 |
| GET /monthly-scores, /monthly-scores/{id} | 공개 (리더보드) |
| POST /monthly-scores | 인증 필요 (이번 제외, 추후) |
| PUT /monthly-scores/{user_id} | 인증 + 본인 or Admin |
| DELETE /monthly-scores/{user_id} | Admin 전용 |
| GET /users | 인증 필요 |
| GET /users/{user_id} | 인증 필요 |
| POST /users | Admin 전용 |
| PUT /users/{user_id} | 인증 + 본인 or Admin |
| DELETE /users/{user_id} | 인증 + 본인 or Admin |
| GET /game_visits | Admin 전용 |
| POST /game_visits | 공개 |
| PUT /game_visits | 공개 |
| DELETE /game_visits | Admin 전용 |
| POST/GET /friend-requests | 인증 필요 |
| POST /friend-requests/accept, /reject | 인증 필요 |
| GET/PUT/DELETE /game-sessions/{user_id} | 인증 + 본인 |

---

## 구현 단계

### 1단계: 백엔드 - deps.py에 의존성 추가

**파일**: `backend/app/api/deps.py`

기존 `get_db()` 아래에 추가:

```python
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
import sys
sys.path.insert(0, '/code')
from models import User

http_bearer = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token validation failed")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

- `jose`는 `security.py`에서 이미 import해 사용 중 → 동일 패키지 사용
- `HTTPBearer()`는 `Authorization: Bearer <token>` 헤더 자동 파싱

### 2단계: 백엔드 - users.py 인가 적용

**파일**: `backend/app/api/v1/users.py`

```python
from app.api.deps import get_db, get_current_user, require_admin

# GET /users → Depends(get_current_user) 추가
# POST /users → Depends(require_admin) 추가
# GET /users/{user_id} → Depends(get_current_user) 추가
# PUT /users/{user_id} → Depends(get_current_user) + 본인 검증
#   if current_user.role != "admin" and current_user.id != user_id: 403
# DELETE /users/{user_id} → Depends(get_current_user) + 본인 검증
#   if current_user.role != "admin" and current_user.id != user_id: 403
```

### 3단계: 백엔드 - 나머지 라우터 인가 적용

**`monthly_scores.py`**: PUT → 인증+본인, DELETE → Admin
**`game_visits.py`**: GET → Admin, DELETE → Admin
**`friends.py`**: 모든 엔드포인트 → 인증 필요
**`game_sessions.py`**: 모든 엔드포인트 → 인증+본인 (`current_user.id != user_id` → 403)

### 4단계: 프론트엔드 - apiClient.js 생성

**파일**: `frontend/src/services/apiClient.js` (신규)

```javascript
import axios from 'axios';

const apiClient = axios.create();

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 5단계: 프론트엔드 - X-API-Key 제거 및 apiClient 교체

**`UserInfo.jsx`** (`frontend/src/pages/UserInfo/UserInfo.jsx`):
- `import axios from 'axios'` → `import apiClient from '../../services/apiClient'`
- GET/PUT/DELETE 호출에서 `{ headers: { 'X-API-Key': '...' } }` 제거
- `axios.` → `apiClient.` 교체

**`AdminUserMain.jsx`** (`frontend/src/pages/admin/AdminUserMain.jsx`):
- 동일하게 X-API-Key 헤더 제거, apiClient로 교체

**`FriendPage.jsx`** (`frontend/src/pages/FriendPage/FriendPage.jsx`):
- 모든 axios 호출 → apiClient로 교체

**`AdminStatisticsMain.jsx`** (`frontend/src/pages/admin/AdminStatisticsMain.jsx`):
- axios → apiClient 교체

### 6단계: 프론트엔드 - ProtectedRoute 컴포넌트 생성

**파일**: `frontend/src/components/ProtectedRoute.jsx` (신규)

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { isLoggedIn, user, loading } = useAuth();
  if (loading) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
```

### 7단계: 프론트엔드 - App.jsx Protected Route 적용

**파일**: `frontend/src/App.jsx`

```jsx
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

// 변경:
<Route path="/admin" element={<AdminRoute><AdminUserPage/></AdminRoute>} />
<Route path="/admin/users" element={<AdminRoute><AdminUserPage/></AdminRoute>} />
<Route path="/admin/statistics" element={<AdminRoute><AdminStatisticsPage/></AdminRoute>} />
<Route path="/user/friend" element={<ProtectedRoute><FriendPage /></ProtectedRoute>} />
<Route path="/user/account" element={<ProtectedRoute><UserInfo /></ProtectedRoute>} />
<Route path="/notice/write" element={<AdminRoute><NoticeWritePage /></AdminRoute>} />
```

---

## 수정/생성 파일 목록

| 파일 | 작업 |
|---|---|
| `backend/app/api/deps.py` | 수정 - get_current_user, require_admin 추가 |
| `backend/app/api/v1/users.py` | 수정 - 인가 의존성 추가 |
| `backend/app/api/v1/monthly_scores.py` | 수정 - PUT/DELETE 인가 |
| `backend/app/api/v1/game_visits.py` | 수정 - GET/DELETE admin |
| `backend/app/api/friends.py` | 수정 - 전체 인증 필요 |
| `backend/app/api/v1/game_sessions.py` | 수정 - 인증+본인 |
| `frontend/src/services/apiClient.js` | 생성 - JWT 인터셉터 axios |
| `frontend/src/components/ProtectedRoute.jsx` | 생성 - ProtectedRoute, AdminRoute |
| `frontend/src/pages/UserInfo/UserInfo.jsx` | 수정 - apiClient 교체 |
| `frontend/src/pages/admin/AdminUserMain.jsx` | 수정 - apiClient 교체 |
| `frontend/src/pages/FriendPage/FriendPage.jsx` | 수정 - apiClient 교체 |
| `frontend/src/pages/admin/AdminStatisticsMain.jsx` | 수정 - apiClient 교체 |
| `frontend/src/App.jsx` | 수정 - Protected Route 래핑 |

---

## 검증 방법

```bash
# 1. 백엔드 컨테이너 재시작
docker compose up -d fastapi

# 2. 토큰 없이 인증 필요 API 호출 → 401 확인
curl -s http://localhost:8000/api/v1/users | jq '.detail'
# "Not authenticated"

# 3. 로그인 후 토큰으로 호출 → 200 확인
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}' | jq -r '.access_token')
curl -s http://localhost:8000/api/v1/users -H "Authorization: Bearer $TOKEN"

# 4. 일반 유저 토큰으로 admin 전용 API 호출 → 403 확인
curl -s http://localhost:8000/api/v1/game_visits -H "Authorization: Bearer $TOKEN" | jq '.detail'
# "Admin access required"

# 5. 프론트엔드 빌드
source ~/.nvm/nvm.sh && cd frontend && npm run build

# 6. X-API-Key 완전 제거 확인
grep -r "X-API-Key" frontend/src   # 결과 없어야 함

# 7. 브라우저에서 /admin URL 직접 접근 → /login 리다이렉트 확인
# 8. /user/account 비로그인 접근 → /login 리다이렉트 확인
```
