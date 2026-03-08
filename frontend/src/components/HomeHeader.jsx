import { useState } from 'react';
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

const SHORTCUTS = [
  { label: '공지사항', path: '/notice' },
];

function HomeHeader() {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(null);

  const handleShortcut = (item) => {
    setActiveItem(prev => prev === item.label ? null : item.label);
    navigate(item.path);
  };

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
            {SHORTCUTS.map((item) => (
              <Button
                key={item.label}
                onClick={() => handleShortcut(item)}
                sx={{
                  color: activeItem === item.label ? COLORS.primary : COLORS.text,
                  backgroundColor: activeItem === item.label ? 'rgba(79,70,229,0.15)' : 'transparent',
                  borderBottom: activeItem === item.label ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                  borderRadius: 0,
                  px: 1.5,
                  '&:hover': {
                    backgroundColor: 'rgba(79,70,229,0.1)',
                    color: COLORS.primary,
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Box>
        <HeaderUserInfo buttonColor={COLORS.primary} buttonTextColor={COLORS.text} outlinedBorderColor={COLORS.text} />
      </Toolbar>
    </AppBar>
  );
}

export default HomeHeader;
