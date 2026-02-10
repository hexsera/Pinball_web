import { useState, useEffect } from 'react';
import { Box, Typography, Toolbar } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import dayjs from 'dayjs';
import axios from 'axios';

function AdminStatisticsMain() {
  const drawerWidth = 260;

  // 상태 변수
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 임시 일별 데이터 생성 함수 (3개월 분량)
  const generateMockDailyData = (startDate, endDate) => {
    const dailyData = [];
    let currentDate = dayjs(startDate);
    const end = dayjs(endDate);

    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
      // 랜덤한 게임 플레이 횟수 생성 (10~100 사이)
      const playCount = Math.floor(Math.random() * 91) + 10;

      dailyData.push({
        date: currentDate.format('YYYY-MM-DD'),
        play_count: playCount
      });

      currentDate = currentDate.add(1, 'day');
    }

    return dailyData;
  };

  // API 호출 및 데이터 로딩 함수
  const fetchStatistics = async () => {
    setLoading(true);

    // 오늘부터 2주 전 날짜 계산
    const endDate = dayjs();
    const startDate = dayjs().subtract(2, 'week');

    try {
      console.log('통계 데이터 로딩 시작:', {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD')
      });

      // API가 구현되면 실제 엔드포인트로 변경
      const response = await axios.get('/api/v1/game_visits/', {
        params: {
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD')
        }
      });

      console.log('API 응답:', response.data);

      // 일별 데이터를 그대로 사용 (집계 없이)
      const dailyDataFromAPI = response.data;

      // 날짜 오름차순 정렬 (2주 전 → 오늘)
      /* const sortedData = dailyDataFromAPI.sort((a, b) =>
        dayjs(a.date).isAfter(dayjs(b.date)) ? 1 : -1
      ); */

      setDailyData(dailyDataFromAPI.stats);
    } catch (error) {
      console.error('통계 데이터 로딩 실패:', error);

      // API 미구현 시 임시 일별 데이터 생성 (2주 분량)
      const mockStartDate = dayjs().subtract(2, 'week');
      const mockEndDate = dayjs();
      const mockDailyData = generateMockDailyData(mockStartDate, mockEndDate);

      console.log('임시 일별 데이터 생성:', mockDailyData.length + '일 분량');
      console.log('첫 5개 데이터:', mockDailyData.slice(0, 5));

      // 집계 없이 바로 사용
      setDailyData(mockDailyData);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로딩
  useEffect(() => {
    fetchStatistics();
  }, []);

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

      {/* 차트 영역 */}
      <Box sx={{
        backgroundColor: '#ffffff',
        borderRadius: 1,
        p: 3,
        border: '1px solid #e5e7eb'
      }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#1f2937' }}>
          게임 플레이 통계 (최근 2주)
        </Typography>
        <LineChart
          xAxis={[{
            data: dailyData.map(item => dayjs(item.date).format('MM-DD')),
            scaleType: 'point',
            label: '날짜'
          }]}
          series={[{
            data: dailyData.map(item => item.user_count),
            label: '게임 플레이 횟수',
            color: '#465FFF',
            showMark: true,
          }]}
          
          height={400}
          loading={loading}
        />
      </Box>
    </Box>
  );
}

export default AdminStatisticsMain;
