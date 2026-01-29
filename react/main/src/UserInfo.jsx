import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';

function UserInfo() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // 회원 정보 상태
  const [userInfo, setUserInfo] = useState({
    email: '',
    nickname: '',
    birth_date: ''
  });

  // 회원 정보 수정 상태
  const [editNickname, setEditNickname] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBirthYear, setEditBirthYear] = useState('');
  const [editBirthMonth, setEditBirthMonth] = useState('');
  const [editBirthDay, setEditBirthDay] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  // 회원 탈퇴 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 회원 정보 조회
  useEffect(() => {
    const fetchUserInfo = async () => {
      console.log('회원 정보 API 호출 시작');
      try {
        const response = await axios.get(`/api/v1/users/${user.id}`, {
          headers: { 'X-API-Key': 'hexsera-secret-api-key-2026' }
        });
        console.log('회원 정보 API 호출 성공:', response.data);
        setUserInfo({
          email: response.data.email,
          nickname: response.data.nickname,
          birth_date: response.data.birth_date
        });

        // 수정 필드에 기본값 설정
        setEditNickname(response.data.nickname);

        // 생년월일 분리 (YYYY-MM-DD → 연도, 월, 일)
        const birthDateParts = response.data.birth_date.split('-');
        setEditBirthYear(birthDateParts[0]);
        setEditBirthMonth(birthDateParts[1]);
        setEditBirthDay(birthDateParts[2]);
      } catch (err) {
        console.error('회원 정보 API 호출 실패:', err);
      }
    };

    if (user && user.id) {
      fetchUserInfo();
    }
  }, [user]);

  // 회원 정보 수정
  const handleUpdate = async () => {
    setUpdateError(null);
    setUpdateSuccess(false);

    // 수정할 필드가 하나도 없는지 검증
    if (!editNickname && !editPassword && !editBirthYear && !editBirthMonth && !editBirthDay) {
      setUpdateError('수정할 정보를 입력해주세요.');
      return;
    }

    try {
      // 입력된 필드만 포함하는 객체 생성
      const updateData = {};
      if (editNickname) updateData.nickname = editNickname;
      if (editPassword) updateData.password = editPassword;

      // 생년월일이 입력된 경우 YYYY-MM-DD 형식으로 변환
      if (editBirthYear || editBirthMonth || editBirthDay) {
        const formattedMonth = editBirthMonth.padStart(2, '0');
        const formattedDay = editBirthDay.padStart(2, '0');
        updateData.birth_date = `${editBirthYear}-${formattedMonth}-${formattedDay}`;
      }

      console.log('회원 정보 수정 API 호출 시작:', updateData);

      const response = await axios.put(
        `/api/v1/users/${user.id}`,
        updateData,
        {
          headers: { 'X-API-Key': 'hexsera-secret-api-key-2026' }
        }
      );

      console.log('회원 정보 수정 API 호출 성공:', response.data);

      // 성공 시 상태 초기화 및 회원 정보 다시 조회
      setUpdateSuccess(true);
      /* setEditNickname('');
      setEditPassword('');
      setEditBirthYear('');
      setEditBirthMonth('');
      setEditBirthDay(''); */

      // 회원 정보 갱신 (nickname이 변경된 경우 화면에 반영)
      setUserInfo({
        email: response.data.email,
        nickname: response.data.nickname,
        birth_date: response.data.birth_date
      });

    } catch (err) {
      console.error('회원 정보 수정 API 호출 실패:', err);

      if (err.response?.status === 400) {
        setUpdateError('이메일이 이미 사용 중입니다.');
      } else if (err.response?.status === 404) {
        setUpdateError('사용자를 찾을 수 없습니다.');
      } else {
        setUpdateError('회원 정보 수정에 실패했습니다.');
      }
    }
  };

  // 회원 탈퇴
  const handleDelete = () => {
    // TODO: 백엔드 API 연동
    console.log('탈퇴 요청');
    setDeleteDialogOpen(false);
    logout();
    navigate('/');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* 회원 정보 조회 영역 */}
      <Paper
        sx={{
          p: 3,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#1f2937' }}>
          회원 정보
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              이메일
            </Typography>
            <Typography variant="body1" sx={{ color: '#1f2937' }}>
              {userInfo.email || '로딩 중...'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              닉네임
            </Typography>
            <Typography variant="body1" sx={{ color: '#1f2937' }}>
              {userInfo.nickname || '로딩 중...'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              생년월일
            </Typography>
            <Typography variant="body1" sx={{ color: '#1f2937' }}>
              {userInfo.birth_date || '로딩 중...'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* 회원 정보 수정 영역 */}
      <Paper
        sx={{
          p: 3,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#1f2937' }}>
          회원 정보 수정
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="닉네임"
            placeholder="새로운 닉네임을 입력하세요"
            value={editNickname}
            onChange={(e) => setEditNickname(e.target.value)}
          />
          <TextField
            fullWidth
            label="비밀번호"
            type="password"
            placeholder="새로운 비밀번호를 입력하세요"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
          />
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
            <TextField
              label="연도"
              placeholder="2000"
              value={editBirthYear}
              onChange={(e) => setEditBirthYear(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="월"
              placeholder="01"
              value={editBirthMonth}
              onChange={(e) => setEditBirthMonth(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="일"
              placeholder="01"
              value={editBirthDay}
              onChange={(e) => setEditBirthDay(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Box>
          {updateSuccess && (
            <Alert severity="success">회원 정보가 성공적으로 수정되었습니다.</Alert>
          )}
          {updateError && (
            <Alert severity="error">{updateError}</Alert>
          )}
          <Button
            variant="contained"
            onClick={handleUpdate}
            sx={{ mt: 1 }}
          >
            수정
          </Button>
        </Box>
      </Paper>

      {/* 회원 탈퇴 영역 */}
      <Paper
        sx={{
          p: 3,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#1f2937' }}>
          회원 탈퇴
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
          회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
        </Typography>
        <Button
          variant="contained"
          color="error"
          onClick={() => setDeleteDialogOpen(true)}
        >
          회원 탈퇴
        </Button>
      </Paper>

      {/* 탈퇴 확인 Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>회원 탈퇴</DialogTitle>
        <DialogContent>
          <Typography>
            정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            탈퇴
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserInfo;
