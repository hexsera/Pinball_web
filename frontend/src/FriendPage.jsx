import React, { useState } from 'react';
import { Box, Paper, TextField, Button, List, ListItem, ListItemText, Typography } from '@mui/material';

// Mock 사용자 데이터 (추후 API로 대체 예정)
const MOCK_USERS = [
  { id: 1, email: 'user1@test.com', nickname: '테스트유저1', birth_date: '2000-01-01', role: 'user' },
  { id: 2, email: 'user2@test.com', nickname: '테스트유저2', birth_date: '2000-01-02', role: 'user' },
  { id: 3, email: 'user3@test.com', nickname: '홍길동', birth_date: '2000-01-03', role: 'user' },
  { id: 4, email: 'user4@test.com', nickname: '김철수', birth_date: '2000-01-04', role: 'user' },
  { id: 5, email: 'user5@test.com', nickname: '박영희', birth_date: '2000-01-05', role: 'user' },
];

function FriendPage() {
  const [searchNickname, setSearchNickname] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    // Mock 데이터에서 닉네임으로 검색 (부분 일치)
    const results = MOCK_USERS.filter(user =>
      user.nickname.includes(searchNickname)
    );
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleAddFriend = (user) => {
    // TODO: 친구 추가 기능 구현 예정
    console.log('친구 추가:', user.nickname);
  };

  return (
    <Box
      data-testid="friend-page"
      sx={{ display: 'flex', width: '100%', gap: 2 }}
    >
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
      <Box data-testid="friend-right-area" sx={{ width: '40%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
          {/* 오른쪽 영역 콘텐츠 */}
        </Paper>
      </Box>
    </Box>
  );
}

export default FriendPage;
