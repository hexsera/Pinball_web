import { Box } from '@mui/material';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminMain from './AdminMain';

function AdminPage() {
  return (
    <Box sx={{ display: 'flex' }}>
      <AdminHeader />
      <AdminSidebar />
      <AdminMain />
    </Box>
  );
}

export default AdminPage;
