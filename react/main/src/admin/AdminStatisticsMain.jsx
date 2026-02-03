import { useState, useEffect } from 'react';
import { Box, Typography, Toolbar } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import dayjs from 'dayjs';
import axios from 'axios';

function AdminStatisticsMain() {
  const drawerWidth = 260;

  // 상태 변수
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 일주일 단위 집계 함수
  const aggregateByWeek = (dailyData, startDate) => {
    // dailyData: [{ date: "2026-01-20", play_count: 150 }, ...]
    const weekMap = {};

    dailyData.forEach(item => {
      const date = dayjs(item.date);
      // 해당 날짜가 시작일로부터 몇 번째 주인지 계산
      const weekNumber = Math.floor(date.diff(startDate, 'day') / 7) + 1;

      if (!weekMap[weekNumber]) {
        weekMap[weekNumber] = 0;
      }
      weekMap[weekNumber] += item.play_count;
    });

    // { 1: 500, 2: 450, ... } → [{ week: 1, play_count: 500 }, ...]
    return Object.keys(weekMap).map(week => ({
      week: parseInt(week),
      play_count: weekMap[week]
    })).sort((a, b) => a.week - b.week);
  };

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

    // 오늘부터 8주 전 날짜 계산
    const endDate = dayjs();
    const startDate = dayjs().subtract(8, 'week');

    try {
      console.log('통계 데이터 로딩 시작:', {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD')
      });

      // API가 구현되면 실제 엔드포인트로 변경
      const response = await axios.get('/api/v1/game-plays', {
        params: {
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD')
        }
      });

      console.log('API 응답:', response.data);

      // 예상 응답 구조: [{ date: "2026-01-20", play_count: 150 }, ...]
      const dailyData = response.data;
      const aggregated = aggregateByWeek(dailyData, startDate);
      setWeeklyData(aggregated);
    } catch (error) {
      console.error('통계 데이터 로딩 실패:', error);

      // API 미구현 시 임시 일별 데이터 생성 (3개월 분량)
      const mockStartDate = dayjs().subtract(12, 'week'); // 3개월 (약 12주)
      const mockEndDate = dayjs();
      const mockDailyData = generateMockDailyData(mockStartDate, mockEndDate);

      console.log('임시 일별 데이터 생성:', mockDailyData.length + '일 분량');
      console.log('첫 5개 데이터:', mockDailyData.slice(0, 5));

      // 일주일 단위 집계 함수 테스트
      const aggregated = aggregateByWeek(mockDailyData, mockStartDate);
      console.log('집계된 주차별 데이터:', aggregated);

      setWeeklyData(aggregated);
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
          게임 플레이 통계 (최근 8주)
        </Typography>
        <LineChart
          xAxis={[{
            data: weeklyData.map(item => item.week),
            scaleType: 'point',
            label: '주차'
          }]}
          series={[{
            data: weeklyData.map(item => item.play_count),
            label: '게임 플레이 횟수',
            color: '#465FFF',
            showMark: true,
          }]}
          width={800}
          height={400}
          loading={loading}
        />
      </Box>
    </Box>
  );
}

export default AdminStatisticsMain;
