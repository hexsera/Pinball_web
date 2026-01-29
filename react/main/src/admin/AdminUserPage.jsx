import { Box } from '@mui/material';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminUserMain from './AdminUserMain';

function AdminUserPage() {
  return (
    <Box sx={{ display: 'flex' }}>
      <AdminHeader />
      <AdminSidebar />
      <AdminUserMain />
    </Box>
  );
}

export default AdminUserPage;
