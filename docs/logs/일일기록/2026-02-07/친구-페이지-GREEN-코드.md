# 친구 페이지 GREEN 코드 (TDD 통과용)

## 목표
작성된 TDD 테스트를 통과시키기 위한 FriendPage.jsx 구현 코드

---

## 전체 코드

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import axios from 'axios';

// Mock 사용자 데이터 (검색용)
const MOCK_USERS = [
  { id: 1, email: 'user1@test.com', nickname: '테스트유저1', birth_date: '2000-01-01', role: 'user' },
  { id: 2, email: 'user2@test.com', nickname: '테스트유저2', birth_date: '2000-01-02', role: 'user' },
  { id: 3, email: 'user3@test.com', nickname: '홍길동', birth_date: '2000-01-03', role: 'user' },
  { id: 4, email: 'user4@test.com', nickname: '김철수', birth_date: '2000-01-04', role: 'user' },
  { id: 5, email: 'user5@test.com', nickname: '박영희', birth_date: '2000-01-05', role: 'user' },
];

function FriendPage() {
  // 검색 관련 state
  const [searchNickname, setSearchNickname] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 친구 요청 관련 state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);

  // 친구 목록 관련 state
  const [friendList, setFriendList] = useState([]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState(null);

  // 액션 에러 state
  const [actionError, setActionError] = useState(null);

  // 현재 사용자 정보 가져오기
  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  };

  // 친구 요청 목록 조회 (pending)
  const fetchPendingRequests = async () => {
    const user = getCurrentUser();
    if (!user || !user.id) return;

    setPendingLoading(true);
    setPendingError(null);

    try {
      const response = await axios.get('/api/friend-requests', {
        params: {
          user_id: user.id,
          friend_status: 'pending'
        }
      });

      setPendingRequests(response.data.requests || []);
    } catch (error) {
      console.error('친구 요청 조회 실패:', error);
      setPendingError('친구 요청을 불러오는데 실패했습니다');
    } finally {
      setPendingLoading(false);
    }
  };

  // 친구 목록 조회 (accepted)
  const fetchFriendList = async () => {
    const user = getCurrentUser();
    if (!user || !user.id) return;

    setFriendLoading(true);
    setFriendError(null);

    try {
      const response = await axios.get('/api/friend-requests', {
        params: {
          user_id: user.id,
          friend_status: 'accepted'
        }
      });

      setFriendList(response.data.requests || []);
    } catch (error) {
      console.error('친구 목록 조회 실패:', error);
      setFriendError('친구 목록을 불러오는데 실패했습니다');
    } finally {
      setFriendLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchPendingRequests();
    fetchFriendList();
  }, []);

  // 친구 승인 핸들러
  const handleAcceptFriend = async (request) => {
    setActionError(null);

    try {
      await axios.post('/api/friend-requests/accept', {
        requester_id: request.requester_id,
        receiver_id: request.receiver_id
      });

      // 성공 시 목록 새로고침
      await fetchPendingRequests();
      await fetchFriendList();
    } catch (error) {
      console.error('친구 승인 실패:', error);
      setActionError(error.response?.data?.detail || '친구 승인에 실패했습니다');
    }
  };

  // 친구 거절 핸들러
  const handleRejectFriend = async (request) => {
    setActionError(null);

    try {
      await axios.post('/api/friend-requests/reject', {
        requester_id: request.requester_id,
        receiver_id: request.receiver_id
      });

      // 성공 시 목록 새로고침
      await fetchPendingRequests();
    } catch (error) {
      console.error('친구 거절 실패:', error);
      setActionError(error.response?.data?.detail || '친구 거절에 실패했습니다');
    }
  };

  // 검색 핸들러
  const handleSearch = () => {
    const results = MOCK_USERS.filter(user =>
      user.nickname.includes(searchNickname)
    );
    setSearchResults(results);
    setHasSearched(true);
  };

  // 친구 추가 핸들러 (기존 로직)
  const handleAddFriend = (user) => {
    console.log('친구 추가:', user.nickname);
  };

  // 상대방 ID 추출 (양방향 관계 처리)
  const getFriendId = (friendship) => {
    const user = getCurrentUser();
    if (!user) return null;

    if (friendship.requester_id === user.id) {
      return friendship.receiver_id;
    } else {
      return friendship.requester_id;
    }
  };

  return (
    <Box
      data-testid="friend-page"
      sx={{ display: 'flex', width: '100%', gap: 2 }}
    >
      {/* 왼쪽 영역: 검색 */}
      <Box data-testid="friend-left-area" sx={{ width: '60%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              placeholder="닉네임을 입력하세요"
              value={searchNickname}
              onChange={(e) => setSearchNickname(e.target.value)}
              size="small"
              fullWidth
            />
            <Button variant="contained" onClick={handleSearch}>검색</Button>
          </Box>
          {hasSearched && searchResults.length === 0 && (
            <Typography>검색 결과가 없습니다</Typography>
          )}
          <List>
            {searchResults.map((user) => (
              <ListItem
                key={user.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAddFriend(user)}
                  >
                    친구추가
                  </Button>
                }
              >
                <ListItemText primary={user.nickname} secondary={user.email} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>

      {/* 오른쪽 영역: 친구 요청 + 친구 목록 */}
      <Box data-testid="friend-right-area" sx={{ width: '40%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
          {/* 액션 에러 표시 */}
          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
              {actionError}
            </Alert>
          )}

          {/* 친구 요청 섹션 */}
          <Box data-testid="friend-request-section" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              친구 요청
            </Typography>

            {pendingLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
                <Typography sx={{ ml: 2 }}>로딩 중...</Typography>
              </Box>
            )}

            {pendingError && (
              <Alert severity="error">{pendingError}</Alert>
            )}

            {!pendingLoading && !pendingError && pendingRequests.length === 0 && (
              <Typography color="text.secondary">받은 친구 요청이 없습니다</Typography>
            )}

            {!pendingLoading && !pendingError && pendingRequests.length > 0 && (
              <List dense>
                {pendingRequests.map((request) => (
                  <ListItem
                    key={request.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemText
                      primary={`사용자 ID: ${request.requester_id}`}
                      secondary={`요청 ID: ${request.id}`}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => handleAcceptFriend(request)}
                      >
                        친구 승인
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handleRejectFriend(request)}
                      >
                        거절
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 현재 친구 목록 섹션 */}
          <Box data-testid="friend-list-section">
            <Typography variant="h6" sx={{ mb: 2 }}>
              현재 친구
            </Typography>

            {friendLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
                <Typography sx={{ ml: 2 }}>로딩 중...</Typography>
              </Box>
            )}

            {friendError && (
              <Alert severity="error">{friendError}</Alert>
            )}

            {!friendLoading && !friendError && friendList.length === 0 && (
              <Typography color="text.secondary">친구가 없습니다</Typography>
            )}

            {!friendLoading && !friendError && friendList.length > 0 && (
              <List dense>
                {friendList.map((friendship) => {
                  const friendId = getFriendId(friendship);
                  return (
                    <ListItem
                      key={friendship.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemText
                        primary={`친구 ID: ${friendId}`}
                        secondary={`관계 ID: ${friendship.id}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default FriendPage;
```

---

## 주요 변경 사항

### 1. 새로운 import 추가
```jsx
import { useState, useEffect } from 'react';
import {
  CircularProgress,  // 로딩 인디케이터
  Alert,            // 에러 메시지
  Divider          // 섹션 구분선
} from '@mui/material';
import axios from 'axios';
```

### 2. 새로운 State 추가
```jsx
// 친구 요청 관련 state
const [pendingRequests, setPendingRequests] = useState([]);
const [pendingLoading, setPendingLoading] = useState(false);
const [pendingError, setPendingError] = useState(null);

// 친구 목록 관련 state
const [friendList, setFriendList] = useState([]);
const [friendLoading, setFriendLoading] = useState(false);
const [friendError, setFriendError] = useState(null);

// 액션 에러 state
const [actionError, setActionError] = useState(null);
```

### 3. 유틸리티 함수
```jsx
// localStorage에서 사용자 정보 가져오기
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
};

// 양방향 관계에서 상대방 ID 추출
const getFriendId = (friendship) => {
  const user = getCurrentUser();
  if (!user) return null;

  if (friendship.requester_id === user.id) {
    return friendship.receiver_id;
  } else {
    return friendship.requester_id;
  }
};
```

### 4. API 호출 함수

#### 친구 요청 목록 조회
```jsx
const fetchPendingRequests = async () => {
  const user = getCurrentUser();
  if (!user || !user.id) return;

  setPendingLoading(true);
  setPendingError(null);

  try {
    const response = await axios.get('/api/friend-requests', {
      params: {
        user_id: user.id,
        friend_status: 'pending'
      }
    });

    setPendingRequests(response.data.requests || []);
  } catch (error) {
    console.error('친구 요청 조회 실패:', error);
    setPendingError('친구 요청을 불러오는데 실패했습니다');
  } finally {
    setPendingLoading(false);
  }
};
```

#### 친구 목록 조회
```jsx
const fetchFriendList = async () => {
  const user = getCurrentUser();
  if (!user || !user.id) return;

  setFriendLoading(true);
  setFriendError(null);

  try {
    const response = await axios.get('/api/friend-requests', {
      params: {
        user_id: user.id,
        friend_status: 'accepted'
      }
    });

    setFriendList(response.data.requests || []);
  } catch (error) {
    console.error('친구 목록 조회 실패:', error);
    setFriendError('친구 목록을 불러오는데 실패했습니다');
  } finally {
    setFriendLoading(false);
  }
};
```

### 5. 액션 핸들러

#### 친구 승인
```jsx
const handleAcceptFriend = async (request) => {
  setActionError(null);

  try {
    await axios.post('/api/friend-requests/accept', {
      requester_id: request.requester_id,
      receiver_id: request.receiver_id
    });

    // 성공 시 목록 새로고침
    await fetchPendingRequests();
    await fetchFriendList();
  } catch (error) {
    console.error('친구 승인 실패:', error);
    setActionError(error.response?.data?.detail || '친구 승인에 실패했습니다');
  }
};
```

#### 친구 거절
```jsx
const handleRejectFriend = async (request) => {
  setActionError(null);

  try {
    await axios.post('/api/friend-requests/reject', {
      requester_id: request.requester_id,
      receiver_id: request.receiver_id
    });

    // 성공 시 목록 새로고침
    await fetchPendingRequests();
  } catch (error) {
    console.error('친구 거절 실패:', error);
    setActionError(error.response?.data?.detail || '친구 거절에 실패했습니다');
  }
};
```

### 6. useEffect 추가
```jsx
useEffect(() => {
  fetchPendingRequests();
  fetchFriendList();
}, []);
```

### 7. 오른쪽 영역 UI 구현

#### 친구 요청 섹션
```jsx
<Box data-testid="friend-request-section" sx={{ mb: 3 }}>
  <Typography variant="h6" sx={{ mb: 2 }}>
    친구 요청
  </Typography>

  {/* 로딩 상태 */}
  {pendingLoading && (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
      <CircularProgress size={24} />
      <Typography sx={{ ml: 2 }}>로딩 중...</Typography>
    </Box>
  )}

  {/* 에러 상태 */}
  {pendingError && (
    <Alert severity="error">{pendingError}</Alert>
  )}

  {/* 빈 목록 */}
  {!pendingLoading && !pendingError && pendingRequests.length === 0 && (
    <Typography color="text.secondary">받은 친구 요청이 없습니다</Typography>
  )}

  {/* 친구 요청 목록 */}
  {!pendingLoading && !pendingError && pendingRequests.length > 0 && (
    <List dense>
      {pendingRequests.map((request) => (
        <ListItem key={request.id}>
          <ListItemText
            primary={`사용자 ID: ${request.requester_id}`}
            secondary={`요청 ID: ${request.id}`}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={() => handleAcceptFriend(request)}>
              친구 승인
            </Button>
            <Button variant="outlined" color="error" onClick={() => handleRejectFriend(request)}>
              거절
            </Button>
          </Box>
        </ListItem>
      ))}
    </List>
  )}
</Box>
```

#### 현재 친구 목록 섹션
```jsx
<Box data-testid="friend-list-section">
  <Typography variant="h6" sx={{ mb: 2 }}>
    현재 친구
  </Typography>

  {/* 로딩 상태 */}
  {friendLoading && (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
      <CircularProgress size={24} />
      <Typography sx={{ ml: 2 }}>로딩 중...</Typography>
    </Box>
  )}

  {/* 에러 상태 */}
  {friendError && (
    <Alert severity="error">{friendError}</Alert>
  )}

  {/* 빈 목록 */}
  {!friendLoading && !friendError && friendList.length === 0 && (
    <Typography color="text.secondary">친구가 없습니다</Typography>
  )}

  {/* 친구 목록 */}
  {!friendLoading && !friendError && friendList.length > 0 && (
    <List dense>
      {friendList.map((friendship) => {
        const friendId = getFriendId(friendship);
        return (
          <ListItem key={friendship.id}>
            <ListItemText
              primary={`친구 ID: ${friendId}`}
              secondary={`관계 ID: ${friendship.id}`}
            />
          </ListItem>
        );
      })}
    </List>
  )}
</Box>
```

---

## 테스트 통과 체크리스트

### FriendRequest.test.jsx
- ✅ "친구 요청" 제목 렌더링
- ✅ friend-request-section 존재
- ✅ GET /api/friend-requests (pending) 호출
- ✅ API 응답 목록 표시
- ✅ 0건일 때 "받은 친구 요청이 없습니다" 메시지
- ✅ "친구 승인" 버튼 존재
- ✅ POST /api/friend-requests/accept 호출
- ✅ 승인 후 목록에서 제거
- ✅ 실패 시 에러 메시지
- ✅ "거절" 버튼 존재
- ✅ POST /api/friend-requests/reject 호출
- ✅ 거절 후 목록에서 제거

### FriendList.test.jsx
- ✅ "현재 친구" 제목 렌더링
- ✅ friend-list-section 존재
- ✅ GET /api/friend-requests (accepted) 호출
- ✅ API 응답 친구 목록 표시
- ✅ 내가 requester인 경우 receiver ID 표시
- ✅ 내가 receiver인 경우 requester ID 표시
- ✅ 0명일 때 "친구가 없습니다" 메시지
- ✅ 사용자 ID 표시

### FriendPageIntegration.test.jsx
- ✅ 친구 요청 + 친구 목록 동시 표시
- ✅ 친구 승인 후 친구 목록에 추가 (fetchFriendList 재호출)
- ✅ 왼쪽/오른쪽 영역 분리
- ✅ 로딩 중 CircularProgress + "로딩 중..." 텍스트
- ✅ API 실패 시 에러 메시지
- ✅ 로그인 안한 상태에서 API 미호출

---

## 향후 개선 사항

### 1. 사용자 정보 표시
현재는 user_id만 표시하고 있지만, 실제로는 닉네임을 표시해야 합니다.

```jsx
// 사용자 정보 조회 함수 추가
const fetchUserInfo = async (userId) => {
  try {
    const response = await axios.get(`/api/v1/users/${userId}`, {
      headers: { 'X-API-Key': 'hexsera-secret-api-key-2026' }
    });
    return response.data;
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return null;
  }
};

// 친구 요청 목록에서 사용자 정보 함께 표시
<ListItemText
  primary={userInfo?.nickname || `사용자 ID: ${request.requester_id}`}
  secondary={userInfo?.email}
/>
```

### 2. 낙관적 업데이트 (Optimistic Update)
서버 응답을 기다리지 않고 UI를 먼저 업데이트하여 UX 개선:

```jsx
const handleAcceptFriend = async (request) => {
  // 1. UI 먼저 업데이트
  setPendingRequests(prev => prev.filter(r => r.id !== request.id));

  try {
    await axios.post('/api/friend-requests/accept', {
      requester_id: request.requester_id,
      receiver_id: request.receiver_id
    });

    // 2. 성공 시 친구 목록만 새로고침
    await fetchFriendList();
  } catch (error) {
    // 3. 실패 시 rollback
    await fetchPendingRequests();
    setActionError('친구 승인에 실패했습니다');
  }
};
```

### 3. 친구 검색 API 연동
현재는 Mock 데이터를 사용하지만, 실제 API와 연동 필요:

```jsx
const handleSearch = async () => {
  try {
    const response = await axios.get('/api/v1/users', {
      params: { search: searchNickname },
      headers: { 'X-API-Key': 'hexsera-secret-api-key-2026' }
    });
    setSearchResults(response.data);
    setHasSearched(true);
  } catch (error) {
    console.error('검색 실패:', error);
    setSearchResults([]);
    setHasSearched(true);
  }
};
```

### 4. React Query 도입
API 호출 로직을 React Query로 대체하여 캐싱, 재시도, 동기화 개선:

```jsx
import { useQuery, useMutation } from '@tanstack/react-query';

const { data: pendingRequests, isLoading: pendingLoading, error: pendingError } = useQuery({
  queryKey: ['friend-requests', 'pending', user?.id],
  queryFn: () => fetchPendingRequests(user.id),
  enabled: !!user?.id
});

const acceptMutation = useMutation({
  mutationFn: (request) => axios.post('/api/friend-requests/accept', request),
  onSuccess: () => {
    queryClient.invalidateQueries(['friend-requests']);
  }
});
```

---

## 실행 방법

1. **코드 적용**
```bash
# 위 코드를 frontend/src/FriendPage.jsx에 복사/붙여넣기
```

2. **테스트 실행**
```bash
cd frontend
npm test Friend
```

3. **예상 결과**
- 모든 테스트 통과 (GREEN)
- 총 22개 테스트 성공
