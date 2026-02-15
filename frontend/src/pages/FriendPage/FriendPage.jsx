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
  Alert,
  Divider
} from '@mui/material';
import axios from 'axios';

const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
};

function FriendPage() {
  // 검색 관련 state
  const [searchNickname, setSearchNickname] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // 친구 요청 관련 state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);

  // 친구 목록 관련 state
  const [friendList, setFriendList] = useState([]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState(null);

  // 친구 월간 점수 state: { [user_id]: score | null }
  const [friendScores, setFriendScores] = useState({});

  // 액션 에러 state
  const [actionError, setActionError] = useState(null);

  // 친구 요청 목록 조회 (pending)
  const fetchPendingRequests = async () => {
    const user = getCurrentUser();
    if (!user || !user.id) return;

    setPendingLoading(true);
    setPendingError(null);

    try {
      const response = await axios.get('/api/friend-requests', {
        params: { user_id: user.id, friend_status: 'pending' }
      });
      setPendingRequests(response.data.requests || []);
    } catch (error) {
      console.error('친구 요청 조회 실패:', error);
      setPendingError('친구 요청을 불러오는데 실패했습니다');
    } finally {
      setPendingLoading(false);
    }
  };

  // 친구 목록 조회 (accepted) + 각 친구의 월간 점수 조회
  const fetchFriendList = async () => {
    const user = getCurrentUser();
    if (!user || !user.id) return;

    setFriendLoading(true);
    setFriendError(null);

    try {
      const response = await axios.get('/api/friend-requests', {
        params: { user_id: user.id, friend_status: 'accepted' }
      });

      const friends = response.data.requests || [];
      setFriendList(friends);

      const scores = {};
      await Promise.all(friends.map(async (friendship) => {
        const friendId = friendship.receiver_id === user.id
          ? friendship.requester_id
          : friendship.receiver_id;
        try {
          const scoreRes = await axios.get(`/api/v1/monthly-scores/${friendId}`);
          scores[friendId] = scoreRes.data.score;
        } catch {
          scores[friendId] = null;
        }
      }));
      setFriendScores(scores);
    } catch (error) {
      console.error('친구 목록 조회 실패:', error);
      setFriendError('친구 목록을 불러오는데 실패했습니다');
    } finally {
      setFriendLoading(false);
    }
  };

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
      await fetchPendingRequests();
    } catch (error) {
      console.error('친구 거절 실패:', error);
      setActionError(error.response?.data?.detail || '친구 거절에 실패했습니다');
    }
  };

  // 검색 핸들러
  const handleSearch = async () => {
    setSearchError(null);
    setHasSearched(false);
    try {
      const response = await axios.get('/api/v1/users', {
        params: { nickname: searchNickname }
      });
      setSearchResults(response.data);
      setHasSearched(true);
    } catch (error) {
      console.error('검색 실패:', error);
      setSearchError('검색에 실패했습니다');
    }
  };

  // 친구추가 버튼 상태 계산
  const getFriendButtonState = (targetUser) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return { label: '친구추가', disabled: false };

    const isAlreadyFriend = friendList.some(
      (f) => f.requester_id === targetUser.id || f.receiver_id === targetUser.id
    );
    if (isAlreadyFriend) return { label: '요청됨', disabled: true };

    const hasSentRequest = pendingRequests.some(
      (f) => f.requester_id === currentUser.id && f.receiver_id === targetUser.id
    );
    if (hasSentRequest) return { label: '요청됨', disabled: true };

    return { label: '친구추가', disabled: false };
  };

  // 친구 추가 핸들러
  const handleAddFriend = async (targetUser) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    setActionError(null);
    try {
      await axios.post('/api/friend-requests', {
        requester_id: currentUser.id,
        receiver_id: targetUser.id
      });
      await fetchPendingRequests();
    } catch (error) {
      console.error('친구 추가 실패:', error);
      setActionError(error.response?.data?.detail || '친구 추가에 실패했습니다');
    }
  };

  const currentUser = getCurrentUser();
  const receivedRequests = pendingRequests.filter(r => r.receiver_id === currentUser?.id);

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
          {searchError && (
            <Alert severity="error" sx={{ mb: 1 }}>{searchError}</Alert>
          )}
          {hasSearched && searchResults.length === 0 && (
            <Typography>검색 결과가 없습니다</Typography>
          )}
          <List>
            {searchResults.map((user) => {
              const { label, disabled } = getFriendButtonState(user);
              return (
                <ListItem
                  key={user.id}
                  secondaryAction={
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={disabled}
                      onClick={() => handleAddFriend(user)}
                    >
                      {label}
                    </Button>
                  }
                >
                  <ListItemText primary={user.nickname} secondary={user.email} />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      </Box>

      {/* 오른쪽 영역: 친구 요청 + 친구 목록 */}
      <Box data-testid="friend-right-area" sx={{ width: '40%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
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

            {pendingError && (
              <Alert severity="error">{pendingError}</Alert>
            )}

            {!pendingLoading && !pendingError && pendingRequests.length === 0 && (
              <Typography color="text.secondary">받은 친구 요청이 없습니다</Typography>
            )}

            {!pendingLoading && !pendingError && receivedRequests.length > 0 && (
              <List dense>
                {receivedRequests.map((request) => (
                  <ListItem
                    key={request.id}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
                  >
                    <ListItemText primary={request.requester_nickname} />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        onClick={() => handleAcceptFriend(request)}
                      >
                        승인
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

            {friendError && (
              <Alert severity="error">{friendError}</Alert>
            )}

            {!friendLoading && !friendError && friendList.length === 0 && (
              <Typography color="text.secondary">친구가 없습니다</Typography>
            )}

            {!friendLoading && !friendError && friendList.length > 0 && (
              <List dense>
                {friendList.map((friendship) => {
                  const isReceiver = friendship.receiver_id === currentUser?.id;
                  const friendNickname = isReceiver
                    ? friendship.requester_nickname
                    : friendship.receiver_nickname;
                  const friendId = isReceiver
                    ? friendship.requester_id
                    : friendship.receiver_id;
                  const score = friendScores[friendId];
                  return (
                    <ListItem
                      key={friendship.id}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
                      secondaryAction={
                        <Typography variant="body2" color="text.secondary">
                          최고점수:{score != null ? score : '-'}
                        </Typography>
                      }
                    >
                      <ListItemText primary={friendNickname} />
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
