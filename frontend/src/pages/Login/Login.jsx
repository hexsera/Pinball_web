import { useState } from 'react';
import { Box, TextField, Button, Container, Typography, Paper, Alert, CardMedia} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import Aurora from '../../components/Aurora/Aurora';

const COLORS = {
  bg: '#0F172A',
  card: 'rgba(30, 41, 59, 0.85)',
  border: '#334155',
  text: '#F1F5F9',
  subText: '#94A3B8',
  primary: '#4F46E5',
};

function Login() {
  // 아이디와 비밀번호를 저장할 상태
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();



  // 확인 버튼을 눌렀을 때 실행되는 함수
  const handleLogin = async () => {
    try {
      const response = await axios.post('/api/v1/login', {
        email: username,
        password: password
      });

      // 로그인 성공
      if (response.status === 200) {
        console.log('로그인 성공:', response.data);
        login({ id: response.data.user_id, name: response.data.nickname, role: response.data.role, email: response.data.email });
        setLoginError(false);

        // role 기반 페이지 이동
        if (response.data.role === 'admin') {
          navigate('/admin');  // 관리자는 관리자 페이지로
        } else {
          navigate('/');  // 일반 사용자는 대시보드로
        }
      }
    } catch (error) {
      // 로그인 실패
      setLoginError(true);
      if (error.response) {
        console.log('로그인 실패:', error.response.data.detail);
      }
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Aurora 배경 */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <Aurora
          colorStops={['#467ee5', '#7C3AED', '#908aff']}
          amplitude={1.2}
          speed={1.2}
          blend={0.35}
        />
      </Box>

      {/* 기존 콘텐츠 */}
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <CardMedia
                  component="img"
                  height={70}
                  image="/images/main_icon.png"
                  alt="로고"
                  onClick={()=>navigate('/')}
                  sx={{ marginBottom: 2, objectFit: 'contain', display: { xs: 'none', sm: 'block' } }} />
              <Typography component="h1" variant="h5" sx={{ color: COLORS.text }}>
                로그인
              </Typography>
              <Box sx={{ mt: 3, width: '100%' }}>
                <Typography component="h6" variant="h6" sx={{ color: COLORS.text }}>
                  이메일
                </Typography>
                <TextField
                  fullWidth
                  sx={{
                    mt: 1,
                    '& .MuiOutlinedInput-root': {
                      color: COLORS.text,
                      '& fieldset': { borderColor: COLORS.border },
                      '&:hover fieldset': { borderColor: COLORS.text },
                      '&.Mui-focused fieldset': { borderColor: COLORS.primary },
                    },
                    '& .MuiInputBase-input::placeholder': { color: COLORS.subText },
                  }}
                  placeholder="이메일을 입력해주세요."
                  margin="normal"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Typography component="h6" variant="h6" sx={{ color: COLORS.text }}>
                  비밀번호
                </Typography>
                <TextField
                  fullWidth
                  sx={{
                    mt: 1,
                    '& .MuiOutlinedInput-root': {
                      color: COLORS.text,
                      '& fieldset': { borderColor: COLORS.border },
                      '&:hover fieldset': { borderColor: COLORS.text },
                      '&.Mui-focused fieldset': { borderColor: COLORS.primary },
                    },
                    '& .MuiInputBase-input::placeholder': { color: COLORS.subText },
                  }}
                  placeholder="비밀번호를 입력해주세요."
                  type="password"
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {loginError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    로그인 실패
                  </Alert>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="contained"
                    sx={{ width: '300px', backgroundColor: COLORS.primary, color: COLORS.text }}
                    onClick={handleLogin}
                  >
                    로그인
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="outlined"
                    sx={{ width: '300px', borderColor: COLORS.text, color: COLORS.text }}
                    onClick={()=>navigate('/Register')}
                  >
                    회원가입
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}

export default Login;
