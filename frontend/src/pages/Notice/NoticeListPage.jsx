import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Container, List,
         ListItemButton, ListItemText, Divider, Paper, Typography } from '@mui/material';
import { AuthContext } from '../../contexts/AuthContext';
import HomeHeader from '../../components/HomeHeader';
import { getNotices } from '../../services/noticeService';

const COLORS = { bg: '#0F172A', card: '#1E293B', border: '#334155',
                 text: '#F1F5F9', subText: '#94A3B8', primary: '#4F46E5' };

const LIMIT = 10;

function NoticeListPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [notices, setNotices] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const skip = (page - 1) * LIMIT;
    getNotices(skip, LIMIT).then(({ items, total }) => {
      setNotices(items);
      setTotal(total);
    });
  }, [page]);

  const totalPages = Math.ceil(total / LIMIT);
  const pageGroupStart = Math.floor((page - 1) / 5) * 5 + 1;
  const pageGroupEnd = Math.min(pageGroupStart + 4, totalPages);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <HomeHeader />
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
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
            <Button
              disabled={page === 1}
              onClick={() => setSearchParams({ page: page - 1 })}
              sx={{ color: COLORS.text, borderColor: COLORS.border }}
              variant="outlined"
            >&lt;</Button>
            {Array.from({ length: pageGroupEnd - pageGroupStart + 1 }, (_, i) => {
              const p = pageGroupStart + i;
              return (
                <Button
                  key={p}
                  variant={p === page ? 'contained' : 'outlined'}
                  onClick={() => setSearchParams({ page: p })}
                  sx={p === page
                    ? { backgroundColor: COLORS.primary }
                    : { color: COLORS.text, borderColor: COLORS.border }
                  }
                >{p}</Button>
              );
            })}
            <Button
              disabled={page === totalPages}
              onClick={() => setSearchParams({ page: page + 1 })}
              sx={{ color: COLORS.text, borderColor: COLORS.border }}
              variant="outlined"
            >&gt;</Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default NoticeListPage;
