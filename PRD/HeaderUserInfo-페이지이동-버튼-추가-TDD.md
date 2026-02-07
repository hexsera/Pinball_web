# HeaderUserInfo Menu "페이지 이동" MenuItem 추가 (TDD)

## Context

HeaderUserInfo.jsx의 Avatar 클릭 시 열리는 Menu에는 현재 "프로필"과 "로그아웃" 두 개의 MenuItem만 존재한다.
PRD 요구사항에 따라 "페이지 이동" MenuItem을 추가해야 하며, TDD 방식으로 테스트 코드를 먼저 작성한 뒤 구현한다.
"페이지 이동" 클릭 시 동작은 현재 범위에 포함하지 않으며, MenuItem의 존재 여부만 확인한다.

---

## 수정/생성 대상 파일

| 파일 | 작업 |
|------|------|
| `frontend/src/test/HeaderUserInfo.test.jsx` | **생성** - TDD 테스트 코드 |
| `frontend/src/components/HeaderUserInfo.jsx` | **수정** - "페이지 이동" MenuItem 추가 |

---

## Step 1: 테스트 코드 작성 (RED)

### 파일 생성: `frontend/src/test/HeaderUserInfo.test.jsx`

기존 `FriendPage.test.jsx` 패턴을 따라 작성한다:
- `MemoryRouter` + `AuthProvider`로 컴포넌트 래핑
- `beforeEach`에서 `localStorage`에 로그인 상태 설정
- `fireEvent`로 Avatar 버튼 클릭 → Menu 열기
- `@testing-library/react`의 `screen` 쿼리로 요소 확인

### 테스트 케이스 구조

```
describe('HeaderUserInfo 컴포넌트')
  └── it('메뉴에 "페이지 이동" MenuItem이 존재한다')
```

### 테스트 코드 전체

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HeaderUserInfo from '../components/HeaderUserInfo';
import { AuthProvider } from '../AuthContext';

describe('HeaderUserInfo 컴포넌트', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));
  });

  afterEach(() => {
    localStorage.clear();
  });

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
```

### 테스트 실행 (실패 확인)

```bash
cd frontend
npm run test:run
```

예상 결과: `"페이지 이동" MenuItem이 존재한다` 테스트가 실패해야 함 (아직 구현 전)

---

## Step 2: 구현 (GREEN)

### 파일 수정: `frontend/src/components/HeaderUserInfo.jsx`

현재 Menu 구조 (line 49-57):
```jsx
<Menu
  anchorEl={anchorEl}
  onClose={handleAvatarMenuClose}
  id="user-menu"
  open={avatarMenu}
>
  <MenuItem>프로필</MenuItem>
  <MenuItem onClick={() => AvatarLogoutButton()}>로그아웃</MenuItem>
</Menu>
```

변경 후:
```jsx
<Menu
  anchorEl={anchorEl}
  onClose={handleAvatarMenuClose}
  id="user-menu"
  open={avatarMenu}
>
  <MenuItem>프로필</MenuItem>
  <MenuItem>페이지 이동</MenuItem>
  <MenuItem onClick={() => AvatarLogoutButton()}>로그아웃</MenuItem>
</Menu>
```

### 변경 내용 요약

- "프로필"과 "로그아웃" 사이에 `<MenuItem>페이지 이동</MenuItem>` 추가
- `onClick` 핸들러는 추가하지 않음 (향후 구현 예정)
- 순서: 프로필 → 페이지 이동 → 로그아웃

---

## Step 3: 테스트 실행 확인 (GREEN 검증)

```bash
cd frontend
npm run test:run
```

예상 결과: 테스트 통과 (1개 테스트 PASS)

---

## 테스트 패턴 설명

### 1. 컴포넌트 래핑 패턴

```javascript
<MemoryRouter>
  <AuthProvider>
    <HeaderUserInfo />
  </AuthProvider>
</MemoryRouter>
```

- `MemoryRouter`: react-router-dom의 `useNavigate` 사용을 위한 라우팅 컨텍스트
- `AuthProvider`: 인증 상태 (`isLoggedIn`, `user`) 제공을 위한 AuthContext 래핑

### 2. 로그인 상태 시뮬레이션

```javascript
beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));
});
```

- `AuthProvider`는 `useEffect`에서 `localStorage`를 읽어 로그인 상태 설정
- `beforeEach`에서 미리 `localStorage`에 유저 정보 저장

### 3. Avatar 버튼 클릭

```javascript
const avatarButton = screen.getByText('테스트유저').closest('button');
fireEvent.click(avatarButton);
```

- `screen.getByText('테스트유저')`: Typography 요소 선택
- `.closest('button')`: 부모 Button 요소 선택
- `fireEvent.click()`: 클릭 이벤트 시뮬레이션

### 4. Menu 열림 확인

```javascript
const menu = screen.getByRole('menu');
expect(menu).toBeInTheDocument();
```

- Material-UI Menu는 `role="menu"` 속성을 가짐
- `screen.getByRole('menu')`로 Menu 요소 선택 가능

### 5. MenuItem 존재 확인

```javascript
expect(screen.getByText('페이지 이동')).toBeInTheDocument();
```

- `screen.getByText()`: 텍스트 내용으로 요소 선택
- `toBeInTheDocument()`: DOM에 존재하는지 확인 (@testing-library/jest-dom matcher)

---

## 디렉터리 구조

```
frontend/src/
├── test/
│   ├── FriendPage.test.jsx          (기존 - 참고용)
│   ├── HeaderUserInfo.test.jsx      (생성 ← 이번 작업)
│   └── setup.js                     (기존 - @testing-library/jest-dom 설정)
├── components/
│   └── HeaderUserInfo.jsx           (수정 ← 이번 작업)
└── AuthContext.jsx                  (기존 - 참고용)
```

---

## 참고 사항

### 기존 테스트 환경

- 테스트 러너: Vitest v4.0.18
- 테스트 라이브러리: @testing-library/react v16.3.2
- DOM 환경: jsdom v28.0.0
- 설정 파일: `frontend/vitest.config.js`
- Setup 파일: `frontend/src/test/setup.js`

### 테스트 실행 명령어

```bash
# 테스트 한 번 실행
npm run test:run

# 테스트 Watch 모드
npm test

# 테스트 UI
npm run test:ui
```

### 향후 확장 가능성

현재는 "페이지 이동" MenuItem의 존재만 확인하지만, 향후 다음 기능을 추가할 수 있음:

1. **서브메뉴 구현**: "페이지 이동" 클릭 시 중첩 Menu 표시
2. **네비게이션 기능**: Dashboard 내부 페이지 이동 기능
3. **외부 라우팅**: `/admin` 등 다른 라우트로 이동

테스트는 이러한 확장을 대비하여 기본 구조를 검증함.

---

## 체크리스트

- [ ] `frontend/src/test/HeaderUserInfo.test.jsx` 파일 생성
- [ ] 1개 테스트 케이스 작성 완료
- [ ] `npm run test:run` 실행하여 테스트 실패 확인 (RED)
- [ ] `frontend/src/components/HeaderUserInfo.jsx`에 `<MenuItem>페이지 이동</MenuItem>` 추가
- [ ] `npm run test:run` 실행하여 테스트 통과 확인 (GREEN)

---

## 예상 결과

### RED (테스트 실패)
```
FAIL  src/test/HeaderUserInfo.test.jsx
  HeaderUserInfo 컴포넌트
    ✗ 메뉴에 "페이지 이동" MenuItem이 존재한다

Tests 1 failed (1)
```

### GREEN (테스트 통과)
```
PASS  src/test/HeaderUserInfo.test.jsx
  HeaderUserInfo 컴포넌트
    ✓ 메뉴에 "페이지 이동" MenuItem이 존재한다

Tests 1 passed (1)
```
