import { useState, useEffect } from 'react';
import { Box, Toolbar, Container, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, InputLabel, FormControl, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const drawerWidth = 260;

function AdminUserMain() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
  };

  // 테이블 컬럼 정의
  const columns = [
    { field: 'email', headerName: '이메일', width: 200 },
    { field: 'nickname', headerName: '닉네임', width: 130 },
    { field: 'birth_date', headerName: '생년월일', width: 130 },
    { field: 'role', headerName: '역할', width: 100 },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          aria-label="수정"
          size="small"
          onClick={() => handleEditClick(params.row)}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

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

      <Dialog open={editDialogOpen} onClose={handleDialogClose}>
        <DialogTitle>회원 수정</DialogTitle>
        <DialogContent>
          <TextField
            label="닉네임"
            fullWidth
            margin="dense"
          />
          <TextField
            label="생년월일"
            type="date"
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="비밀번호"
            type="password"
            fullWidth
            margin="dense"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="role-label">역할</InputLabel>
            <Select labelId="role-label" label="역할">
              <MenuItem value="user">user</MenuItem>
              <MenuItem value="admin">admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>취소</Button>
          <Button variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminUserMain;
