# FriendPage localStorage 직접 참조

- 발견일: 2026-05-07
- 관련 작업: JWT 5단계 (localStorage 의존 제거)

## 문제

`frontend/src/pages/FriendPage/FriendPage.jsx:21`에서 유저 정보를 `localStorage.getItem('user')`로 직접 읽고 있다.

JWT 5단계에서 로그인 시 `localStorage.setItem('user', ...)`를 제거했으므로, 현재 FriendPage에서 유저 정보를 가져오지 못하는 상태다.

## 해결 방향

`localStorage.getItem('user')` 대신 `useAuth()`의 `user`를 사용하도록 변경한다.

```jsx
// 변경 전
const userStr = localStorage.getItem('user');
const currentUser = JSON.parse(userStr);

// 변경 후
const { user: currentUser } = useAuth();
```
