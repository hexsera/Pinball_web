# 어드민 통계 API 수정 실행계획

## 요구사항 요약

**요구사항**: `AdminStatisticsMain.jsx`의 API 호출 주소를 확인하고, Mock 데이터 관련 코드를 제거한다.

**목적**: 실제 백엔드 API와 정상 연동하여 실제 통계 데이터를 표시한다.

## 현재상태 분석

- API 호출 주소: `GET /api/v1/game_visits/` — 백엔드 라우터는 `""` (trailing slash 없음)로 등록되어 있어 **주소 불일치** 발생 가능
- API 응답 구조: `{ stats: [...], total_days, start_date, end_date }` (백엔드 `DailyVisitStatsResponse`)
- 차트 데이터 키: `item.user_count` — 백엔드 `DailyVisitStats`의 `user_count` 필드와 일치
- Mock 데이터 코드: `generateMockDailyData()` 함수와 `catch` 블록 내 Mock 데이터 생성 로직이 존재

## 구현 방법

- API 경로에서 trailing slash 제거 (`/api/v1/game_visits/` → `/api/v1/game_visits`)
- `generateMockDailyData()` 함수 전체 제거
- `catch` 블록에서 Mock 데이터 생성 로직 제거, 에러 로그만 유지
- `setDailyData(dailyDataFromAPI.stats)` 호출은 이미 올바르므로 유지

## 구현 단계

### 1. API 호출 주소 수정

```javascript
const response = await axios.get('/api/v1/game_visits', {
  params: {
    start_date: startDate.format('YYYY-MM-DD'),
    end_date: endDate.format('YYYY-MM-DD')
  }
});
```
- **무엇을 하는가**: trailing slash를 제거하여 CLAUDE.md의 `redirect_slashes=False` 설정에 맞게 307 리다이렉트 방지
- 백엔드 라우터가 `""` 경로로 등록되어 있어 슬래시 포함 시 307 리다이렉트 후 GET 요청이 손실될 수 있음

### 2. Mock 데이터 생성 함수 제거

```javascript
// 삭제 대상: generateMockDailyData 함수 전체 (15~33번째 줄)
// const generateMockDailyData = (startDate, endDate) => { ... };
```
- **무엇을 하는가**: 개발용 임시 함수를 제거하여 실제 API만 사용하도록 변경
- 이 함수는 API 미구현 시 랜덤 더미 데이터를 반환하던 코드로, 이제 불필요

### 3. catch 블록 Mock 데이터 로직 제거

```javascript
} catch (error) {
  console.error('통계 데이터 로딩 실패:', error);
} finally {
  setLoading(false);
}
```
- **무엇을 하는가**: API 실패 시 Mock 데이터로 대체하던 로직을 제거하고 에러 로그만 남김
- 기존 catch 블록의 `generateMockDailyData()` 호출 및 `setDailyData(mockDailyData)` 제거

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/admin/AdminStatisticsMain.jsx` | 수정 | API 경로 trailing slash 제거, Mock 함수 및 Mock 로직 삭제 |

## 완료 체크리스트

- [ ] `/api/v1/game_visits` (trailing slash 없음)로 API 요청이 전송되는지 브라우저 네트워크 탭에서 확인
- [ ] 307 리다이렉트 없이 200 응답을 받는지 확인
- [ ] 차트에 실제 DB 데이터가 표시되는지 확인
- [ ] `generateMockDailyData` 함수가 파일에 존재하지 않는지 확인
- [ ] catch 블록에 Mock 데이터 생성 코드가 없는지 확인
- [ ] API 오류 발생 시 콘솔에 에러 로그가 출력되는지 확인
