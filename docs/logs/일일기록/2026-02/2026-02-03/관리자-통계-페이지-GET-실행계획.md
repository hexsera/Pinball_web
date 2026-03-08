# 관리자 통계 페이지 API 연동 실행계획

## 요구사항 요약

**요구사항**: 관리자 통계 페이지에서 API로 게임 플레이 기록 데이터를 받아와 일주일 단위로 집계하여 차트에 표시

**목적**:
- 실제 데이터베이스의 게임 플레이 기록을 시각화하여 관리자가 게임 활동을 모니터링할 수 있도록 함
- 날짜 범위를 지정하여 원하는 기간의 게임 플레이 통계를 확인할 수 있도록 함

## 현재상태 분석

- `AdminStatisticsMain.jsx`: 하드코딩된 8주간 임시 데이터로 차트 표시 중
- API 엔드포인트 미구현 상태 (향후 구현 예정)
- 날짜 범위 선택 UI 없음
- 일주일 단위 집계 로직 없음

## 구현 방법

**기술 스택**:
- axios: API GET 요청 전송
- React useState/useEffect: 상태 관리 및 데이터 로딩
- Material-UI DatePicker: 시작/종료 날짜 선택
- JavaScript reduce: 일주일 단위 데이터 집계

**API 스펙 (예상)**:
- 엔드포인트: `GET /api/v1/game-plays`
- 쿼리 파라미터: `start_date`, `end_date` (YYYY-MM-DD 형식)
- 응답: `[{ date: "2026-01-20", play_count: 150 }, ...]`

## 구현 단계

### 1. 상태 변수 및 날짜 선택 UI 추가

```javascript
import { useState, useEffect } from 'react';
import { Box, Typography, Toolbar, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';

function AdminStatisticsMain() {
  const [startDate, setStartDate] = useState(dayjs().subtract(8, 'week'));
  const [endDate, setEndDate] = useState(dayjs());
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ... (나머지 코드)
}
```
- **무엇을 하는가**: 날짜 범위 선택 및 데이터 저장을 위한 상태 변수 정의
- `startDate`, `endDate`: 사용자가 선택한 조회 기간 (기본값: 최근 8주)
- `weeklyData`: 일주일 단위로 집계된 데이터 배열
- `loading`: API 요청 중 로딩 상태 표시
- dayjs: 날짜 계산 및 포맷팅 라이브러리

### 2. API 호출 및 데이터 로딩 함수

```javascript
const fetchStatistics = async () => {
  setLoading(true);
  try {
    // API가 구현되면 실제 엔드포인트로 변경
    const response = await axios.get('/api/v1/game-plays', {
      params: {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD')
      }
    });

    // 예상 응답 구조: [{ date: "2026-01-20", play_count: 150 }, ...]
    const dailyData = response.data;
    const aggregated = aggregateByWeek(dailyData);
    setWeeklyData(aggregated);
  } catch (error) {
    console.error('통계 데이터 로딩 실패:', error);
    // API 미구현 시 임시 데이터 사용
    setWeeklyData([
      { week: 1, play_count: 320 },
      { week: 2, play_count: 450 },
      { week: 3, play_count: 380 },
      { week: 4, play_count: 520 },
      { week: 5, play_count: 600 },
      { week: 6, play_count: 470 },
      { week: 7, play_count: 560 },
      { week: 8, play_count: 610 }
    ]);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchStatistics();
}, [startDate, endDate]);
```
- **무엇을 하는가**: API에서 일별 게임 플레이 데이터를 가져와 일주일 단위로 집계
- axios GET 요청으로 시작/종료 날짜를 쿼리 파라미터로 전송 (인증 불필요)
- API 미구현 시 catch 블록에서 임시 데이터 사용
- useEffect로 날짜 변경 시 자동으로 데이터 재로딩

### 3. 일주일 단위 집계 함수

```javascript
const aggregateByWeek = (dailyData) => {
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
```
- **무엇을 하는가**: 일별 데이터를 7일씩 묶어서 주차별 게임 플레이 횟수 합계 계산
- `diff(startDate, 'day') / 7`로 시작일 기준 몇 번째 주인지 계산
- weekMap 객체로 같은 주의 플레이 횟수를 누적
- 마지막에 배열 형태로 변환하여 차트에 사용 가능한 형태로 반환

### 4. 날짜 선택 UI 렌더링

```javascript
return (
  <Box component="main" sx={{ /* ... */ }}>
    <Toolbar/>
    <Typography variant="h4" sx={{ mb: 3, color: '#1f2937' }}>
      통계
    </Typography>

    {/* 날짜 선택 영역 */}
    <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="시작 날짜"
          value={startDate}
          onChange={(newValue) => setStartDate(newValue)}
          renderInput={(params) => <TextField {...params} />}
        />
        <DatePicker
          label="종료 날짜"
          value={endDate}
          onChange={(newValue) => setEndDate(newValue)}
          renderInput={(params) => <TextField {...params} />}
        />
      </LocalizationProvider>
    </Box>

    {/* 차트 영역 */}
    <Box sx={{ backgroundColor: '#ffffff', /* ... */ }}>
      {/* ... */}
    </Box>
  </Box>
);
```
- **무엇을 하는가**: 사용자가 조회 기간을 선택할 수 있는 날짜 선택 UI 표시
- Material-UI DatePicker로 시작/종료 날짜 입력
- LocalizationProvider로 날짜 라이브러리 설정 (dayjs 사용)
- `gap: 2`로 두 DatePicker 사이 간격 설정

### 5. 차트 데이터 연동

```javascript
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
```
- **무엇을 하는가**: 집계된 일주일 단위 데이터를 차트에 표시
- `weeklyData.map()`으로 주차 번호와 게임 플레이 횟수를 분리하여 차트 데이터 생성
- `loading` prop으로 데이터 로딩 중 스피너 표시
- 기존 하드코딩된 데이터 대신 상태 변수 사용

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `/home/hexsera/Pinball_web/react/main/src/admin/AdminStatisticsMain.jsx` | 수정 | useState, useEffect 추가, API 호출 로직 구현, 일주일 집계 함수 추가, 날짜 선택 UI 추가 |
| `/home/hexsera/Pinball_web/react/main/package.json` | 수정 | dayjs, @mui/x-date-pickers 의존성 추가 (필요시) |

## 완료 체크리스트

- [ ] 날짜 선택 UI가 화면에 표시되는가
- [ ] 시작/종료 날짜를 변경하면 API 호출이 발생하는가 (콘솔 로그로 확인)
- [ ] API 미구현 상태에서 임시 데이터가 차트에 표시되는가
- [ ] 일주일 단위 집계 함수가 올바르게 작동하는가 (테스트 데이터로 확인)
- [ ] 차트에 로딩 인디케이터가 표시되는가
- [ ] 에러 없이 페이지가 렌더링되는가
