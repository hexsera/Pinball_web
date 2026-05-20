# FriendPage React Query 적용 실행계획

## 요구사항 요약

**요구사항**: `FriendPage.jsx`의 수동 API 호출 패턴을 React Query로 교체한다.

**목적**:
- 승인/거절 후 `fetchPendingRequests()` + `fetchFriendList()` 순차 재호출을 `invalidateQueries`로 교체해 병렬 재조회로 개선
- 친구별 월간 점수를 `useQuery`로 캐싱해 목록 갱신 시 변경 없는 친구의 점수 재요청 제거
- `pendingLoading`, `friendLoading` 등 수동 로딩 state 제거

## 현재상태 분석

- `fetchPendingRequests`, `fetchFriendList` 두 함수를 `useEffect`에서 호출하고, 각각 `setPendingLoading` / `setFriendLoading`으로 수동 관리
- 승인(`handleAcceptFriend`) 시 `await fetchPendingRequests()` → `await fetchFriendList()` 순차 실행 (직렬)
- 거절(`handleRejectFriend`) 시 `await fetchPendingRequests()` 재호출
- `fetchFriendList` 내부에서 친구 수만큼 `GET /monthly-scores/{id}`를 매번 전부 재조회
- 친구 추가(`handleAddFriend`) 시 `await fetchPendingRequests()` 재호출

## 구현 방법

`pendingRequests`와 `friendList`를 각각 `useQuery`로 관리하고, mutation `onSuccess`에서 `invalidateQueries`로 두 쿼리를 동시에 무효화해 병렬 재조회한다.
친구별 월간 점수는 `friendId`를 key로 한 `useQuery`로 개별 캐싱한다. 점수 쿼리는 `friendList` 데이터가 있을 때만 `enabled`로 활성화한다.
승인/거절/친구추가는 각각 `useMutation`으로 교체한다.

## 구현 단계

### 1. 친구 요청 목록 조회 — `useQuery`로 교체

```jsx
const { data: pendingRequests = [], isPending: pendingLoading, isError: isPendingError } = useQuery({
  queryKey: ['friendRequests', currentUser?.id, 'pending'],
  queryFn: () =>
    axios.get('/api/friend-requests', {
      params: { user_id: currentUser.id, friend_status: 'pending' },
    }).then(res => res.data.requests || []),
  enabled: !!currentUser?.id,
  staleTime: 1000 * 30,
});
```
- `fetchPendingRequests` 함수, `setPendingLoading`, `setPendingError`, `setPendingRequests` 모두 제거
- queryKey에 `currentUser.id`를 포함해 로그인 유저가 바뀌면 자동으로 다른 캐시 사용

### 2. 친구 목록 조회 — `useQuery`로 교체

```jsx
const { data: friendList = [], isPending: friendLoading, isError: isFriendError } = useQuery({
  queryKey: ['friendList', currentUser?.id],
  queryFn: () =>
    axios.get('/api/friend-requests', {
      params: { user_id: currentUser.id, friend_status: 'accepted' },
    }).then(res => res.data.requests || []),
  enabled: !!currentUser?.id,
  staleTime: 1000 * 30,
});
```
- 기존 `fetchFriendList` 내부의 점수 조회 로직은 다음 단계에서 분리
- `setFriendList`, `setFriendLoading`, `setFriendError` 제거

### 3. 친구 월간 점수 — 개별 `useQuery`로 캐싱

```jsx
// FriendScoreItem 컴포넌트로 분리해 friendId별로 독립적으로 캐싱
function FriendScoreItem({ friendId }) {
  const { data: score } = useQuery({
    queryKey: ['friendScore', friendId],
    queryFn: () =>
      axios.get(`/api/v1/monthly-scores/${friendId}`).then(res => res.data.score),
    staleTime: 1000 * 60 * 5, // 점수는 5분간 캐시 유지
  });
  return (
    <Typography variant="body2" color="text.secondary">
      최고점수:{score != null ? score : '-'}
    </Typography>
  );
}
```
- **기존 문제**: `fetchFriendList` 호출마다 전체 친구 점수를 `Promise.all`로 재조회
- 컴포넌트를 분리하면 friendId가 동일한 친구는 캐시를 그대로 사용하고 재요청하지 않음
- `friendList` 렌더링 시 `<FriendScoreItem friendId={friendId} />`로 교체

### 4. 승인/거절/친구추가 — `useMutation`으로 교체

```jsx
const queryClient = useQueryClient();

// 두 쿼리를 동시에 무효화 → 병렬 재조회
const invalidateFriendQueries = () => {
  queryClient.invalidateQueries({ queryKey: ['friendRequests', currentUser.id, 'pending'] });
  queryClient.invalidateQueries({ queryKey: ['friendList', currentUser.id] });
};

const acceptMutation = useMutation({
  mutationFn: (request) =>
    axios.post('/api/friend-requests/accept', {
      requester_id: request.requester_id,
      receiver_id: request.receiver_id,
    }),
  onSuccess: invalidateFriendQueries,
  onError: (error) => setActionError(error.response?.data?.detail || '친구 승인에 실패했습니다'),
});

const rejectMutation = useMutation({
  mutationFn: (request) =>
    axios.post('/api/friend-requests/reject', {
      requester_id: request.requester_id,
      receiver_id: request.receiver_id,
    }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendRequests', currentUser.id, 'pending'] }),
  onError: (error) => setActionError(error.response?.data?.detail || '친구 거절에 실패했습니다'),
});

const addFriendMutation = useMutation({
  mutationFn: (targetUser) =>
    axios.post('/api/friend-requests', {
      requester_id: currentUser.id,
      receiver_id: targetUser.id,
    }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendRequests', currentUser.id, 'pending'] }),
  onError: (error) => setActionError(error.response?.data?.detail || '친구 추가에 실패했습니다'),
});
```
- 기존 `handleAcceptFriend`의 순차 `await` 두 번 → `invalidateQueries` 두 번 동시 호출로 병렬화
- 거절/친구추가는 pending 쿼리만 무효화 (friendList는 변경 없음)
- `handleAcceptFriend`, `handleRejectFriend`, `handleAddFriend` 내부를 각 mutation 호출로 교체

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/FriendPage/FriendPage.jsx` | 수정 | useQuery/useMutation 적용, 수동 fetch/state 제거, FriendScoreItem 분리 |

## 완료 체크리스트

- [x] 친구 요청 목록이 페이지 진입 시 정상 출력된다
- [x] 친구 목록이 페이지 진입 시 정상 출력된다
- [x] 승인 후 친구 요청 목록과 친구 목록이 동시에 갱신된다
- [x] 거절 후 친구 요청 목록에서 해당 요청이 사라진다
- [x] 친구추가 후 검색 결과의 버튼이 "요청됨"으로 바뀐다
- [x] 승인 직후 Network 탭에서 pending/accepted 두 요청이 병렬로 발생한다
- [x] 친구 목록 갱신 시 기존 친구의 점수 요청이 Network 탭에 재발생하지 않는다
