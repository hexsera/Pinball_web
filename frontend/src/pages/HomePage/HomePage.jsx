import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Button, Grid, Container,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper
} from '@mui/material';

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  text: '#F1F5F9',
  subText: '#94A3B8',
  primary: '#4F46E5',
};

function HomePage() {
  const navigate = useNavigate();

  const [ranking] = useState([
    { rank: 1, nickname: 'alpha', score: 1234500 },
    { rank: 2, nickname: 'ninja', score: 987300 },
    { rank: 3, nickname: 'hexfan', score: 765000 },
    { rank: 4, nickname: 'king', score: 543200 },
    { rank: 5, nickname: '홍길동', score: 321000 },
  ]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      {/* 네비게이션 바 */}
      <AppBar position="static" sx={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ color: COLORS.primary, fontWeight: 'bold' }}>
            🎯 HEXSERA PINBALL
          </Typography>
          <Box>
            <Button onClick={() => navigate('/dashboard')} sx={{ color: COLORS.text }}>
              게임하기
            </Button>
            <Button
              onClick={() => navigate('/login')}
              variant="outlined"
              sx={{ color: COLORS.primary, borderColor: COLORS.primary, ml: 1 }}
            >
              로그인
            </Button>
            <Button
              onClick={() => navigate('/Register')}
              variant="contained"
              sx={{ backgroundColor: COLORS.primary, ml: 1 }}
            >
              회원가입
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero 섹션 */}
      <Container maxWidth="lg" sx={{ flexGrow: 1, overflow: 'hidden' }}>
      <Grid container spacing={4} sx={{ mt: 4 }}>
        {/* 좌측: 타이틀 + CTA */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: { md: 6 } }}>
            <Typography variant="h3" sx={{ color: COLORS.text, fontWeight: 'bold' }}>
              세상에서 가장 짜릿한<br />핀볼 게임을 경험하세요.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/dashboard')}
              sx={{ backgroundColor: COLORS.primary, width: 'fit-content', px: 4, py: 1.5 }}
            >
              ▶ 지금 바로 플레이하기
            </Button>
          </Box>
        </Grid>

        {/* 우측: 이번 달 랭킹 */}
        <Grid  size={{ xs: 12, md: 4 }}>
          <Paper sx={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ color: COLORS.text, mb: 2 }}>🏆 이번 달 랭킹</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: COLORS.subText, borderColor: COLORS.border }}>#</TableCell>
                    <TableCell sx={{ color: COLORS.subText, borderColor: COLORS.border }}>닉네임</TableCell>
                    <TableCell align="right" sx={{ color: COLORS.subText, borderColor: COLORS.border }}>점수</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ranking.map((row) => (
                    <TableRow key={row.rank}>
                      <TableCell sx={{ color: COLORS.text, borderColor: COLORS.border }}>
                        {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                      </TableCell>
                      <TableCell sx={{ color: COLORS.text, borderColor: COLORS.border }}>{row.nickname}</TableCell>
                      <TableCell align="right" sx={{ color: COLORS.primary, fontWeight: 'bold', borderColor: COLORS.border }}>
                        {row.score.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      </Container>

      {/* 푸터 */}
      <Box component="footer" sx={{ textAlign: 'center', py: 3, mt: 'auto', color: COLORS.subText }}>
        <Typography variant="body2">© 2026 HEXSERA</Typography>
      </Box>
    </Box>
  );
}

export default HomePage;
