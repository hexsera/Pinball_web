# 사이드바 버튼 선택 상태 URL 동기화 실행계획

## 요구사항 요약

**요구사항**: 관리자 사이드바의 버튼 선택 상태가 현재 URL 경로와 동기화되도록 수정

**목적**: 현재 selectedIndex가 고정값(1)으로 설정되어 있어, 어떤 페이지에 있든 항상 "회원관리" 버튼만 하이라이트되는 문제 해결. 사용자가 현재 어느 페이지에 있는지 시각적으로 명확하게 표시.

## 현재상태 분석

- AdminSidebar.jsx의 selectedIndex가 useState(1)로 고정 초기화
- 버튼 클릭 시에만 setSelectedIndex가 호출되어 상태 업데이트
- 페이지 직접 접속(URL 입력) 또는 새로고침 시 selectedIndex가 현재 URL과 무관하게 1로 고정
- /admin 페이지에서도 "회원관리" 버튼이 하이라이트됨 (잘못된 동작)
- React Router의 useLocation 훅을 사용하지 않음

## 구현 방법

React Router의 `useLocation` 훅으로 현재 URL 경로를 가져와서, `useEffect`로 경로 변경을 감지하여 selectedIndex를 자동으로 업데이트. 현재 pathname과 menuItems의 path를 비교하여 일치하는 인덱스를 찾아 설정.

## 구현 단계

### 1. useLocation import 추가

```javascript
import { useNavigate, useLocation } from 'react-router-dom';
```

- React Router의 `useLocation` 훅 import
- 현재 URL 정보를 가져오기 위해 필요

### 2. useLocation 훅 선언 및 useEffect로 URL 동기화

```javascript
function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuItems = [
    { text: '대시보드', icon: <DashboardIcon />, path: '/admin' },
    { text: '회원관리', icon: <People />, path: '/admin/users' },
  ];

  useEffect(() => {
    const currentIndex = menuItems.findIndex(item => item.path === location.pathname);
    if (currentIndex !== -1) {
      setSelectedIndex(currentIndex);
    }
  }, [location.pathname]);

  // ... return 문
}
```

- `useLocation()` 훅으로 현재 location 객체 가져오기
- `location.pathname`으로 현재 URL 경로 추출 (예: '/admin', '/admin/users')
- `useEffect`의 의존성 배열에 `location.pathname` 추가하여 URL 변경 감지
- `findIndex`로 menuItems에서 현재 경로와 일치하는 항목의 인덱스 찾기
- 일치하는 항목이 있으면(-1이 아니면) setSelectedIndex 호출
- selectedIndex 초기값을 0으로 변경 (기본값: 대시보드)

### 3. useEffect import 추가

```javascript
import { useState, useEffect } from 'react';
```

- React의 `useEffect` 훅 import 추가
- URL 변경 시 부수 효과(side effect)를 처리하기 위해 필요

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| react/main/src/admin/AdminSidebar.jsx | 수정 | useLocation/useEffect 추가, URL 기반 selectedIndex 자동 업데이트 로직 구현 |

## 완료 체크리스트

- [ ] /admin 페이지 접속 시 "대시보드" 버튼이 파란색으로 하이라이트되는가
- [ ] /admin/users 페이지 접속 시 "회원관리" 버튼이 파란색으로 하이라이트되는가
- [ ] "대시보드" 버튼 클릭 → /admin 이동 시 "대시보드" 버튼이 하이라이트되는가
- [ ] "회원관리" 버튼 클릭 → /admin/users 이동 시 "회원관리" 버튼이 하이라이트되는가
- [ ] 페이지 새로고침(F5) 후에도 현재 페이지에 해당하는 버튼이 하이라이트되는가
- [ ] URL 직접 입력으로 접속 시에도 올바른 버튼이 하이라이트되는가
- [ ] 브라우저 뒤로가기/앞으로가기 시 버튼 선택 상태가 올바르게 변경되는가
- [ ] 브라우저 콘솔에 에러가 없는가
