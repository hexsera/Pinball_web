import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, IconButton, Badge, Avatar, Typography,
  Button, Menu, MenuItem, Divider
} from '@mui/material';
import { Notifications, Mail, Close } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

function HeaderUserInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState(null);
  const [avatarMenu, setAvatarMenu] = useState(false);

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

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isLoggedIn ? (
        <>
          <IconButton onClick={() => navigate('/admin')}>
            <Badge>
              <Notifications />
            </Badge>
          </IconButton>
          <IconButton>
            <Badge>
              <Mail />
            </Badge>
          </IconButton>
          <Button id="basic-button" onClick={AvatarButtonClick}>
            <Avatar sx={{ width: 40, height: 40, ml: 1 }}>U</Avatar>
            <Typography>{user.name}</Typography>
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
            <MenuItem onClick={handlePageNavigation}>페이지 이동</MenuItem>
            <MenuItem onClick={() => AvatarLogoutButton()}>로그아웃</MenuItem>
          </Menu>
        </>
      ) : (
        <>
          <Button variant="contained" onClick={() => navigate('/login')}>
            로그인
          </Button>
          <Button variant="outlined" onClick={() => navigate('/Register')}>
            회원가입
          </Button>
        </>
      )}
    </Box>
  );
}

export default HeaderUserInfo;
