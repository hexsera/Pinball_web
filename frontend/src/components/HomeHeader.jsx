import { useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import HeaderUserInfo from './HeaderUserInfo';

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  text: '#F1F5F9',
  primary: '#4F46E5',
};

const SHORTCUTS = [
  { label: '공지사항', path: '/notice' },
];

function HomeHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeItem = SHORTCUTS.find(s => location.pathname.startsWith(s.path))?.label ?? null;

  const handleShortcut = (item) => {
    navigate(item.path);
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
      <Toolbar sx={{ position: 'relative', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            onClick={() => navigate('/')}
            sx={{ color: COLORS.text, fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '1.25rem' }, display: { xs: 'none', sm: 'block' }, cursor: 'pointer' }}
          >
            HEXSERA PINBALL
          </Typography>
          <Button variant="contained" onClick={() => navigate('/pinball')} sx={{ backgroundColor: COLORS.primary, color: COLORS.text }}>
            게임하기
          </Button>
        </Box>

        <Box sx={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}>
          {SHORTCUTS.map((item) => (
            <Button
              key={item.label}
              onClick={() => handleShortcut(item)}
              sx={{
                color: COLORS.text,
                backgroundColor: activeItem === item.label ? 'rgba(79,70,229,0.15)' : 'transparent',
                borderBottom: activeItem === item.label ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                borderRadius: 0,
                px: 1.5,
                '&:hover': {
                  backgroundColor: 'rgba(79,70,229,0.1)',
                  color: COLORS.text,
                },
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <HeaderUserInfo buttonColor={COLORS.primary} buttonTextColor={COLORS.text} outlinedBorderColor={COLORS.text} />
      </Toolbar>
    </AppBar>
  );
}

export default HomeHeader;
