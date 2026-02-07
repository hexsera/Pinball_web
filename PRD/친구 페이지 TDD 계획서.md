# 친구 페이지 TDD 계획서

## 목표
`PRD/친구 페이지 생성.md`의 요구사항을 검증하는 TDD 테스트를 작성하고, 테스트를 통과하는 구현을 완성한다.

## 요구사항 요약
1. 친구 페이지 컴포넌트 파일 생성
2. 레이아웃: 왼쪽 60% / 오른쪽 40%
3. 각 영역에 MUI Paper 컴포넌트 사용
4. Dashboard.jsx에서 "친구" 클릭 시 메인영역에 친구 페이지 표시

---

## 1단계: 테스트 작성 (RED)

### 테스트 파일
`frontend/src/test/FriendPage.test.jsx`

### 테스트 케이스

#### TC-1. FriendPage 컴포넌트가 렌더링된다
```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FriendPage from '../FriendPage';

describe('FriendPage 컴포넌트', () => {
  it('FriendPage가 렌더링된다', () => {
    render(<FriendPage />);
    const container = screen.getByTestId('friend-page');
    expect(container).toBeInTheDocument();
  });
});
```

#### TC-2. 왼쪽 60% 영역과 오른쪽 40% 영역이 존재한다
```jsx
it('왼쪽 60% 영역과 오른쪽 40% 영역이 존재한다', () => {
  render(<FriendPage />);
  const leftArea = screen.getByTestId('friend-left-area');
  const rightArea = screen.getByTestId('friend-right-area');

  expect(leftArea).toBeInTheDocument();
  expect(rightArea).toBeInTheDocument();
});
```

#### TC-3. 왼쪽 영역이 60%, 오른쪽 영역이 40% 비율이다
```jsx
it('왼쪽 영역이 60%, 오른쪽 영역이 40% 비율이다', () => {
  render(<FriendPage />);
  const leftArea = screen.getByTestId('friend-left-area');
  const rightArea = screen.getByTestId('friend-right-area');

  // MUI Grid의 size prop 또는 flex/width 스타일로 비율 검증
  expect(leftArea).toHaveStyle({ width: '60%' });
  expect(rightArea).toHaveStyle({ width: '40%' });
});
```

#### TC-4. 각 영역에 Paper 컴포넌트가 사용된다
```jsx
it('왼쪽 영역에 Paper 컴포넌트가 존재한다', () => {
  render(<FriendPage />);
  const leftArea = screen.getByTestId('friend-left-area');
  const paper = leftArea.querySelector('.MuiPaper-root');
  expect(paper).toBeInTheDocument();
});

it('오른쪽 영역에 Paper 컴포넌트가 존재한다', () => {
  render(<FriendPage />);
  const rightArea = screen.getByTestId('friend-right-area');
  const paper = rightArea.querySelector('.MuiPaper-root');
  expect(paper).toBeInTheDocument();
});
```

#### TC-5. Dashboard에서 "친구" 클릭 시 FriendPage가 표시된다
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import Maindashboard from '../Dashboard';

describe('Dashboard 친구 페이지 통합', () => {
  const loggedInUser = {
    isLoggedIn: true,
    user: { id: 1, name: '테스트유저' },
    login: vi.fn(),
    logout: vi.fn(),
  };

  it('"친구" 메뉴 클릭 시 FriendPage가 표시된다', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={loggedInUser}>
          <Maindashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const friendMenu = screen.getByText('친구');
    fireEvent.click(friendMenu);

    const friendPage = screen.getByTestId('friend-page');
    expect(friendPage).toBeInTheDocument();
  });
});
```

---

## 2단계: 구현 (GREEN)

### 생성 파일: `frontend/src/FriendPage.jsx`

```jsx
import React from 'react';
import { Box, Paper } from '@mui/material';

function FriendPage() {
  return (
    <Box
      data-testid="friend-page"
      sx={{ display: 'flex', width: '100%', gap: 2 }}
    >
      <Box data-testid="friend-left-area" sx={{ width: '60%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
          {/* 왼쪽 영역 콘텐츠 */}
        </Paper>
      </Box>
      <Box data-testid="friend-right-area" sx={{ width: '40%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
          {/* 오른쪽 영역 콘텐츠 */}
        </Paper>
      </Box>
    </Box>
  );
}

export default FriendPage;
```

### 수정 파일: `frontend/src/Dashboard.jsx`

#### 수정 1: state 추가 (line 64 부근)
```jsx
const [showFriend, setShowFriend] = useState(false);
```

#### 수정 2: handleMenuClick 내 '친구' 분기 (line 158-164)
```jsx
if (itemtext == '친구')
{
  if (isLoggedIn == false)
  {
    navigate('/login')
  }
  else
  {
    setShowPinball(false);
    setShowUserInfo(false);
    setShowFriend(true);
  }
}
```

#### 수정 3: 다른 메뉴 클릭 시 showFriend 초기화
- '메인페이지': `setShowFriend(false)` 추가
- '게임하기': `setShowFriend(false)` 추가
- '계정': `setShowFriend(false)` 추가

#### 수정 4: 조건부 렌더링 확장 (line 560)
```jsx
{showPinball ? <Pinball /> : showUserInfo ? <UserInfo /> : showFriend ? <FriendPage /> : mainele}
```

#### 수정 5: import 추가
```jsx
import FriendPage from './FriendPage';
```

---

## 3단계: 리팩토링 (REFACTOR)

테스트 통과 확인 후 필요 시 코드 정리.

---

## TDD 실행 순서

| 순서 | 작업 | 명령어 |
|------|------|--------|
| 1 | 테스트 파일 생성 | `FriendPage.test.jsx` 작성 |
| 2 | 테스트 실행 (RED 확인) | `npm run test:run` |
| 3 | FriendPage.jsx 생성 | 컴포넌트 구현 |
| 4 | Dashboard.jsx 수정 | state, 핸들러, 렌더링 수정 |
| 5 | 테스트 실행 (GREEN 확인) | `npm run test:run` |
| 6 | 리팩토링 | 필요 시 코드 정리 |
| 7 | 테스트 재실행 (GREEN 유지 확인) | `npm run test:run` |

---

## 테스트 실행 명령어

```bash
# 전체 테스트 실행
cd frontend && npm run test:run

# FriendPage 테스트만 실행
cd frontend && npx vitest run src/test/FriendPage.test.jsx

# 감시 모드
cd frontend && npm test
```
