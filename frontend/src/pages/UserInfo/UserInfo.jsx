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
  Alert,
  Toolbar,
  Container,
  CircularProgress,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import DashboardHeader from '../Dashboard/DashboardHeader';
import DashboardSidebar from '../Dashboard/DashboardSidebar';

function UserInfo() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

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
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState(null);

  // 회원 정보 조회
  const { data: userInfo, isPending, isError } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: () => api.get(`/users/${user.id}`).then(res => res.data),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // 조회 결과로 수정 필드 초기값 동기화
  useEffect(() => {
    if (userInfo) {
      setEditNickname(userInfo.nickname);
      const parts = userInfo.birth_date?.split('-') ?? ['', '', ''];
      setEditBirthYear(parts[0]);
      setEditBirthMonth(parts[1]);
      setEditBirthDay(parts[2]);
    }
  }, [userInfo]);

  // 회원 정보 수정
  const updateMutation = useMutation({
    mutationFn: (updateData) => api.put(`/users/${user.id}`, updateData),
    onSuccess: () => {
      setUpdateSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
    },
    onError: (err) => {
      if (err.response?.status === 400) setUpdateError('이메일이 이미 사용 중입니다.');
      else if (err.response?.status === 404) setUpdateError('사용자를 찾을 수 없습니다.');
      else setUpdateError('회원 정보 수정에 실패했습니다.');
    },
  });

  const handleUpdate = () => {
    setUpdateError(null);
    setUpdateSuccess(false);

    if (!editNickname && !editPassword && !editBirthYear && !editBirthMonth && !editBirthDay) {
      setUpdateError('수정할 정보를 입력해주세요.');
      return;
    }

    const updateData = {};
    if (editNickname) updateData.nickname = editNickname;
    if (editPassword) updateData.password = editPassword;
    if (editBirthYear || editBirthMonth || editBirthDay) {
      updateData.birth_date = `${editBirthYear}-${editBirthMonth.padStart(2, '0')}-${editBirthDay.padStart(2, '0')}`;
    }

    updateMutation.mutate(updateData);
  };

  // 회원 탈퇴
  const handleDelete = async () => {
    setDeleteError(null);

    // "회원 탈퇴" 텍스트 일치 검증
    if (deleteConfirmText !== '회원 탈퇴') {
      setDeleteError('"회원 탈퇴"를 정확히 입력해주세요.');
      return;
    }

    try {
      // 회원 삭제 (DELETE /api/v1/users/{user_id})
      console.log('회원 삭제 API 호출 시작');
      await api.delete(`/users/${user.id}`);
      console.log('회원 삭제 API 호출 성공');

      // 로그아웃 및 메인 페이지 이동
      setDeleteDialogOpen(false);
      logout();
      // 페이지 전체 새로고침으로 메인 페이지로 이동
      window.location.href = '/';
    } catch (err) {
      console.error('회원 탈퇴 실패:', err);

      // 사용자를 찾을 수 없음 (404)
      if (err.response?.status === 404) {
        setDeleteError('사용자를 찾을 수 없습니다.');
      }
      // 기타 에러
      else {
        setDeleteError('회원 탈퇴에 실패했습니다.');
      }
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <DashboardHeader onMobileToggle={() => setMobileOpen(true)} />
      <DashboardSidebar
        currentMenu="계정"
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: '#F9FAFB',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Container maxWidth="xl">
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
        {isPending && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {isError && (
          <Alert severity="error" sx={{ mt: 2 }}>회원 정보를 불러오지 못했습니다.</Alert>
        )}
        {userInfo && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              이메일
            </Typography>
            <Typography variant="body1" sx={{ color: '#1f2937' }}>
              {userInfo.email}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              닉네임
            </Typography>
            <Typography variant="body1" sx={{ color: '#1f2937' }}>
              {userInfo.nickname}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              생년월일
            </Typography>
            <Typography variant="body1" sx={{ color: '#1f2937' }}>
              {userInfo.birth_date}
            </Typography>
          </Box>
        </Box>
        )}
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
            disabled={updateMutation.isPending}
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
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteConfirmText('');
          setDeleteError(null);
        }}
      >
        <DialogTitle>회원 탈퇴</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            정말 탈퇴하시겠습니까? 삭제된 정보는 되돌릴 수 없습니다.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            진행하려면 아래 입력란에 <strong>"회원 탈퇴"</strong>를 정확히 입력해 주세요.
          </Typography>
          <TextField
            fullWidth
            label="회원 탈퇴 확인"
            placeholder="회원 탈퇴"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            sx={{ mt: 2 }}
          />
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setDeleteConfirmText('');
            setDeleteError(null);
          }}>
            취소
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            확인
          </Button>
        </DialogActions>
      </Dialog>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default UserInfo;
