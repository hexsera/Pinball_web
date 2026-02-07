import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, IconButton, Badge, Avatar, Typography,
  Button, Menu, MenuItem
} from '@mui/material';
import { Notifications, Mail } from '@mui/icons-material';
import { useAuth } from '../AuthContext';

function HeaderUserInfo() {
  const navigate = useNavigate();
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
            <MenuItem>프로필</MenuItem>
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
