import { Box, Typography, Toolbar } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';

function AdminStatisticsMain() {
  const drawerWidth = 260;

  // 임시 데이터: 최근 8주간 방문자 수
  const visitData = {
    visitors: [320, 450, 380, 520, 600, 470, 560, 610],
  };

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
        <Typography variant="h6" sx={{ mb: 2, color: '#1f2937' }}>
          회원 방문 통계 (최근 8주)
        </Typography>
        <LineChart
          xAxis={[{
            data: [1, 2, 3, 4, 5, 6, 7, 8],
            scaleType: 'point',
            label: '주차'
          }]}
          series={[{
            data: visitData.visitors,
            label: '방문자 수',
            color: '#465FFF',
            showMark: true,
          }]}
          width={800}
          height={400}
        />
      </Box>
    </Box>
  );
}

export default AdminStatisticsMain;
