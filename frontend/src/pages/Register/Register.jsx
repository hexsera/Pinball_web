import { useState } from 'react';
import { Box, TextField, Button, Container, Typography, Paper, Alert, CardMedia } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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

const textFieldSx = {
  mt: 1,
  '& .MuiOutlinedInput-root': {
    color: COLORS.text,
    '& fieldset': { borderColor: COLORS.border },
    '&:hover fieldset': { borderColor: COLORS.text },
    '&.Mui-focused fieldset': { borderColor: COLORS.primary },
  },
  '& .MuiInputLabel-root': { color: COLORS.subText },
  '& .MuiInputLabel-root.Mui-focused': { color: COLORS.primary },
  '& .MuiInputBase-input::placeholder': { color: COLORS.subText },
};

function Register() {
  // 입력값을 저장할 상태
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [registerStep, setRegisterStep] = useState(0);
  const navigate = useNavigate();

  // 회원가입 버튼을 눌렀을 때 실행되는 함수
  const handleRegister = async () => {
    // 비밀번호 확인 검사
    if (registerStep == 0)
    {
        setRegisterStep(1);
    }
    else if (registerStep == 1)
    {
        setRegisterStep(2);
    }
    else if (registerStep == 2)
    {
        // 날짜 형식을 YYYY-MM-DD로 변환 (월/일을 2자리로)
        const formattedMonth = birthMonth.padStart(2, '0');
        const formattedDay = birthDay.padStart(2, '0');

        // API 호출
        const data = {
          email: email,
          nickname: nickname,
          password: password,
          birth_date: `${birthYear}-${formattedMonth}-${formattedDay}`
        };

        try {
          const response = await axios.post('/api/v1/register', data);

          // 성공: 201 상태코드와 User 객체 반환
          if (response.status === 201) {
            console.log('회원가입 성공:', response.data);
            navigate('/login');
          }
        } catch (error) {
          // 에러 처리
          if (error.response) {
            // 서버에서 에러 응답을 받은 경우
            console.log('회원가입 실패:', error.response.data.detail);
            alert(error.response.data.detail);
          } else {
            // 네트워크 오류 등
            console.log('오류:', error.message);
            alert('회원가입 중 오류가 발생했습니다.');
          }
        }
    }
    //
  };



  const Register_email_and_name = (
    <>
        <Typography component="h1" variant="h5" sx={{ color: COLORS.text }}>
              회원가입
            </Typography>
            <Typography component="h1" variant="h5" sx={{ color: COLORS.text }}>
              이메일과 닉네임을 입력 해 주세요.
            </Typography>
            <Box sx={{ mt: 3, width: '100%' }}>
              {/* 이메일 입력 */}

              <TextField
                fullWidth
                sx={{ ...textFieldSx, mt: 1 }}
                label="이메일"
                margin="normal"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* 닉네임 입력 */}
              <TextField
                fullWidth
                sx={{ ...textFieldSx, mt: 1 }}
                label="닉네임"
                margin="normal"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />




              {/* 회원가입 버튼 */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  sx={{ width: '300px', backgroundColor: COLORS.primary, color: COLORS.text }}
                  onClick={handleRegister}
                >
                  다음
                </Button>
              </Box>
            </Box>
    </>
  );

  const Register_password= (
    <>
        <Typography component="h1" variant="h5" sx={{ color: COLORS.text }}>
              회원가입
            </Typography>
            <Typography component="h1" variant="h5" sx={{ color: COLORS.text }}>
              비밀번호를 입력해주세요.
            </Typography>
            <Box sx={{ mt: 3, width: '100%' }}>
              {/* 비밀번호입력 */}
              <TextField
                fullWidth
                sx={{ ...textFieldSx, mt: 1 }}
                label="비밀번호"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* 비밀번호 확인 */}
              <TextField
                fullWidth
                sx={{ ...textFieldSx, mt: 1 }}
                label="비밀번호 확인"
                margin="normal"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              {/* 회원가입 버튼 */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  sx={{ width: '300px', backgroundColor: COLORS.primary, color: COLORS.text }}
                  onClick={handleRegister}
                >
                  다음
                </Button>
              </Box>
            </Box>
    </>
  );

  const Register_born = (
    <>
    <Typography component="h1" variant="h5" sx={{ color: COLORS.text }}>
        회원가입
    </Typography>

    <Typography component="h1" variant="h5" sx={{ color: COLORS.text }}>
        생년월일을 입력 해 주세요.
    </Typography>


    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 1 }}>
        <TextField
            label="연도"
            placeholder="2000"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            sx={{ ...textFieldSx, flex: 1 }}
        />
        <TextField
            label="월"
            placeholder="01"
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
            sx={{ ...textFieldSx, flex: 1 }}
        />
        <TextField
            label="일"
            placeholder="01"
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value)}
            sx={{ ...textFieldSx, flex: 1 }}
        />
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  sx={{ width: '300px', backgroundColor: COLORS.primary, color: COLORS.text }}
                  onClick={handleRegister}
                >
                  회원가입
                </Button>
              </Box>
    </>
  );

  const step = [Register_email_and_name, Register_password, Register_born];

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
                onClick={() => navigate('/')}
                sx={{ marginBottom: 2, objectFit: 'contain', display: { xs: 'none', sm: 'block' }, cursor: 'pointer' }}
              />
              {step[registerStep]}

            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}

export default Register;
