import { Box, Toolbar, Container, Typography } from '@mui/material';

const drawerWidth = 260;

function AdminUserMain() {
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
      </Container>
    </Box>
  );
}

export default AdminUserMain;
