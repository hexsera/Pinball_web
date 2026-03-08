# Dashboard 컴포넌트 분리 실행계획

## 요구사항 요약

**요구사항**: Dashboard.jsx에서 헤더와 사이드바를 분리하고, AdminPage.jsx처럼 헤더·사이드바·메인을 조합하는 구조를 FriendPage.jsx, UserInfo.jsx에도 적용한다.

**목적**: 현재 Dashboard.jsx는 헤더·사이드바·콘텐츠가 단일 파일에 혼재하여 유지보수가 어렵다. AdminPage처럼 각 역할별 컴포넌트로 분리하면 코드 책임이 명확해지고 재사용성이 높아진다.

## 현재상태 분석

- `Dashboard.jsx`: AppBar(헤더)와 Drawer(사이드바)가 한 파일에 인라인으로 정의됨
- `FriendPage.jsx`: 순수 콘텐츠만 있는 컴포넌트, Dashboard 내부 조건부 렌더링으로만 표시됨
- `UserInfo.jsx`: 순수 콘텐츠만 있는 컴포넌트, Dashboard 내부 조건부 렌더링으로만 표시됨
- `AdminPage.jsx`: `<AdminHeader />`, `<AdminSidebar />`, `<AdminMain />`을 Flexbox로 조합하는 정상 구조
- Dashboard의 `showUserInfo`, `showFriend` 상태로 FriendPage/UserInfo를 전환하는 방식 사용 중

## 구현 방법

- Dashboard의 헤더 JSX를 `DashboardHeader.jsx`로 분리
- Dashboard의 사이드바 JSX를 `DashboardSidebar.jsx`로 분리
- `FriendPage.jsx`가 `DashboardHeader` + `DashboardSidebar` + 친구 콘텐츠를 직접 조합 (AdminPage 패턴)
- `UserInfo.jsx`가 `DashboardHeader` + `DashboardSidebar` + 계정 콘텐츠를 직접 조합 (AdminPage 패턴)
- `Dashboard.jsx`는 역할 종료 후 라우터에서 각 페이지로 직접 진입하도록 변경

## 구현 단계

### 1. DashboardHeader.jsx 생성

```jsx
// frontend/src/pages/Dashboard/DashboardHeader.jsx
import { AppBar, Toolbar } from '@mui/material';
import HeaderUserInfo from '../../components/HeaderUserInfo';

const drawerWidth = 260;

export default function DashboardHeader() {
  return (
    <AppBar
      position="fixed"
      sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
    >
      <Toolbar sx={{ justifyContent: 'flex-end' }}>
        <HeaderUserInfo />
      </Toolbar>
    </AppBar>
  );
}
```
- **무엇을 하는가**: Dashboard.jsx 내부에 인라인으로 있던 AppBar(헤더) 코드를 독립 컴포넌트로 분리
- `drawerWidth`를 이 파일에서 직접 관리하거나 공통 상수 파일에서 import
- AdminHeader.jsx와 동일한 구조이므로 패턴 참고 가능

### 2. DashboardSidebar.jsx 생성

```jsx
// frontend/src/pages/Dashboard/DashboardSidebar.jsx
import { Drawer, List, ListItemButton, ListItemText, Box } from '@mui/material';

const drawerWidth = 260;

export default function DashboardSidebar({ currentMenu, onMenuChange }) {
  const menuItems = [
    { label: '게임하기', key: 'game' },
    { label: '친구', key: 'friend' },
    { label: '계정', key: 'account' },
  ];

  return (
    <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0 }}>
      <Box sx={{ width: drawerWidth }}>
        {/* 로고 영역 */}
        <List>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.key}
              selected={currentMenu === item.key}
              onClick={() => onMenuChange(item.key)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
```
- **무엇을 하는가**: Dashboard.jsx 내부의 Drawer(사이드바) 코드를 독립 컴포넌트로 분리
- `currentMenu`, `onMenuChange` props로 메뉴 선택 상태를 부모(Dashboard)에서 관리
- 실제 Dashboard.jsx의 Drawer 내용을 그대로 옮겨오면서 상태 관련 코드는 props로 교체

### 3. FriendPage.jsx에서 헤더·사이드바 직접 조합

```jsx
// frontend/src/pages/FriendPage/FriendPage.jsx
import { Box } from '@mui/material';
import DashboardHeader from '../Dashboard/DashboardHeader';
import DashboardSidebar from '../Dashboard/DashboardSidebar';

export default function FriendPage() {
  return (
    <Box sx={{ display: 'flex' }}>
      <DashboardHeader />
      <DashboardSidebar currentMenu="friend" />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {/* 기존 친구 콘텐츠 JSX */}
      </Box>
    </Box>
  );
}
```
- **무엇을 하는가**: AdminPage.jsx 패턴 그대로 FriendPage가 헤더·사이드바·콘텐츠를 직접 조합
- `currentMenu="friend"`를 고정값으로 전달해 사이드바에서 '친구' 메뉴가 선택 상태로 표시됨
- 기존 FriendPage의 친구 관련 JSX는 `<Box component="main">` 안에 그대로 유지

### 4. UserInfo.jsx에서 헤더·사이드바 직접 조합

```jsx
// frontend/src/pages/UserInfo/UserInfo.jsx
import { Box } from '@mui/material';
import DashboardHeader from '../Dashboard/DashboardHeader';
import DashboardSidebar from '../Dashboard/DashboardSidebar';

export default function UserInfo() {
  return (
    <Box sx={{ display: 'flex' }}>
      <DashboardHeader />
      <DashboardSidebar currentMenu="account" />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {/* 기존 계정 콘텐츠 JSX */}
      </Box>
    </Box>
  );
}
```
- **무엇을 하는가**: AdminPage.jsx 패턴 그대로 UserInfo가 헤더·사이드바·콘텐츠를 직접 조합
- `currentMenu="account"`를 고정값으로 전달해 사이드바에서 '계정' 메뉴가 선택 상태로 표시됨
- 기존 UserInfo의 회원정보 관련 JSX는 `<Box component="main">` 안에 그대로 유지

### 5. 라우터에서 FriendPage, UserInfo를 직접 라우팅

```jsx
// frontend/src/App.jsx (또는 라우터 설정 파일)
import { Routes, Route } from 'react-router-dom';
import FriendPage from './pages/FriendPage/FriendPage';
import UserInfo from './pages/UserInfo/UserInfo';

// 기존 Dashboard 경로 아래에 추가 또는 교체
<Routes>
  <Route path="/user/friend" element={<FriendPage />} />
  <Route path="/user/account" element={<UserInfo />} />
</Routes>
```
- **무엇을 하는가**: FriendPage, UserInfo가 독립 페이지가 됐으므로 라우터에 직접 경로를 등록
- Dashboard 내부 조건부 렌더링 방식(`showFriend`, `showUserInfo` 상태) 제거
- `DashboardSidebar`의 메뉴 클릭 시 `useNavigate`로 해당 경로로 이동하도록 변경

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/Dashboard/DashboardHeader.jsx` | 생성 | Dashboard의 AppBar(헤더) 코드를 분리한 새 컴포넌트 |
| `frontend/src/pages/Dashboard/DashboardSidebar.jsx` | 생성 | Dashboard의 Drawer(사이드바) 코드를 분리한 새 컴포넌트; 메뉴 클릭 시 `useNavigate`로 라우팅 |
| `frontend/src/pages/Dashboard/Dashboard.jsx` | 수정 | AppBar/Drawer 인라인 코드 및 `showFriend`/`showUserInfo` 상태 제거 |
| `frontend/src/pages/FriendPage/FriendPage.jsx` | 수정 | DashboardHeader + DashboardSidebar + 기존 친구 콘텐츠를 직접 조합하는 구조로 변경 |
| `frontend/src/pages/UserInfo/UserInfo.jsx` | 수정 | DashboardHeader + DashboardSidebar + 기존 계정 콘텐츠를 직접 조합하는 구조로 변경 |
| `frontend/src/App.jsx` (또는 라우터 파일) | 수정 | `/user/friend`, `/user/account` 경로에 FriendPage, UserInfo 직접 라우팅 추가 |

## 완료 체크리스트

- [ ] `/user/friend` 경로에서 FriendPage가 헤더·사이드바와 함께 렌더링된다
- [ ] `/user/account` 경로에서 UserInfo가 헤더·사이드바와 함께 렌더링된다
- [ ] 사이드바 메뉴 클릭 시 URL이 변경되며 해당 페이지로 이동한다
- [ ] 사이드바에서 현재 페이지에 해당하는 메뉴 항목이 선택 상태로 표시된다
- [ ] Dashboard.jsx에 AppBar, Drawer 인라인 코드 및 `showFriend`/`showUserInfo` 상태가 없다
- [ ] 브라우저 콘솔에 에러가 없다
