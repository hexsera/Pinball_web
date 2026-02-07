import React from 'react';
import { Box, Paper } from '@mui/material';

function FriendPage() {
  return (
    <Box
      data-testid="friend-page"
      sx={{ display: 'flex', width: '100%', gap: 2 }}
    >
      <Box data-testid="friend-left-area" sx={{ width: '60%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
          {/* 왼쪽 영역 콘텐츠 */}
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
