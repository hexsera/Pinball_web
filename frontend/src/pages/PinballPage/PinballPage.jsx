import { useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import Pinball from '../Pinball';
import HeaderUserInfo from '../../components/HeaderUserInfo';

function PinballPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0F172A' }}>
      {/* 상단 헤더 */}
      <AppBar position="static" sx={{ backgroundColor: '#1E293B', boxShadow: 'none', borderBottom: '1px solid #334155' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton onClick={() => navigate('/')} sx={{ color: '#F1F5F9' }}>
            <HomeIcon />
          </IconButton>
          <HeaderUserInfo />
        </Toolbar>
      </AppBar>

      {/* 게임 영역 */}
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', pt: 2 }}>
        <Pinball />
      </Box>
    </Box>
  );
}

export default PinballPage;
