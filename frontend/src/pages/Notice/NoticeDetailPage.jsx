import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, Paper, Divider } from '@mui/material';
import { AuthContext } from '../../contexts/AuthContext';
import HomeHeader from '../../components/HomeHeader';
import { getNotice, deleteNotice } from '../../services/noticeService';

const COLORS = { bg: '#0F172A', card: '#1E293B', border: '#334155',
                 text: '#F1F5F9', subText: '#94A3B8', primary: '#4F46E5' };

function NoticeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    getNotice(id).then(setNotice);
  }, [id]);

  const handleDelete = async () => {
    await deleteNotice(id);
    navigate('/notice');
  };

  if (!notice) return null;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <HomeHeader />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button onClick={() => navigate('/notice')}
                sx={{ color: COLORS.subText, mb: 2 }}>← 목록으로</Button>
        <Paper sx={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, p: 3 }}>
          <Typography variant="h5" sx={{ color: COLORS.text, mb: 1 }}>{notice.title}</Typography>
          <Typography sx={{ color: COLORS.subText, fontSize: '0.85rem', mb: 2 }}>
            {new Date(notice.created_at).toLocaleDateString('ko-KR')}
          </Typography>
          <Divider sx={{ borderColor: COLORS.border, mb: 2 }} />
          <Box sx={{ color: COLORS.text, '& img': { maxWidth: '100%' } }}
               dangerouslySetInnerHTML={{ __html: notice.content }} />
          {user?.role === 'admin' && (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="contained" color="error" onClick={handleDelete}>삭제</Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default NoticeDetailPage;
