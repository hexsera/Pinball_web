# HeaderUserInfo "페이지 이동" 토글 기능 구현 (TDD)

## Context

HeaderUserInfo.jsx의 Menu에 "페이지 이동" MenuItem이 추가되었으나, 클릭 시 동작이 구현되지 않은 상태이다.
이 기능은 현재 페이지 위치에 따라 토글 방식으로 동작해야 한다:
- 현재 위치가 `/admin` 또는 `/admin/*` (하위 페이지) → `/` (메인페이지)로 이동
- 그 외의 경우 → `/admin` 페이지로 이동

TDD 방식으로 테스트 코드를 먼저 작성한 뒤 구현한다.

---

## 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `frontend/src/test/HeaderUserInfo.test.jsx` | **수정** - "페이지 이동" 클릭 동작 테스트 추가 |
| `frontend/src/components/HeaderUserInfo.jsx` | **수정** - "페이지 이동" 클릭 핸들러 구현 |

---

## Step 1: 테스트 코드 작성 (RED)

### 파일 수정: `frontend/src/test/HeaderUserInfo.test.jsx`

기존 테스트에 새로운 테스트 케이스 추가:
- `/` 페이지에서 "페이지 이동" 클릭 → `/admin`으로 이동
- `/admin` 페이지에서 "페이지 이동" 클릭 → `/`로 이동
- `/admin/users` 페이지에서 "페이지 이동" 클릭 → `/`로 이동

### 테스트 케이스 구조

```
describe('HeaderUserInfo 컴포넌트')
  ├── describe('메뉴 렌더링')
  │   └── it('메뉴에 "페이지 이동" MenuItem이 존재한다')  ← 기존 테스트
  │
  └── describe('페이지 이동 기능')
      ├── it('메인 페이지(/)에서 "페이지 이동" 클릭 시 /admin으로 이동한다')
      └── it('/admin으로 시작하는 페이지에서 "페이지 이동" 클릭 시 /로 이동한다')
```

### 테스트 코드 전체

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import HeaderUserInfo from '../components/HeaderUserInfo';
import { AuthProvider } from '../AuthContext';

describe('HeaderUserInfo 컴포넌트', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('메뉴 렌더링', () => {
    it('메뉴에 "페이지 이동" MenuItem이 존재한다', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('페이지 이동')).toBeInTheDocument();
    });
  });

  describe('페이지 이동 기능', () => {
    it('메인 페이지(/)에서 "페이지 이동" 클릭 시 /admin으로 이동한다', () => {
      let testLocation;

      const LocationTracker = () => {
        testLocation = useLocation();
        return null;
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <HeaderUserInfo />
            <LocationTracker />
          </AuthProvider>
        </MemoryRouter>
      );

      // 초기 위치 확인
      expect(testLocation.pathname).toBe('/');

      // 메뉴 열기
      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      // "페이지 이동" 클릭
      const pageNavButton = screen.getByText('페이지 이동');
      fireEvent.click(pageNavButton);

      // /admin으로 이동했는지 확인
      expect(testLocation.pathname).toBe('/admin');
    });

    it('/admin으로 시작하는 페이지에서 "페이지 이동" 클릭 시 /로 이동한다', () => {
      let testLocation;

      const LocationTracker = () => {
        testLocation = useLocation();
        return null;
      };

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AuthProvider>
            <HeaderUserInfo />
            <LocationTracker />
          </AuthProvider>
        </MemoryRouter>
      );

      // 초기 위치 확인
      expect(testLocation.pathname).toBe('/admin');

      // 메뉴 열기
      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      // "페이지 이동" 클릭
      const pageNavButton = screen.getByText('페이지 이동');
      fireEvent.click(pageNavButton);

      // /로 이동했는지 확인
      expect(testLocation.pathname).toBe('/');
    });
  });
});
```

### 테스트 실행 (실패 확인)

```bash
cd frontend
npm run test:run
```

예상 결과: 2개의 새로운 테스트가 실패해야 함 (아직 핸들러 미구현)

---

## Step 2: 구현 (GREEN)

### 파일 수정: `frontend/src/components/HeaderUserInfo.jsx`

현재 상태:
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function HeaderUserInfo() {
  const navigate = useNavigate();
  // ...

  <MenuItem>페이지 이동</MenuItem>  // ← onClick 핸들러 없음
}
```

변경 후:
```jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function HeaderUserInfo() {
  const navigate = useNavigate();
  const location = useLocation();  // ← 추가
  // ...

  function handlePageNavigation() {
    // 현재 경로가 /admin 또는 /admin/*인지 확인
    if (location.pathname.startsWith('/admin')) {
      navigate('/');
    } else {
      navigate('/admin');
    }

    // 메뉴 닫기
    handleAvatarMenuClose();
  }

  // ...

  <MenuItem onClick={handlePageNavigation}>페이지 이동</MenuItem>  // ← onClick 추가
}
```

### 구현 세부사항

1. **useLocation 훅 추가**: 현재 경로 확인을 위해 `react-router-dom`의 `useLocation` import
2. **handlePageNavigation 함수 생성**:
   - `location.pathname.startsWith('/admin')`: 현재 경로가 `/admin`으로 시작하는지 확인
     - `/admin` → true
     - `/admin/users` → true
     - `/admin/statistics` → true
     - `/` → false
     - `/login` → false
   - true이면 `/`로 이동, false이면 `/admin`으로 이동
   - 이동 후 `handleAvatarMenuClose()` 호출하여 메뉴 닫기
3. **MenuItem에 onClick 연결**: `<MenuItem onClick={handlePageNavigation}>`

---

## Step 3: 테스트 실행 확인 (GREEN 검증)

```bash
cd frontend
npm run test:run
```

예상 결과: 모든 테스트 통과 (3개 테스트 PASS - 기존 1개 + 신규 2개)

---

## 테스트 패턴 설명

### 1. MemoryRouter의 initialEntries

```javascript
<MemoryRouter initialEntries={['/admin']}>
```

- `initialEntries`: 테스트 시작 시 라우터의 초기 경로 설정
- 배열 형태로 여러 경로 히스토리를 설정할 수 있음
- 테스트에서 특정 경로에 있는 상황을 시뮬레이션할 때 사용

### 2. LocationTracker 컴포넌트 패턴

```javascript
let testLocation;

const LocationTracker = () => {
  testLocation = useLocation();
  return null;
};

render(
  <MemoryRouter>
    <HeaderUserInfo />
    <LocationTracker />
  </MemoryRouter>
);
```

- `useLocation()` 훅은 컴포넌트 내부에서만 사용 가능
- 테스트 코드에서 현재 경로를 추적하기 위해 더미 컴포넌트 생성
- `testLocation` 변수에 location 객체를 저장하여 테스트에서 접근 가능

### 3. pathname 검증

```javascript
expect(testLocation.pathname).toBe('/admin');
```

- `location.pathname`: 현재 경로의 path 부분만 추출
- 예: `http://localhost:3000/admin/users` → `/admin/users`

---

## 동작 흐름

### Case 1: 메인 페이지(/)에서 클릭

```
현재 위치: /
  ↓
location.pathname.startsWith('/admin') → false
  ↓
navigate('/admin')
  ↓
새 위치: /admin
```

### Case 2: Admin 페이지(/admin)에서 클릭

```
현재 위치: /admin
  ↓
location.pathname.startsWith('/admin') → true
  ↓
navigate('/')
  ↓
새 위치: /
```

### Case 3: Admin 하위 페이지(/admin/users 등)에서 클릭

```
현재 위치: /admin/users (또는 /admin/statistics 등)
  ↓
location.pathname.startsWith('/admin') → true
  ↓
navigate('/')
  ↓
새 위치: /
```

**참고**: `/admin/users`, `/admin/statistics` 등 모든 `/admin/*` 경로는 `startsWith('/admin')`으로 감지되므로 별도 테스트 불필요

---

## 체크리스트

- [ ] `frontend/src/test/HeaderUserInfo.test.jsx`에 2개 테스트 케이스 추가
- [ ] `npm run test:run` 실행하여 테스트 실패 확인 (RED)
- [ ] `frontend/src/components/HeaderUserInfo.jsx`에 `useLocation` import
- [ ] `handlePageNavigation` 함수 구현
- [ ] MenuItem에 `onClick={handlePageNavigation}` 추가
- [ ] `npm run test:run` 실행하여 모든 테스트 통과 확인 (GREEN)

---

## 예상 결과

### RED (테스트 실패)
```
FAIL  src/test/HeaderUserInfo.test.jsx
  HeaderUserInfo 컴포넌트
    메뉴 렌더링
      ✓ 메뉴에 "페이지 이동" MenuItem이 존재한다
    페이지 이동 기능
      ✗ 메인 페이지(/)에서 "페이지 이동" 클릭 시 /admin으로 이동한다
      ✗ /admin으로 시작하는 페이지에서 "페이지 이동" 클릭 시 /로 이동한다

Tests 1 passed, 2 failed (3)
```

### GREEN (테스트 통과)
```
PASS  src/test/HeaderUserInfo.test.jsx
  HeaderUserInfo 컴포넌트
    메뉴 렌더링
      ✓ 메뉴에 "페이지 이동" MenuItem이 존재한다
    페이지 이동 기능
      ✓ 메인 페이지(/)에서 "페이지 이동" 클릭 시 /admin으로 이동한다
      ✓ /admin으로 시작하는 페이지에서 "페이지 이동" 클릭 시 /로 이동한다

Tests 3 passed (3)
```

---

## 구현 코드 요약

### HeaderUserInfo.jsx 최종 코드 (핵심 부분)

```javascript
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// ... 기타 imports

function HeaderUserInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState(null);
  const [avatarMenu, setAvatarMenu] = useState(false);

  function AvatarButtonClick(event) {
    setAnchorEl(event.currentTarget);
    setAvatarMenu(!avatarMenu);
  }

  function handleAvatarMenuClose() {
    setAnchorEl(null);
    setAvatarMenu(false);
  }

  function AvatarLogoutButton() {
    logout();
  }

  function handlePageNavigation() {
    if (location.pathname.startsWith('/admin')) {
      navigate('/');
    } else {
      navigate('/admin');
    }
    handleAvatarMenuClose();
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isLoggedIn ? (
        <>
          {/* ... 알림, 메일 아이콘 */}
          <Button id="basic-button" onClick={AvatarButtonClick}>
            <Avatar sx={{ width: 40, height: 40, ml: 1 }}>U</Avatar>
            <Typography>{user.name}</Typography>
          </Button>
          <Menu
            anchorEl={anchorEl}
            onClose={handleAvatarMenuClose}
            id="user-menu"
            open={avatarMenu}
          >
            <MenuItem>프로필</MenuItem>
            <MenuItem onClick={handlePageNavigation}>페이지 이동</MenuItem>
            <MenuItem onClick={() => AvatarLogoutButton()}>로그아웃</MenuItem>
          </Menu>
        </>
      ) : (
        <>
          {/* 로그인/회원가입 버튼 */}
        </>
      )}
    </Box>
  );
}

export default HeaderUserInfo;
```

---

## 추가 고려사항

### 1. 메뉴 닫기 타이밍
- `handlePageNavigation` 함수에서 `navigate()` 호출 후 `handleAvatarMenuClose()` 호출
- 이렇게 하면 페이지 이동과 동시에 메뉴가 닫힘
- 사용자 경험 향상

### 2. startsWith 메서드의 장점
- `'/admin/users'.startsWith('/admin')` → `true`
- `'/admin/statistics'.startsWith('/admin')` → `true`
- `'/admin'.startsWith('/admin')` → `true`
- `'/'.startsWith('/admin')` → `false`
- **향후 `/admin/*` 경로가 추가되어도 테스트 수정 불필요**
- 확장성이 좋은 패턴

### 3. 향후 확장 가능성
- 현재는 `/admin` ↔ `/` 토글만 지원
- 향후 다른 페이지 추가 시 조건 분기 확장 가능
- 예: `/profile`, `/settings` 등
