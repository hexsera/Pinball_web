import { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material';
import { People, BarChart } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuItems = [
    { text: '회원관리', icon: <People />, path: '/admin' },
    { text: '통계', icon: <BarChart />, path: '/admin/statistics' },
  ];

  useEffect(() => {
    const currentIndex = menuItems.findIndex(item => item.path === location.pathname);
    if (currentIndex !== -1) {
      setSelectedIndex(currentIndex);
    }
  }, [location.pathname]);

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'block', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth + 10,
            backgroundColor: '#ffffffff',
            border: '1px solid #e5e7eb',
          },
        }}
        open
      >
        <Toolbar>
          <Typography>
            어드민 페이지
          </Typography>

        </Toolbar>
        <Box sx={{ width: '100%' }}>
          <List sx={{ px: 2 }}>
            {menuItems.map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setSelectedIndex(index);
                    navigate(item.path);
                  }}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    color: '#2f3135ff',
                    '&:hover': {
                      backgroundColor: '#eff3f8ff',
                    },
                    ...(selectedIndex === index && {
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
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}

export default AdminSidebar;
