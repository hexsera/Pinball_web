# 홈페이지 월간 랭킹 React Query 적용 실행계획

## 요구사항 요약

**요구사항**: HomePage의 월간 랭킹 fetch를 React Query로 교체하고 `isPending`, `staleTime`, `refetchInterval`을 적용한다.

**목적**: 로딩 상태 표시, 캐시로 재방문 시 재요청 생략, 주기적 자동 갱신 동작을 체감하고 학습한다.

## 현재상태 분석

- `useEffect` + `useState` + `axios`로 직접 fetch
- 로딩 상태 없음 — 데이터 오기 전 랭킹 테이블이 빈 채로 보임
- React Query 미설치 (`@tanstack/react-query` 없음)
- `QueryClientProvider`로 앱을 감싸는 설정 없음

## 구현 방법

`@tanstack/react-query`를 설치하고, `QueryClientProvider`로 앱 최상단을 감싼다. `HomePage`에서 `useQuery`로 월간 점수 API를 호출하고 `isPending`, `staleTime`, `refetchInterval`을 설정한다.

## 구현 단계

### 1. React Query 패키지 설치

```bash
source ~/.nvm/nvm.sh && cd frontend && npm install @tanstack/react-query
```

- `@tanstack/react-query` v5가 설치됨
- React Query DevTools도 필요하면 `@tanstack/react-query-devtools`로 추가 가능

### 2. QueryClientProvider로 앱 감싸기

```jsx
// frontend/src/main.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

- `QueryClient`는 캐시 저장소 역할을 하는 객체
- 앱 전체를 `QueryClientProvider`로 감싸야 모든 컴포넌트에서 `useQuery` 사용 가능
- `queryClient` 인스턴스는 한 번만 생성

### 3. HomePage에서 useQuery 적용

```jsx
// frontend/src/pages/HomePage/HomePage.jsx
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const { data, isPending, isError } = useQuery({
  queryKey: ['monthly-scores'],
  queryFn: () => axios.get('/api/v1/monthly-scores').then(res => res.data.scores.slice(0, 10)),
  staleTime: 1000 * 60 * 2,      // 2분간 캐시 신선 유지
  refetchInterval: 1000 * 30,    // 30초마다 자동 재요청
});
```

- `queryKey`: 캐시 식별자. `['monthly-scores']`로 설정
- `staleTime`: 2분 동안 캐시를 신선하다고 보고 재요청 안 함
- `refetchInterval`: 30초마다 자동으로 API 재요청 — Network 탭에서 동작 확인 가능
- 기존 `useEffect`, `useState(ranking)`, `useState(rankingError)` 제거

### 4. isPending / isError로 UI 분기 처리

```jsx
{isPending ? (
  <Typography sx={{ color: COLORS.subText }}>랭킹을 불러오는 중...</Typography>
) : isError ? (
  <Typography sx={{ color: COLORS.subText }}>랭킹을 불러올 수 없습니다.</Typography>
) : (
  <TableContainer>
    {/* 기존 테이블 코드, ranking → data로 변수명만 변경 */}
  </TableContainer>
)}
```

- `isPending`: 최초 fetch 중일 때 `true`
- `isError`: 요청 실패 시 `true`
- 기존 `rankingError` state 제거, `ranking` → `data`로 교체

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/package.json` | 수정 | `@tanstack/react-query` 의존성 추가 |
| `frontend/src/main.jsx` | 수정 | `QueryClientProvider`로 앱 감싸기 |
| `frontend/src/pages/HomePage/HomePage.jsx` | 수정 | `useQuery` 적용, `useEffect`/`useState` 제거 |

## 완료 체크리스트

- [ ] 홈페이지 접속 시 랭킹 로딩 중 텍스트가 보인다
- [ ] 랭킹 데이터가 정상적으로 표시된다
- [ ] 홈페이지를 나갔다 2분 안에 돌아오면 Network 탭에 재요청이 없다
- [ ] Network 탭에서 30초마다 `/api/v1/monthly-scores` 요청이 자동으로 발생한다
- [ ] API 실패 시 "랭킹을 불러올 수 없습니다" 문구가 표시된다
