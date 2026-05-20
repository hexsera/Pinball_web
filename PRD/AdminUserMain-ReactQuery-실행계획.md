# AdminUserMain React Query 적용 실행계획

## 요구사항 요약

**요구사항**: `AdminUserMain.jsx`의 수동 API 호출 패턴을 React Query로 교체한다.

**목적**:
- 수정/삭제 후 `fetchUsers()` 수동 재호출을 `invalidateQueries`로 대체
- 수정 다이얼로그 열 때 `GET /users/{id}` 중복 호출을 React Query 캐시로 제거
- `staleTime`으로 짧은 시간 내 재진입 시 캐시 재사용
- `placeholderData: keepPreviousData`로 갱신 중 테이블 깜빡임 방지

## 현재상태 분석

- `useEffect` + `fetchUsers()`로 목록 조회, `setLoading` / `setUsers`로 수동 관리
- `handleSave`, `handleDelete` 완료 후 `await fetchUsers()`를 직접 호출해 갱신
- 수정 다이얼로그 열 때마다 `GET /users/{id}`를 새로 호출함 (캐시 없음)
- `loading` state가 목록 조회에만 있고, 수정/삭제 중 버튼 비활성화 처리 없음
- 기존 테스트(`AdminUserMain.test.jsx`)는 `axios`를 직접 mock — React Query 도입 후 테스트 래퍼 필요

## 구현 방법

`useQuery`로 유저 목록과 개별 유저 정보를 캐싱하고, `useMutation`으로 PUT/DELETE를 처리한다.
mutation `onSuccess`에서 `invalidateQueries`를 호출해 목록을 자동 갱신한다.
수정 다이얼로그 열 때 `useQuery(['user', id])`로 캐시 우선 조회하여 중복 요청을 막는다.
테스트는 `QueryClientWrapper`를 추가해 React Query 컨텍스트를 제공한다.

## 구현 단계

### 1. 유저 목록 조회 — `useQuery`로 교체

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const { data: users = [], isPending } = useQuery({
  queryKey: ['adminUsers'],
  queryFn: () => api.get('/users').then(res => res.data),
  staleTime: 1000 * 30, // 30초간 캐시 신선
  placeholderData: (prev) => prev, // keepPreviousData 대체 (v5 문법)
});
```
- `useState([])` / `useEffect(fetchUsers)` / `setLoading` 제거
- `placeholderData: (prev) => prev`는 React Query v5의 `keepPreviousData` 동작과 동일
- `staleTime: 30초` — 빠른 재진입 시 불필요한 재요청 방지

### 2. 수정 다이얼로그 유저 조회 — `useQuery`로 교체

```jsx
const { data: selectedUserDetail } = useQuery({
  queryKey: ['adminUser', selectedUser?.id],
  queryFn: () => api.get(`/users/${selectedUser.id}`).then(res => res.data),
  enabled: !!selectedUser && editDialogOpen,
  staleTime: 1000 * 60,
});

// Dialog가 열릴 때 캐시 데이터로 폼 초기화
useEffect(() => {
  if (selectedUserDetail) {
    setEditForm({
      nickname: selectedUserDetail.nickname,
      birth_date: selectedUserDetail.birth_date,
      password: '',
      role: selectedUserDetail.role,
    });
  }
}, [selectedUserDetail]);
```
- `enabled: !!selectedUser && editDialogOpen`으로 다이얼로그가 열릴 때만 실행
- 한 번 조회한 유저는 60초간 캐시 — 같은 유저 재클릭 시 재요청 없음
- 기존 `handleEditClick` 내부의 `api.get` 호출 제거

### 3. 수정 — `useMutation`으로 교체

```jsx
const updateMutation = useMutation({
  mutationFn: ({ id, body }) => api.put(`/users/${id}`, body),
  onSuccess: () => {
    handleDialogClose();
    // ['adminUsers'] 캐시 무효화 → 목록 자동 재조회
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
  },
});

const handleSave = () => {
  if (!selectedUser) return;
  const body = { ...editForm };
  if (!body.password) delete body.password;
  updateMutation.mutate({ id: selectedUser.id, body });
};
```
- 저장 버튼에 `disabled={updateMutation.isPending}` 추가해 중복 클릭 방지

### 4. 삭제 — `useMutation`으로 교체

```jsx
const deleteMutation = useMutation({
  mutationFn: (id) => api.delete(`/users/${id}`),
  onSuccess: () => {
    handleDeleteDialogClose();
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
  },
});

const handleDelete = () => {
  if (!selectedUser) return;
  deleteMutation.mutate(selectedUser.id);
};
```
- 삭제 버튼에 `disabled={deleteMutation.isPending}` 추가

### 5. 테스트 — QueryClientWrapper 추가

```jsx
// AdminUserMain.test.jsx 상단에 추가
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithQuery(ui) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
```
- 기존 `render(<AdminUserMain />)` 호출을 `renderWithQuery(<AdminUserMain />)`로 교체
- `retry: false`로 테스트에서 자동 재시도 비활성화 (빠른 실패 확인)
- axios mock 방식은 유지 (React Query는 내부적으로 동일한 axios 인스턴스 사용)

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/admin/AdminUserMain.jsx` | 수정 | useQuery/useMutation 적용, 수동 fetch/state 제거 |
| `frontend/src/test/AdminUserMain.test.jsx` | 수정 | QueryClientWrapper 추가, render 호출 교체 |

## 완료 체크리스트

- [ ] `/admin/users` 진입 시 유저 목록이 정상 출력된다
- [ ] 수정 후 목록이 자동으로 갱신된다 (페이지 새로고침 없이)
- [ ] 삭제 후 목록이 자동으로 갱신된다 (페이지 새로고침 없이)
- [ ] 30초 내 재진입 시 Network 탭에 `/api/v1/users` 요청이 발생하지 않는다
- [ ] 같은 유저를 두 번 연속 수정 클릭하면 Network 탭에 두 번째 `/api/v1/users/{id}` 요청이 없다
- [ ] 수정/삭제 중 버튼이 비활성화된다
- [ ] `npm run test:run` 전체 테스트가 통과한다
