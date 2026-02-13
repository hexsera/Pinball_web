import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Button, Grid, Container,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper
} from '@mui/material';
import axios from 'axios';
import Aurora from '../../components/Aurora/Aurora';

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

  const [ranking, setRanking] = useState([]);
  const [rankingError, setRankingError] = useState(false);

  useEffect(() => {
    axios.get('/api/v1/monthly-scores')
      .then((res) => {
        setRanking(res.data.scores.slice(0, 10));
      })
      .catch(() => {
        setRankingError(true);
      });
  }, []);

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Aurora 배경 */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden'}}>
        <Aurora
          colorStops={['#467ee5', '#7C3AED', '#908aff']}
          amplitude={1.2}
          speed={1.2}
          blend={0.35}
        />
      </Box>

      {/* 기존 콘텐츠 */}
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 네비게이션 바 */}
      <AppBar position="static" sx={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ color: COLORS.text, fontWeight: 'bold' }}>
            🎯 HEXSERA PINBALL
          </Typography>
          <Box>
            <Button onClick={() => navigate('/pinball')} sx={{ color: COLORS.text }}>
              게임하기
            </Button>
            <Button
              onClick={() => navigate('/login')}
              variant="outlined"
              sx={{ color: COLORS.text, borderColor: COLORS.text, ml: 1 }}
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
      <Grid container spacing={4} sx={{ mt: 16 }}>
        {/* 좌측: 타이틀 + CTA */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: { md: 6 } }}>
            <Typography variant="h3" sx={{ color: COLORS.text, fontWeight: 'bold' }}>
              세상에서 가장 짜릿한<br />핀볼 게임을 경험하세요.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/pinball')}
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
            {rankingError ? (
              <Typography sx={{ color: COLORS.subText }}>랭킹을 불러올 수 없습니다.</Typography>
            ) : (
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
                    {ranking.map((row, index) => {
                      const rank = index + 1;
                      return (
                        <TableRow key={row.nickname}>
                          <TableCell sx={{ color: COLORS.text, borderColor: COLORS.border }}>
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                          </TableCell>
                          <TableCell sx={{ color: COLORS.text, borderColor: COLORS.border }}>{row.nickname}</TableCell>
                          <TableCell align="right" sx={{ color: COLORS.text, fontWeight: 'bold', borderColor: COLORS.border }}>
                            {row.score.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
      </Container>

      {/* 푸터 */}
      <Box component="footer" sx={{ textAlign: 'center', py: 3, mt: 'auto', color: COLORS.subText }}>
        <Typography variant="body2">© 2026 HEXSERA</Typography>
      </Box>
      </Box>
    </Box>
  );
}

export default HomePage;
