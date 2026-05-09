# JWT 5단계 — localStorage 의존 제거 실행계획

## 요구사항 요약

**요구사항**: Access Token을 localStorage에 저장하는 방식을 제거하고, 앱 시작 시 Refresh Token 쿠키로 Access Token을 메모리에 복원하는 방식으로 전환한다. 併行해서 토큰 없음 상태(Authorization 헤더 미포함)에서 백엔드가 403 대신 401을 반환하도록 수정한다.

**목적**: localStorage에 토큰을 저장하면 XSS 공격으로 탈취 가능하다. 메모리 저장으로 전환해 XSS 위협 표면을 최소화한다. 403/401 불일치 문제를 해결해 인터셉터의 자동 갱신 흐름이 토큰 없음 상태에서도 정상 동작하도록 한다.

## 현재상태 분석

- `authStore.js`: 초기화 시 `localStorage.getItem('access_token')`으로 토큰 로드. `setAccessToken`/`clearAccessToken`이 localStorage에 동시 기록.
- `AuthContext.jsx`: 앱 시작 시 `localStorage.getItem('user')`로 로그인 상태 복원. `/auth/refresh` 호출 없음.
- `deps.py`: `HTTPBearer()` 기본값 `auto_error=True` → Authorization 헤더 없으면 **403** 반환. 인터셉터는 401만 처리하므로 토큰 없는 상태에서 refresh 흐름이 동작하지 않음.
- `api.js`: 3단계 완료. 401 큐잉 처리 완비.

## 구현 방법

- 백엔드: `HTTPBearer(auto_error=False)`로 변경 → 헤더 없으면 `credentials=None` → `get_current_user`에서 401 raise.
- 프론트 authStore: localStorage 읽기/쓰기 제거, 초기값 `null`로 변경.
- 프론트 AuthContext: 앱 시작 시 `/auth/refresh` 호출로 Access Token 메모리 복원. user 정보는 `/users/me`로 가져온다. localStorage `user` 의존도 제거.

## 구현 단계

### 1. 백엔드 — HTTPBearer auto_error=False 설정

```python
# backend/app/api/deps.py
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
```

- `auto_error=False`로 설정하면 Authorization 헤더가 없을 때 FastAPI가 자동으로 403을 던지지 않고 `credentials=None`을 전달한다.
- `credentials is None` 체크를 추가해 명시적으로 401을 반환한다.
- 결과: 토큰 없음/만료/유효하지 않음 모두 401로 통일 → 인터셉터의 refresh 흐름이 모든 경우에 동작한다.

### 2. authStore — localStorage 의존 제거

```javascript
// frontend/src/store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
  clearAccessToken: () => set({ accessToken: null }),
}));
```

- 초기값을 `null`로 변경해 localStorage 읽기를 제거한다.
- `setAccessToken`/`clearAccessToken`에서 localStorage 쓰기/삭제를 제거한다.
- Access Token은 이제 메모리(JS 변수)에만 존재한다.

### 3. AuthContext — 앱 시작 시 refresh로 상태 복원

```javascript
// frontend/src/contexts/AuthContext.jsx
import axios from 'axios';

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.access_token);
        return axios.get('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
      })
      .then(({ data }) => {
        setUser(data);
        setIsLoggedIn(true);
      })
      .catch(() => {
        // Refresh 쿠키 없거나 만료 → 비로그인 상태 유지
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, accessToken) => {
    setUser(userData);
    setIsLoggedIn(true);
    useAuthStore.getState().setAccessToken(accessToken);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } finally {
      setUser(null);
      setIsLoggedIn(false);
      useAuthStore.getState().clearAccessToken();
    }
  };
  // ... Provider return 동일
}
```

- `localStorage.getItem('user')` 의존을 완전히 제거한다.
- 앱 마운트 시 `/auth/refresh`를 직접 호출해 Refresh 쿠키가 유효하면 Access Token을 메모리에 저장한다.
- 이어서 `/users/me`로 사용자 정보를 가져와 Context에 저장한다.
- refresh 실패(쿠키 없음/만료) 시 에러를 무시하고 비로그인 상태로 `loading=false`만 설정한다.
- `login`에서 `localStorage.setItem('user', ...)` 제거.
- `logout`에서 `localStorage.removeItem('user')` 제거.

### 4. 프론트엔드 빌드 및 배포

```bash
source ~/.nvm/nvm.sh && cd frontend && npm run build
docker cp frontend/dist/. nginx-server:/etc/nginx/html/
```

- 빌드 후 nginx 컨테이너에 반영한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/deps.py` | 수정 | `HTTPBearer(auto_error=False)`, `credentials is None` 체크 추가 |
| `frontend/src/store/authStore.js` | 수정 | localStorage 읽기/쓰기 제거, 초기값 `null` |
| `frontend/src/contexts/AuthContext.jsx` | 수정 | 앱 시작 시 `/auth/refresh` + `/users/me` 호출로 상태 복원, localStorage 의존 제거 |

## 완료 체크리스트

- [ ] 로그인 후 새로고침해도 로그인 상태가 유지된다.
- [ ] 로그인 후 브라우저 개발자도구 → Application → Local Storage에서 `access_token`, `user` 키가 존재하지 않는다.
- [ ] Access Token 없이 보호된 API를 호출하면 서버가 401을 반환한다 (Network 탭에서 403이 없어야 함).
- [ ] Access Token 만료 후 API 호출 시 자동으로 갱신되고 원 요청이 성공한다.
- [ ] Refresh Token 쿠키가 없는 상태(시크릿 탭 등)에서 보호된 페이지 접근 시 로그인 화면으로 이동한다.
- [ ] 로그아웃 후 새로고침해도 로그인 상태가 복원되지 않는다.
- [ ] 백엔드 컨테이너 재시작 후 `docker compose exec fastapi pytest` 통과.
