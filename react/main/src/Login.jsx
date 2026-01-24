import { useState } from 'react';
import { Box, TextField, Button, Container, Typography, Paper, Alert, CardMedia} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';

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
        login({ id: response.data.id, name: response.data.nickname });
        setLoginError(false);
        navigate('/');
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
        minHeight: '100vh',
        backgroundColor: '#87CEEB',  // 하늘색 배경
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            backgroundColor: 'white',  // 흰색 컨테이너
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
                sx={{ marginBottom: 2, objectFit: 'contain' }} />
            <Typography component="h1" variant="h5">
              로그인
            </Typography>
            <Box sx={{ mt: 3, width: '100%' }}>
              <Typography component="h6" variant="h6">
                이메일
              </Typography>
              <TextField
                fullWidth
                sx = {{mt: 1}}
                //label="아이디"
                placeholder="이메일을 입력해주세요."
                margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Typography component="h6" variant="h6">
                비밀번호
              </Typography>
              <TextField
                fullWidth
                sx = {{mt: 1}}
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
                  sx={{ width: '300px' }}  // 버튼 크기를 150px로 줄임
                  onClick={handleLogin}
                >
                  로그인
                </Button>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="outlined"
                  sx={{ width: '300px' }}  // 버튼 크기를 150px로 줄임
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
  );
}

export default Login;