import { Box, Typography, Toolbar } from '@mui/material';

function AdminStatisticsMain() {
  const drawerWidth = 260;

  /* flexGrow: 1,
        p: 3,
        mt: 8,
        ml: { sm: '270px' },
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        backgroundColor: '#F9FAFB',
        minHeight: '100vh', */
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        backgroundColor: '#F9FAFB',
        minHeight: '100vh',
      }}
    >
      <Toolbar/>
      <Typography variant="h4" sx={{ mb: 3, color: '#1f2937' }}>
        통계
      </Typography>
      <Box sx={{
        backgroundColor: '#ffffff',
        borderRadius: 1,
        p: 3,
        border: '1px solid #e5e7eb'
      }}>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          통계 데이터가 여기에 표시됩니다.
        </Typography>
      </Box>
    </Box>
  );
}

export default AdminStatisticsMain;
