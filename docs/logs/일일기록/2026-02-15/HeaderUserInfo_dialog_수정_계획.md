# 계획: HeaderUserInfo dialog 수정 (TDD)

## Context

PRD 요구사항에 따라 `HeaderUserInfo.jsx`의 아바타 메뉴 dialog를 다음과 같이 수정한다:

1. dialog 열 때 상단에 사용자 이메일 표시
2. dialog 오른쪽 상단에 닫기 버튼 추가
3. "프로필" → "계정설정"으로 변경 + 클릭 시 `/dashboard`에 "계정" 섹션으로 이동
4. "친구" MenuItem 추가 + 클릭 시 `/dashboard`에 "친구" 섹션으로 이동

Dashboard는 현재 내부 state(`showUserInfo`, `showFriend`)로 섹션을 전환한다.
`navigate('/dashboard', { state: { section: '계정' } })`으로 이동 후,
Dashboard에서 `useLocation().state`를 읽어 해당 섹션을 활성화하도록 함께 수정한다.

## 수정 대상 파일

- `frontend/src/components/HeaderUserInfo.jsx` — 메인 수정 대상
- `frontend/src/pages/Dashboard/Dashboard.jsx` — location.state 읽어 섹션 초기화
- `frontend/src/test/HeaderUserInfo.test.jsx` — 테스트 추가/수정

## TDD 사이클 계획

### 기능 1: dialog 열 때 이메일 표시

**RED**: 테스트 작성
```jsx
it('아바타 메뉴를 열면 사용자 이메일이 표시된다', () => {
  localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저', email: 'test@example.com' }));
  render(<MemoryRouter><AuthProvider><HeaderUserInfo /></AuthProvider></MemoryRouter>);
  const avatarButton = screen.getByText('테스트유저').closest('button');
  fireEvent.click(avatarButton);
  expect(screen.getByText('test@example.com')).toBeInTheDocument();
});
```
**GREEN**: Menu 상단에 `<MenuItem disabled>` 또는 `<Box>`로 `user.email` 렌더링

---

### 기능 2: dialog 오른쪽 상단 닫기 버튼

**RED**: 테스트 작성
```jsx
it('아바타 메뉴에 닫기 버튼이 있고 클릭 시 메뉴가 닫힌다', () => {
  // 메뉴 열기
  fireEvent.click(avatarButton);
  expect(screen.getByRole('button', { name: /닫기/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /닫기/ }));
  expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
});
```
**GREEN**: Menu 헤더 영역에 닫기(X) IconButton 추가

---

### 기능 3: "프로필" → "계정설정" + /dashboard 계정 이동

**RED**: 테스트 작성
```jsx
it('메뉴에 "계정설정" MenuItem이 존재하고, 클릭 시 /dashboard로 이동한다', () => {
  fireEvent.click(avatarButton);
  expect(screen.getByText('계정설정')).toBeInTheDocument();
  fireEvent.click(screen.getByText('계정설정'));
  expect(testLocation.pathname).toBe('/dashboard');
  expect(testLocation.state?.section).toBe('계정');
});
```
**GREEN**: "프로필" → "계정설정", `navigate('/dashboard', { state: { section: '계정' } })` 연결

---

### 기능 4: "친구" MenuItem 추가 + /dashboard 친구 이동

**RED**: 테스트 작성
```jsx
it('메뉴에 "친구" MenuItem이 존재하고, 클릭 시 /dashboard로 이동한다', () => {
  fireEvent.click(avatarButton);
  expect(screen.getByText('친구')).toBeInTheDocument();
  fireEvent.click(screen.getByText('친구'));
  expect(testLocation.pathname).toBe('/dashboard');
  expect(testLocation.state?.section).toBe('친구');
});
```
**GREEN**: "친구" MenuItem 추가, `navigate('/dashboard', { state: { section: '친구' } })` 연결

---

### Dashboard 연동: location.state로 섹션 초기화

Dashboard.jsx에서 `useLocation()`으로 `state.section`을 읽어:
- `'계정'`이면 `showUserInfo=true`
- `'친구'`이면 `showFriend=true`

`useEffect`로 초기화:
```js
const location = useLocation();
useEffect(() => {
  if (location.state?.section === '계정') {
    setShowUserInfo(true);
    setShowFriend(false);
  } else if (location.state?.section === '친구') {
    setShowFriend(true);
    setShowUserInfo(false);
  }
}, [location.state]);
```

## 검증 방법

1. 각 RED 단계: `source ~/.nvm/nvm.sh && cd frontend && npx vitest run src/test/HeaderUserInfo.test.jsx` → 실패 확인
2. 각 GREEN 단계: 동일 명령 → 통과 확인
3. 전체 테스트: `source ~/.nvm/nvm.sh && cd frontend && npx vitest run` → 기존 테스트 회귀 없음 확인
4. 수동 확인: 개발 서버에서 아바타 메뉴 열어 이메일·닫기 버튼·"계정설정"·"친구" 동작 확인
