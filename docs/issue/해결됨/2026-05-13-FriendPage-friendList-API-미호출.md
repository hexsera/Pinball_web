# FriendPage 친구 목록 API 미호출

- 발견일: 2026-05-13
- 관련 파일: `frontend/src/pages/FriendPage/FriendPage.jsx`
- 관련 이슈: `2026-05-07-FriendPage-localStorage-직접-참조.md`

## 증상

친구 페이지에서 친구 목록이 표시되지 않는다. Network 탭에서 친구 목록 조회 API(`GET /api/friend-requests?friend_status=accepted`)가 전송되지 않는다.

## 원인 분석

`fetchFriendList` 및 `fetchPendingRequests` 함수는 `useEffect`에서 마운트 시 호출된다. 두 함수 모두 첫 줄에서 `getCurrentUser()`로 유저 정보를 읽는다.

```js
// FriendPage.jsx:21
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');  // ← 항상 null 반환
  if (!userStr) return null;
  ...
};
```

```js
// fetchFriendList / fetchPendingRequests 공통 패턴
const user = getCurrentUser();
if (!user || !user.id) return;  // ← null이므로 여기서 조기 반환
```

JWT 인증 5단계 작업에서 `login()` 시 `localStorage.setItem('user', ...)` 호출이 제거되었다. 따라서 `localStorage.getItem('user')`는 항상 `null`을 반환하고, 두 fetch 함수 모두 API 요청 없이 즉시 반환된다.

실제 유저 정보는 `AuthContext`의 `useAuth()` 훅 → `user` 필드에 메모리에서 관리된다.

## 재현 조건

- 로그인 후 친구 페이지 진입 (항상 재현됨)

## 해결 방향

`getCurrentUser()` 헬퍼를 제거하고 `useAuth()`의 `user`를 사용하도록 변경한다.

```jsx
// 변경 전
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  ...
};

// 변경 후 (컴포넌트 내부)
const { user: currentUser } = useAuth();

// fetchPendingRequests / fetchFriendList 내부
const user = currentUser;       // useAuth에서 가져온 값 사용
if (!user || !user.id) return;
```

단, `useAuth().user`는 비동기로 초기화되므로(`AuthContext`가 `/auth/refresh` 완료 후 세팅), `useEffect` 의존성 배열에 `currentUser` 를 추가해야 한다.

```jsx
useEffect(() => {
  if (!currentUser) return;
  fetchPendingRequests();
  fetchFriendList();
}, [currentUser]);
```

`fetchPendingRequests`, `fetchFriendList`, `handleAddFriend`, `handleAcceptFriend`, `handleRejectFriend` 내 `getCurrentUser()` 호출도 모두 `currentUser` 참조로 교체한다.
