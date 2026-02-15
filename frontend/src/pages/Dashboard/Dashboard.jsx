import { useNavigate } from 'react-router-dom';
import { Box, Toolbar, Container, Typography, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';

const drawerWidth = 260;

function Maindashboard() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex' }}>
      <DashboardHeader onMobileToggle={() => setMobileOpen(true)} />
      <DashboardSidebar
        currentMenu=""
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
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
          {isLoggedIn ? (
            <Typography variant="h6" fontWeight={600}>
              좌측 메뉴에서 원하는 항목을 선택하세요.
            </Typography>
          ) : (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                로그인 하고 세상에서 가장 재미있는 핀볼게임 하러가기!
              </Typography>
              <Button variant="contained" onClick={() => navigate('/login')}>
                로 그 인 하 기
              </Button>
            </Box>
          )}
        </Container>
      </Box>
    </Box>
  );
}

export default Maindashboard;
