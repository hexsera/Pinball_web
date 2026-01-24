import { Box, Drawer, CardMedia } from '@mui/material';

const drawerWidth = 260;

function AdminSidebar() {
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
        <Box sx={{ width: '100%', height: '100vh' }}>
          <CardMedia
            component="img"
            image="/images/admin_sid_temp.png"
            alt="Admin Sidebar Temp"
            sx={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>
      </Drawer>
    </Box>
  );
}

export default AdminSidebar;
