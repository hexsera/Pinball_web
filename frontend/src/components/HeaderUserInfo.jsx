import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, IconButton, Avatar, Typography,
  Button, Menu, MenuItem, Divider
} from '@mui/material';
import { Close } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

function HeaderUserInfo({ buttonColor, buttonTextColor, outlinedBorderColor }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState(null);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      axios.get(`/api/v1/users/${user.id}`)
        .then(res => setRole(res.data.role))
        .catch(() => setRole(null));
    }
  }, [isLoggedIn, user?.id]);

  function AvatarButtonClick(event) {
    setAnchorEl(event.currentTarget);
    setAvatarMenu(!avatarMenu);
  }

  function handleAvatarMenuClose() {
    setAnchorEl(null);
    setAvatarMenu(false);
  }

  function AvatarLogoutButton() {
    logout();
  }

  function handlePageNavigation() {
    if (location.pathname.startsWith('/admin')) {
      navigate('/');
    } else {
      navigate('/admin');
    }
    handleAvatarMenuClose();
  }

  const isAdmin = role === 'admin';
  const pageNavLabel = location.pathname.startsWith('/admin') ? '메인 페이지 이동' : '관리 페이지 이동';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isLoggedIn ? (
        <>
          <Button id="basic-button" onClick={AvatarButtonClick}>
            <Avatar sx={{ width: 40, height: 40 }}>
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
            <Typography sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>{user.name}</Typography>
          </Button>
          <Menu
            anchorEl={anchorEl}
            onClose={handleAvatarMenuClose}
            id="user-menu"
            open={avatarMenu}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              <IconButton aria-label="닫기" size="small" onClick={handleAvatarMenuClose}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
            <Divider />
            <MenuItem onClick={() => { navigate('/dashboard', { state: { section: '계정' } }); handleAvatarMenuClose(); }}>계정설정</MenuItem>
            <MenuItem onClick={() => { navigate('/dashboard', { state: { section: '친구' } }); handleAvatarMenuClose(); }}>친구</MenuItem>
            {isAdmin && (
              <MenuItem onClick={handlePageNavigation}>{pageNavLabel}</MenuItem>
            )}
            <MenuItem onClick={() => AvatarLogoutButton()}>로그아웃</MenuItem>
          </Menu>
        </>
      ) : (
        <>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={buttonColor ? { backgroundColor: buttonColor, color: buttonTextColor } : {}}
          >
            로그인
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/Register')}
            sx={buttonColor ? { color: buttonTextColor, borderColor: outlinedBorderColor } : {}}
          >
            회원가입
          </Button>
        </>
      )}
    </Box>
  );
}

export default HeaderUserInfo;
