import { Box } from '@mui/material';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminStatisticsMain from './AdminStatisticsMain';

function AdminStatisticsPage() {
  return (
    <Box sx={{ display: 'flex' }}>
      <AdminHeader />
      <AdminSidebar />
      <AdminStatisticsMain />
    </Box>
  );
}

export default AdminStatisticsPage;
