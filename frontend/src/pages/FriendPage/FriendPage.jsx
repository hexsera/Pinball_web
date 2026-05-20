import React, { useState } from 'react';
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
  Divider,
  Toolbar,
  Container,
} from '@mui/material';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import DashboardHeader from '../Dashboard/DashboardHeader';
import DashboardSidebar from '../Dashboard/DashboardSidebar';

/**
 * 친구별 월간 점수 표시 컴포넌트.
 * 상위에서 관리하면 friendList 갱신마다 전체 점수를 재조회해야 하므로 분리.
 */
function FriendScoreItem({ friendId }) {
  const { data: score } = useQuery({
    queryKey: ['friendScore', friendId],
    queryFn: () =>
      axios.get(`/api/v1/monthly-scores/${friendId}`).then(res => res.data.score),
    // 404는 점수 미등록 상태가 확정이므로 재시도 불필요
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
    staleTime: 1000 * 60 * 5,
  });
  return (
    <Typography variant="body2" color="text.secondary">
      최고점수:{score != null ? score : '-'}
    </Typography>
  );
}

function FriendPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [searchNickname, setSearchNickname] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // 친구 요청 목록 조회 (pending)
  const {
    data: pendingRequests = [],
    isPending: pendingLoading,
    isError: isPendingError,
  } = useQuery({
    queryKey: ['friendRequests', currentUser?.id, 'pending'],
    queryFn: () =>
      axios.get('/api/friend-requests', {
        params: { user_id: currentUser.id, friend_status: 'pending' },
      }).then(res => res.data.requests || []),
    enabled: !!currentUser?.id,
    staleTime: 1000 * 30,
  });

  // 친구 목록 조회 (accepted)
  const {
    data: friendList = [],
    isPending: friendLoading,
    isError: isFriendError,
  } = useQuery({
    queryKey: ['friendList', currentUser?.id],
    queryFn: () =>
      axios.get('/api/friend-requests', {
        params: { user_id: currentUser.id, friend_status: 'accepted' },
      }).then(res => res.data.requests || []),
    enabled: !!currentUser?.id,
    staleTime: 1000 * 30,
  });

  // 승인/거절 후 두 쿼리를 동시에 무효화해 병렬 재조회
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
    onError: (error) =>
      setActionError(error.response?.data?.detail || '친구 승인에 실패했습니다'),
  });

  const rejectMutation = useMutation({
    mutationFn: (request) =>
      axios.post('/api/friend-requests/reject', {
        requester_id: request.requester_id,
        receiver_id: request.receiver_id,
      }),
    // 거절은 friendList에 영향 없으므로 pending만 무효화
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['friendRequests', currentUser.id, 'pending'] }),
    onError: (error) =>
      setActionError(error.response?.data?.detail || '친구 거절에 실패했습니다'),
  });

  const addFriendMutation = useMutation({
    mutationFn: (targetUser) =>
      axios.post('/api/friend-requests', {
        requester_id: currentUser.id,
        receiver_id: targetUser.id,
      }),
    // 친구추가는 pending 목록에만 영향
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['friendRequests', currentUser.id, 'pending'] }),
    onError: (error) =>
      setActionError(error.response?.data?.detail || '친구 추가에 실패했습니다'),
  });

  const handleSearch = async () => {
    setSearchError(null);
    setHasSearched(false);
    try {
      const response = await api.get('/users', {
        params: { nickname: searchNickname }
      });
      setSearchResults(response.data);
      setHasSearched(true);
    } catch (error) {
      console.error('검색 실패:', error);
      setSearchError('검색에 실패했습니다');
    }
  };

  const getFriendButtonState = (targetUser) => {
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

  const receivedRequests = pendingRequests.filter(r => r.receiver_id === currentUser?.id);

  return (
    <Box sx={{ display: 'flex' }}>
      <DashboardHeader onMobileToggle={() => setMobileOpen(true)} />
      <DashboardSidebar
        currentMenu="친구"
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: '#F9FAFB',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Container maxWidth="xl">
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
                            disabled={disabled || addFriendMutation.isPending}
                            onClick={() => addFriendMutation.mutate(user)}
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

                  {isPendingError && (
                    <Alert severity="error">친구 요청을 불러오는데 실패했습니다</Alert>
                  )}

                  {!pendingLoading && !isPendingError && receivedRequests.length === 0 && (
                    <Typography color="text.secondary">받은 친구 요청이 없습니다</Typography>
                  )}

                  {!pendingLoading && !isPendingError && receivedRequests.length > 0 && (
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
                              disabled={acceptMutation.isPending}
                              onClick={() => acceptMutation.mutate(request)}
                            >
                              승인
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              disabled={rejectMutation.isPending}
                              onClick={() => rejectMutation.mutate(request)}
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

                  {isFriendError && (
                    <Alert severity="error">친구 목록을 불러오는데 실패했습니다</Alert>
                  )}

                  {!friendLoading && !isFriendError && friendList.length === 0 && (
                    <Typography color="text.secondary">친구가 없습니다</Typography>
                  )}

                  {!friendLoading && !isFriendError && friendList.length > 0 && (
                    <List dense>
                      {friendList.map((friendship) => {
                        const isReceiver = friendship.receiver_id === currentUser?.id;
                        const friendNickname = isReceiver
                          ? friendship.requester_nickname
                          : friendship.receiver_nickname;
                        const friendId = isReceiver
                          ? friendship.requester_id
                          : friendship.receiver_id;
                        return (
                          <ListItem
                            key={friendship.id}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}
                            secondaryAction={<FriendScoreItem friendId={friendId} />}
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
        </Container>
      </Box>
    </Box>
  );
}

export default FriendPage;
