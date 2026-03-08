# Homepage 헤더 분리 실행계획

## 요구사항 요약

**요구사항**: `HomePage.jsx`의 `<AppBar>` 영역(네비게이션 바)을 독립된 재사용 가능한 컴포넌트로 분리한다.

**목적**: 헤더 UI 코드를 여러 페이지에서 재사용할 수 있도록 컴포넌트화하여 중복 코드를 제거하고 유지보수성을 높인다.

## 현재상태 분석

- `HomePage.jsx` (161줄) 내부에 `<AppBar>` ~ `</AppBar>` 블록(54~84줄)이 인라인으로 작성되어 있다.
- 헤더는 타이틀 `HEXSERA PINBALL`, 게임하기 버튼, `<HeaderUserInfo>` 컴포넌트로 구성된다.
- `HomePage.test.jsx`에 4개의 테스트가 있으며, **현재 모두 실패 중이다** (의도된 실패).

### HomePage 테스트 현황 (`src/test/HomePage.test.jsx`)

| # | 테스트명 | 결과 | 실패 원인 |
|---|---|---|---|
| 1 | 페이지 접속 시 GET /api/v1/monthly-scores 를 호출한다 | ❌ FAIL | `HeaderUserInfo`가 `useAuth()` 호출 시 `AuthContext.Provider` 없어 `undefined` destructuring 오류 |
| 2 | API 응답의 닉네임이 랭킹 테이블에 표시된다 | ❌ FAIL | 동일 |
| 3 | 최대 10위까지만 표시된다 | ❌ FAIL | 동일 |
| 4 | API 호출 실패 시 에러 메시지를 표시한다 | ❌ FAIL | 동일 |

> **테스트 실패는 의도된 것으로 수정하지 않는다.**

## 구현 방법

- `HomePage.jsx`의 AppBar 블록을 잘라내어 새 파일 `HomeHeader.jsx`로 만든다.
- `HomeHeader`는 `COLORS`, `navigate` 등 필요한 것을 내부에서 처리하고, props로 외부 데이터를 받지 않는다.
- `HomePage.jsx`에서는 `<HomeHeader />`를 import하여 대체한다.
- `components/` 디렉토리에 배치하여 다른 페이지에서도 재사용 가능하게 한다.

## 구현 단계

### 1. `HomeHeader.jsx` 컴포넌트 생성

```jsx
// frontend/src/components/HomeHeader.jsx
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import HeaderUserInfo from './HeaderUserInfo';

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  text: '#F1F5F9',
  primary: '#4F46E5',
};

function HomeHeader() {
  const navigate = useNavigate();

  return (
    <AppBar position="static" sx={{ backgroundColor: COLORS.card, borderBottom: `1px solid ${COLORS.border}` }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h6"
            sx={{ color: COLORS.text, fontWeight: 'bold', fontSize: { xs: '0.9rem', sm: '1.25rem' }, display: { xs: 'none', sm: 'block' } }}
          >
            HEXSERA PINBALL
          </Typography>
          <Button variant="contained" onClick={() => navigate('/pinball')} sx={{ backgroundColor: COLORS.primary, color: COLORS.text }}>
            게임하기
          </Button>
        </Box>
        <HeaderUserInfo buttonColor={COLORS.primary} buttonTextColor={COLORS.text} outlinedBorderColor={COLORS.text} />
      </Toolbar>
    </AppBar>
  );
}

export default HomeHeader;
```

- **무엇을 하는가**: `HomePage.jsx` 54~84줄의 AppBar 블록을 독립 컴포넌트로 추출
- `COLORS`를 컴포넌트 내부에서 정의하여 외부 의존성 없이 독립적으로 동작
- props 없이 자체적으로 navigate와 색상을 처리

### 2. `HomePage.jsx`에서 헤더 교체

```jsx
// frontend/src/pages/HomePage/HomePage.jsx
import HomeHeader from '../../components/HomeHeader'; // 추가

// 기존 AppBar ~ /AppBar 블록 삭제 후 아래로 교체
<HomeHeader />
```

- **무엇을 하는가**: 인라인 AppBar 블록(31줄)을 `<HomeHeader />` 한 줄로 대체
- `AppBar`, `Toolbar`, `Typography` import에서 불필요해진 항목 제거
- `HeaderUserInfo` import도 `HomePage.jsx`에서 제거 (HomeHeader 내부로 이동)

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/components/HomeHeader.jsx` | 생성 | AppBar 헤더 컴포넌트 신규 생성 |
| `frontend/src/pages/HomePage/HomePage.jsx` | 수정 | AppBar 블록 제거, `<HomeHeader />` import 및 사용 |

## 완료 체크리스트

- [ ] `frontend/src/components/HomeHeader.jsx` 파일이 생성되어 있다.
- [ ] `HomePage.jsx`에서 AppBar 관련 JSX가 제거되고 `<HomeHeader />`로 대체되어 있다.
- [ ] 브라우저에서 홈페이지(/) 접속 시 헤더(로고, 게임하기 버튼, 로그인/회원가입 버튼)가 정상 표시된다.
- [ ] 다른 페이지(Dashboard 등)에서 `HomeHeader`를 import하여 사용할 수 있다.
- [ ] `npm run build` 빌드 오류가 없다.
