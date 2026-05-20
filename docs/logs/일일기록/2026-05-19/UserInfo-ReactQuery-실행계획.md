# UserInfo 페이지 React Query 적용 실행계획

## 요구사항 요약

**요구사항**: `UserInfo.jsx`의 회원 정보 조회/수정 로직을 React Query(`useQuery`, `useMutation`)로 전환한다.

**목적**: `PUT` 성공 후 `setUserInfo`로 수동 상태를 갱신하는 대신 `invalidateQueries`로 자동 갱신하고, `useEffect` + `useState` 보일러플레이트를 제거한다. `birth_date`처럼 JWT 토큰에 없는 데이터를 캐시에 저장해 불필요한 재요청을 줄인다.

## 현재상태 분석

- `useEffect` 안에서 `api.get('/users/{id}')` 호출 후 `setUserInfo`로 상태 저장
- `PUT` 성공 후 응답 데이터로 `setUserInfo`를 수동으로 재호출해 화면 갱신
- `isPending` 상태가 없어서 데이터 로딩 중 "로딩 중..." 텍스트만 표시됨
- `isError` 처리가 없어서 조회 실패 시 화면에 아무 피드백 없음

## 구현 방법

- `useQuery`로 `GET /users/{id}` 조회 및 캐시 관리
- `useMutation`으로 `PUT /users/{id}` 수정 후 `invalidateQueries`로 캐시 무효화 → 자동 재조회
- `queryKey: ['user', user.id]`로 사용자별 캐시 키 분리
- `staleTime: 1000 * 60 * 5`(5분) — 페이지 재진입 시 불필요한 재요청 방지

## 구현 단계

### 1. `useQuery`로 회원 정보 조회

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { data: userInfo, isPending, isError } = useQuery({
  queryKey: ['user', user?.id],
  queryFn: () => api.get(`/users/${user.id}`).then(res => res.data),
  enabled: !!user?.id,
  staleTime: 1000 * 60 * 5,
});
```
- `enabled: !!user?.id` — user가 없을 때 쿼리 실행을 막아 불필요한 요청 방지
- `staleTime: 5분` — 페이지 재방문 시 캐시를 신선하다고 보고 재요청 생략
- 기존 `useEffect` + `fetchUserInfo` + `setUserInfo` 전부 삭제

### 2. 조회 결과로 수정 필드 초기값 동기화

```javascript
useEffect(() => {
  if (userInfo) {
    setEditNickname(userInfo.nickname);
    const parts = userInfo.birth_date?.split('-') ?? ['', '', ''];
    setEditBirthYear(parts[0]);
    setEditBirthMonth(parts[1]);
    setEditBirthDay(parts[2]);
  }
}, [userInfo]);
```
- `userInfo`가 처음 로드되거나 캐시 갱신 후 바뀔 때 수정 필드 기본값을 맞춤
- `useQuery`의 `data`가 `undefined`일 때를 옵셔널 체이닝으로 보호

### 3. `useMutation`으로 회원 정보 수정

```javascript
const queryClient = useQueryClient();

const updateMutation = useMutation({
  mutationFn: (updateData) => api.put(`/users/${user.id}`, updateData),
  onSuccess: () => {
    setUpdateSuccess(true);
    queryClient.invalidateQueries({ queryKey: ['user', user.id] });
  },
  onError: (err) => {
    if (err.response?.status === 400) setUpdateError('이메일이 이미 사용 중입니다.');
    else if (err.response?.status === 404) setUpdateError('사용자를 찾을 수 없습니다.');
    else setUpdateError('회원 정보 수정에 실패했습니다.');
  },
});
```
- `invalidateQueries`가 `['user', user.id]` 캐시를 무효화 → `useQuery`가 자동으로 재요청
- 기존 `handleUpdate` 내부의 `setUserInfo` 수동 갱신 코드 삭제

### 4. `handleUpdate` 단순화 및 로딩/에러 UI 추가

```javascript
const handleUpdate = () => {
  setUpdateError(null);
  setUpdateSuccess(false);
  if (!editNickname && !editPassword && !editBirthYear && !editBirthMonth && !editBirthDay) {
    setUpdateError('수정할 정보를 입력해주세요.');
    return;
  }
  const updateData = {};
  if (editNickname) updateData.nickname = editNickname;
  if (editPassword) updateData.password = editPassword;
  if (editBirthYear || editBirthMonth || editBirthDay) {
    updateData.birth_date = `${editBirthYear}-${editBirthMonth.padStart(2,'0')}-${editBirthDay.padStart(2,'0')}`;
  }
  updateMutation.mutate(updateData);
};
```
- `mutate` 호출로 변경, `async/await` 제거
- 수정 버튼에 `disabled={updateMutation.isPending}` 추가해 중복 요청 방지

```jsx
// 조회 영역 로딩/에러 처리
if (isPending) return <CircularProgress />;
if (isError) return <Alert severity="error">회원 정보를 불러오지 못했습니다.</Alert>;
```
- `isPending` 중에는 스피너, `isError` 시 에러 알림 표시

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/UserInfo/UserInfo.jsx` | 수정 | `useEffect` 조회 → `useQuery`, `handleUpdate` → `useMutation`으로 전환 |

## 완료 체크리스트

- [x] `/user/account` 접속 시 회원 정보(이메일, 닉네임, 생년월일)가 정상 표시된다
- [x] 데이터 로딩 중 스피너가 표시된다
- [x] 조회 실패 시 에러 메시지가 표시된다
- [x] 닉네임/생년월일 수정 후 "수정" 버튼 클릭 시 성공 알림이 표시된다
- [x] 수정 성공 후 "회원 정보" 조회 영역이 자동으로 갱신된다 (Network 탭에서 GET 재요청 확인)
- [x] DevTools → Network 탭에서 5분 내 재방문 시 GET 요청이 발생하지 않는다 (캐시 재사용)
- [x] 수정 버튼이 요청 중 비활성화된다
