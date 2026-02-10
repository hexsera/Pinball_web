import { useState } from 'react';
import { Box, TextField, Button, Container, Typography, Paper, Alert, CardMedia } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';


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
        <Typography component="h1" variant="h5">
              회원가입
            </Typography>
            <Typography component="h1" variant="h5">
              이메일과 닉네임을 입력 해 주세요.
            </Typography>
            <Box sx={{ mt: 3, width: '100%' }}>
              {/* 이메일 입력 */}

              <TextField
                fullWidth
                sx={{ mt: 1 }}
                label="이메일"
                margin="normal"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* 닉네임 입력 */}
              <TextField
                fullWidth
                sx={{ mt: 1 }}
                label="닉네임"
                margin="normal"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />




              {/* 회원가입 버튼 */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  sx={{ width: '300px' }}
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
        <Typography component="h1" variant="h5">
              회원가입
            </Typography>
            <Typography component="h1" variant="h5">
              비밀번호를 입력해주세요.
            </Typography>
            <Box sx={{ mt: 3, width: '100%' }}>
              {/* 비밀번호입력 */}
              <TextField
                fullWidth
                sx={{ mt: 1 }}
                label="비밀번호"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* 비밀번호 확인 */}
              <TextField
                fullWidth
                sx={{ mt: 1 }}
                label="비밀번호 확인"
                margin="normal"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              {/* 회원가입 버튼 */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  sx={{ width: '300px' }}
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
    <Typography component="h1" variant="h5">
        회원가입
    </Typography>

    <Typography component="h1" variant="h5">
        생년월일을 입력 해 주세요.
    </Typography>


    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 1 }}>
        <TextField
            label="연도"
            placeholder="2000"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            sx={{ flex: 1 }}
        />
        <TextField
            label="월"
            placeholder="01"
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value)}
            sx={{ flex: 1 }}
        />
        <TextField
            label="일"
            placeholder="01"
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value)}
            sx={{ flex: 1 }}
        />
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  sx={{ width: '300px' }}
                  onClick={handleRegister}
                >
                  회원가입
                </Button>
              </Box>
    </>
  );

  const step = [Register_email_and_name, Register_password, Register_born];
  /*

<CardMedia
              component="img"
              height={70}
              image="/images/main_icon.png"
              alt="로고"
              onClick={() => navigate('/')}
              sx={{ marginBottom: 2, objectFit: 'contain', cursor: 'pointer' }}
            />
  */

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
            {step[registerStep]}

          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Register;
