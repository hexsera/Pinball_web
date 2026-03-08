import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button, Container, List,
         ListItemButton, ListItemText, Divider, Paper } from '@mui/material';
import { AuthContext } from '../../contexts/AuthContext';
import HeaderUserInfo from '../../components/HeaderUserInfo';
import { getNotices } from '../../services/noticeService';

const COLORS = { bg: '#0F172A', card: '#1E293B', border: '#334155',
                 text: '#F1F5F9', subText: '#94A3B8', primary: '#4F46E5' };

function NoticeListPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    getNotices().then(setNotices);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <AppBar position="static" sx={{ backgroundColor: COLORS.card,
                                      borderBottom: `1px solid ${COLORS.border}` }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ color: COLORS.text, cursor: 'pointer' }}
                      onClick={() => navigate('/')}>HEXSERA PINBALL</Typography>
          <HeaderUserInfo buttonColor={COLORS.primary} buttonTextColor={COLORS.text}
                          outlinedBorderColor={COLORS.text} />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ color: COLORS.text }}>공지사항</Typography>
          {user?.role === 'admin' && (
            <Button variant="contained" onClick={() => navigate('/notice/write')}
                    sx={{ backgroundColor: COLORS.primary }}>글쓰기</Button>
          )}
        </Box>
        <Paper sx={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <List>
            {notices.map((notice, idx) => (
              <Box key={notice.id}>
                <ListItemButton onClick={() => navigate(`/notice/${notice.id}`)}>
                  <ListItemText
                    primary={<Typography sx={{ color: COLORS.text }}>{notice.title}</Typography>}
                    secondary={<Typography sx={{ color: COLORS.subText, fontSize: '0.8rem' }}>
                      {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                    </Typography>}
                  />
                </ListItemButton>
                {idx < notices.length - 1 && <Divider sx={{ borderColor: COLORS.border }} />}
              </Box>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  );
}

export default NoticeListPage;
