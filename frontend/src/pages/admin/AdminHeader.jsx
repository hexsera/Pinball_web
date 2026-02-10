import { AppBar, Toolbar, Box } from '@mui/material';
import HeaderUserInfo from '../../components/HeaderUserInfo';

const drawerWidth = 260;

function AdminHeader() {
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
      <Toolbar sx={{ justifyContent: 'flex-end' }}>
        <HeaderUserInfo />
      </Toolbar>
    </AppBar>
  );
}



export default AdminHeader;
