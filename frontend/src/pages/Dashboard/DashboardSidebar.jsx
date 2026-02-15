import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CardMedia,
} from '@mui/material';
import {
  CalendarMonth,
  Person,
  Lock,
} from '@mui/icons-material';

const drawerWidth = 260;

const menuItems = [
  { text: '게임하기', icon: <CalendarMonth />, path: '/pinball' },
  { text: '친구', icon: <Person />, path: '/user/friend' },
  { text: '계정', icon: <Lock />, path: '/user/account' },
];

function SidebarContent({ currentMenu, onNavigate }) {
  return (
    <Box>
      <Toolbar
        sx={{
          height: 80,
          display: 'flex',
          alignItems: 'center',
          px: 2,
        }}
      >
        <CardMedia
          component="img"
          height={70}
          image="/images/main_icon.png"
          alt="로고"
          onClick={() => onNavigate('/')}
          sx={{ marginBottom: 2, objectFit: 'contain', cursor: 'pointer' }}
        />
      </Toolbar>

      <List sx={{ px: 2 }}>
        {menuItems.map((item, index) => (
          <Box key={index}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => onNavigate(item.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  color: '#2f3135ff',
                  '&:hover': {
                    backgroundColor: '#eff3f8ff',
                  },
                  ...(currentMenu === item.text && {
                    backgroundColor: '#ECF3FF',
                    color: '#465FFF',
                    '&:hover': {
                      backgroundColor: '#ECF3FF',
                    },
                  }),
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          </Box>
        ))}
      </List>
    </Box>
  );
}

function DashboardSidebar({ currentMenu, mobileOpen, onMobileClose }) {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
    if (onMobileClose) onMobileClose();
  };

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* 모바일 Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: '#ffffffff',
          },
        }}
      >
        <SidebarContent currentMenu={currentMenu} onNavigate={handleNavigate} />
      </Drawer>

      {/* 데스크탑 Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: '#ffffffff',
          },
        }}
        open
      >
        <SidebarContent currentMenu={currentMenu} onNavigate={handleNavigate} />
      </Drawer>
    </Box>
  );
}

export default DashboardSidebar;
