import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import HeaderUserInfo from './HeaderUserInfo';

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  text: '#F1F5F9',
  primary: '#4F46E5',
};

function HomeHeader() {
  const navigate = useNavigate();

  return (
    <AppBar position="static" sx={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{ color: COLORS.text, fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '1.25rem' }, display: { xs: 'none', sm: 'block' } }}
          >
            HEXSERA PINBALL
          </Typography>
          <Button variant="contained" onClick={() => navigate('/pinball')} sx={{ backgroundColor: COLORS.primary, color: COLORS.text }}>
            게임하기
          </Button>
        </Box>
        <HeaderUserInfo buttonColor={COLORS.primary} buttonTextColor={COLORS.text} outlinedBorderColor={COLORS.text} />
      </Toolbar>
    </AppBar>
  );
}

export default HomeHeader;
