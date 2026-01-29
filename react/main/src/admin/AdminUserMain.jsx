import { useState, useEffect } from 'react';
import { Box, Toolbar, Container, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const drawerWidth = 260;

// 테이블 컬럼 정의
const columns = [
  //{ field: 'id', headerName: 'ID', width: 70 },
  { field: 'email', headerName: '이메일', width: 200 },
  { field: 'nickname', headerName: '닉네임', width: 130 },
  { field: 'birth_date', headerName: '생년월일', width: 130 },
  { field: 'role', headerName: '역할', width: 100 },
];

function AdminUserMain() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/v1/users', {
          headers: { 'X-API-Key': 'hexsera-secret-api-key-2026' }
        });
        setUsers(response.data);
        console.log(response.data);
      } catch (error) {
        console.error('회원 목록 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        backgroundColor: '#F9FAFB',
        minHeight: '100vh',
      }}
    >
      <Toolbar />
      <Container maxWidth="xl">
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          회원 관리
        </Typography>
        <Box sx={{ height: 600, width: '100%', backgroundColor: '#ffffff', borderRadius: 2, p: 2 }}>
          <DataGrid
            rows={users}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
          />
        </Box>
      </Container>
    </Box>
  );
}

export default AdminUserMain;
