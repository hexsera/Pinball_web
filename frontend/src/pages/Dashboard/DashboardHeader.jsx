import { Box, AppBar, Toolbar, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import HeaderUserInfo from '../../components/HeaderUserInfo';

const drawerWidth = 260;

function DashboardHeader({ onMobileToggle }) {
  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        backgroundColor: '#ffffffff',
        color: '#1f2937',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMobileToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
        <HeaderUserInfo />
      </Toolbar>
    </AppBar>
  );
}

export default DashboardHeader;
