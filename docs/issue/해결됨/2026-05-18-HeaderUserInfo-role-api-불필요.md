# HeaderUserInfo role API 불필요 호출 [해결됨]

## 현황

`HeaderUserInfo.jsx`에서 Admin 메뉴 표시 여부를 판단하기 위해 `GET /users/{user.id}`를 매번 호출해 `role`을 가져오고 있다.

```js
api.get(`/users/${user.id}`)
  .then(res => setRole(res.data.role))
```

## 문제

JWT payload에 이미 `role`이 포함되어 있어 (`{sub, email, role, nickname}`) AuthContext의 `user` 객체에 role이 존재한다. 불필요한 API 호출.

## 개선 방향

API 호출을 제거하고 `user.role`을 직접 참조한다.

```js
// before
const isAdmin = role === 'admin';

// after
const isAdmin = user?.role === 'admin';
```

관련 `useEffect`, `role` state도 함께 제거.

## 해결

`HeaderUserInfo.jsx`에서 `role` state, `useEffect`, `api` import 제거 후 `user?.role`을 직접 참조하도록 수정. (2026-05-20)
