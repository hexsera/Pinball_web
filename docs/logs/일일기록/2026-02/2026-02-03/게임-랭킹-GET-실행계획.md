# 게임 랭킹 GET 실행계획

## 요구사항 요약

**요구사항**: Dashboard.jsx의 월간 랭킹 데이터를 FastAPI GET /api/v1/monthly-scores를 사용하여 실시간 데이터로 갱신

**목적**: 현재 하드코딩된 임시 데이터(monthlyRankingData)를 실제 데이터베이스에서 가져온 데이터로 대체하여 실시간 랭킹 표시

## 현재상태 분석

**Dashboard.jsx**:
- 238-251번째 줄: `monthlyRankingData` 배열에 하드코딩된 임시 랭킹 데이터 10개 사용
- 302-321번째 줄: Table 컴포넌트로 랭킹 데이터 표시 (순위, 닉네임, 점수)
- API 연동 없음, 정적 데이터만 표시

**Backend API (main.py)**:
- 603-615번째 줄: GET /api/v1/monthly-scores 엔드포인트 구현됨
- MonthlyScoreListResponse 스키마 사용 (scores 배열, total 개수)
- score 내림차순 정렬로 반환
- MonthlyScore 모델: user_id, score, created_at 필드 포함
- **현재 상태**: 응답에 nickname이 없음, user_id만 포함

## 구현 방법

1. **Frontend 수정**: Dashboard.jsx에 useEffect 훅 추가하여 컴포넌트 마운트 시 API 호출
2. **닉네임 임시 처리**: 현재는 "testnickname"으로 표시 (추후 API에서 nickname 제공 예정)
3. **상태 관리**: useState로 랭킹 데이터 상태 관리
4. **에러 처리**: API 호출 실패 시 에러 핸들링
5. **UI 개선**: 데이터 로딩 중 표시 및 overflow 처리

## 구현 단계

### 1. Dashboard.jsx 상태 관리 추가

```javascript
import axios from 'axios';

function Maindashboard() {
  // 기존 상태들...
  const [monthlyRankingData, setMonthlyRankingData] = useState([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);
  const [rankingError, setRankingError] = useState(null);

  // ... (나머지 코드)
}
```
- **monthlyRankingData 상태**: 빈 배열로 초기화 (API 응답으로 채워짐)
- **isLoadingRanking 상태**: 로딩 상태 관리 (true로 시작)
- **rankingError 상태**: 에러 메시지 저장

### 2. useEffect로 API 호출 구현

```javascript
useEffect(() => {
  const fetchMonthlyRanking = async () => {
    try {
      setIsLoadingRanking(true);

      // 월간 점수 목록 조회
      const response = await axios.get('/api/v1/monthly-scores');
      const scores = response.data.scores;

      // 응답 데이터를 rank와 임시 nickname 추가하여 변환
      const rankingData = scores.slice(0, 10).map((score, index) => ({
        rank: index + 1,
        nickname: 'testnickname',  // 임시 닉네임 (추후 API에서 제공 예정)
        score: score.score
      }));

      setMonthlyRankingData(rankingData);
      setRankingError(null);
    } catch (error) {
      console.error('월간 랭킹 조회 실패:', error);
      setRankingError('랭킹 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingRanking(false);
    }
  };

  fetchMonthlyRanking();
}, []); // 컴포넌트 마운트 시 한 번만 실행
```
- **GET /api/v1/monthly-scores 호출**: 전체 점수 목록 조회
- **TOP 10 선택**: scores.slice(0, 10)으로 상위 10개만 선택
- **rank 필드 추가**: index+1로 순위 추가
- **임시 nickname**: 현재는 "testnickname"으로 고정 (추후 API 수정 시 변경)
- **에러 핸들링**: catch 블록에서 에러 상태 업데이트
- **로딩 상태 관리**: finally에서 로딩 완료 표시

### 3. 테이블 UI 수정 (로딩/에러 처리 및 overflow)

```javascript
<Paper
    sx={{
        p: 3,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e5e7eb',
        maxHeight: 500,  // 최대 높이 제한
    }}
>
    <Typography variant="h6" fontWeight={600} gutterBottom>
        한달 랭킹 TOP 10
    </Typography>
    {isLoadingRanking ? (
        <Typography sx={{ py: 3, textAlign: 'center' }}>
            로딩 중...
        </Typography>
    ) : rankingError ? (
        <Typography sx={{ py: 3, textAlign: 'center', color: 'error.main' }}>
            {rankingError}
        </Typography>
    ) : (
        <TableContainer sx={{
            maxHeight: 400,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
                width: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#d1d5db',
            },
        }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}>순위</TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}>닉네임</TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }} align="right">점수</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {monthlyRankingData.map((row) => (
                        <TableRow key={row.rank}>
                            <TableCell>{row.rank}</TableCell>
                            <TableCell>{row.nickname}</TableCell>
                            <TableCell align="right">{row.score.toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )}
</Paper>
```
- **조건부 렌더링**: isLoadingRanking, rankingError 상태에 따라 다른 UI 표시
- **maxHeight 제한**: TableContainer에 maxHeight: 400 설정
- **overflow 처리**: overflow: 'auto'로 데이터가 넘치면 스크롤 표시
- **스크롤바 스타일링**: MUI 스타일로 웹킷 스크롤바 커스터마이징
- **stickyHeader**: Table에 stickyHeader prop 추가하여 헤더 고정
- **헤더 배경색**: TableCell에 backgroundColor 추가하여 스크롤 시 헤더 구분

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| /home/hexsera/Pinball_web/react/main/src/Dashboard.jsx | 수정 | useState 3개 추가, useEffect로 API 호출 구현 (월간 점수 조회), 테이블 UI 수정 (로딩/에러/overflow 처리), nickname은 임시로 "testnickname" 사용 |

## 완료 체크리스트

- [ ] Frontend: 컴포넌트 마운트 시 GET /api/v1/monthly-scores API 호출 확인 (Network 탭)
- [ ] Frontend: 테이블에 실시간 랭킹 데이터 표시 확인 (순위, "testnickname", 점수)
- [ ] Frontend: 데이터가 10개 이상일 때 스크롤이 정상 작동하는지 확인
- [ ] Frontend: API 호출 실패 시 에러 메시지 표시 확인 (Backend 중단 후 테스트)
- [ ] Frontend: 로딩 중 "로딩 중..." 메시지 표시 확인
- [ ] 콘솔에 에러 없이 실행되는지 확인
