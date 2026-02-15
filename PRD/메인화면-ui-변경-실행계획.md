# 메인화면 UI 변경 실행계획

## 요구사항 요약

**요구사항**:
1. `HomePage.jsx`의 로그인/회원가입 버튼을 `HeaderUserInfo.jsx`로 대체한다.
2. 모바일 환경에서 헤더 레이아웃을 개선한다: 타이틀 폰트 축소, "게임하기" 버튼 숨김, 소개 문구 줄바꿈 적용, Hero 섹션 상단 여백 축소.

**목적**: 인증 상태에 따른 헤더 UI 일관성 확보 및 모바일 가독성 개선.

## 현재상태 분석

- `HomePage.jsx` AppBar에는 "게임하기", "로그인", "회원가입" 버튼이 하드코딩되어 있다.
- `HeaderUserInfo.jsx`는 로그인 여부에 따라 버튼(비로그인) 또는 아이콘+아바타 메뉴(로그인)를 렌더링한다.
- `HeaderUserInfo.jsx`의 비로그인 버튼 색상은 MUI 기본값(파란색 계열)이며, `HomePage.jsx`는 COLORS 객체의 커스텀 색상을 사용한다.
- 모바일 반응형 처리가 현재 전혀 없다.

## 구현 방법

- MUI `sx` prop의 반응형 객체 문법(`{ xs: ..., md: ... }`)만 사용한다. `useMediaQuery`, `useTheme` 훅은 사용하지 않는다.
- `HeaderUserInfo.jsx`에 `buttonColor`, `buttonTextColor`, `outlinedBorderColor` props를 추가하여 색상을 외부에서 주입한다. 기존 사용처는 기본값으로 동작하므로 변경 없다.
- `HomePage.jsx`의 기존 버튼 3개를 제거하고 `<HeaderUserInfo>`로 교체한다.

## 구현 단계

### 1. HeaderUserInfo.jsx — 색상 props 추가

```jsx
function HeaderUserInfo({ buttonColor, buttonTextColor, outlinedBorderColor }) {
  // ...기존 코드...
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isLoggedIn ? (
        // ...기존 로그인 상태 코드 유지...
      ) : (
        <>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={buttonColor ? { backgroundColor: buttonColor, color: buttonTextColor } : {}}
          >
            로그인
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/Register')}
            sx={buttonColor ? { color: buttonTextColor, borderColor: outlinedBorderColor } : {}}
          >
            회원가입
          </Button>
        </>
      )}
    </Box>
  );
}
```
- **무엇을 하는가**: `HomePage`의 색상(indigo/white)을 props로 받아 버튼에 적용하고, props가 없으면 MUI 기본값을 유지한다.
- `buttonColor`: contained 버튼 배경색 (예: `#4F46E5`)
- `buttonTextColor`: 버튼 텍스트 색 (예: `#F1F5F9`)
- `outlinedBorderColor`: outlined 버튼 테두리/텍스트 색 (예: `#F1F5F9`)

### 2. HomePage.jsx — HeaderUserInfo import 추가

```jsx
import HeaderUserInfo from '../../components/HeaderUserInfo';
```
- **무엇을 하는가**: 기존 import 목록에 `HeaderUserInfo` 컴포넌트를 추가한다.
- `useTheme`, `useMediaQuery`는 추가하지 않는다.

### 3. HomePage.jsx — AppBar 내부 교체

```jsx
<Toolbar sx={{ justifyContent: 'space-between' }}>
  <Typography
    variant="h6"
    sx={{ color: COLORS.text, fontWeight: 'bold', fontSize: { xs: '0.9rem', md: '1.25rem' } }}
  >
    🎯 HEXSERA PINBALL
  </Typography>
  <Box sx={{ display: 'flex', alignItems: 'center' }}>
    <Button
      onClick={() => navigate('/pinball')}
      sx={{ color: COLORS.text, display: { xs: 'none', md: 'inline-flex' } }}
    >
      게임하기
    </Button>
    <HeaderUserInfo
      buttonColor={COLORS.primary}
      buttonTextColor={COLORS.text}
      outlinedBorderColor={COLORS.text}
    />
  </Box>
</Toolbar>
```
- **무엇을 하는가**: 기존 로그인/회원가입 버튼을 `HeaderUserInfo`로 대체하고, `sx`의 반응형 값으로 타이틀 폰트 크기를 조정하며 "게임하기" 버튼을 모바일에서 숨긴다.
- `fontSize: { xs: '0.9rem', md: '1.25rem' }`: 모바일에서 폰트를 축소한다.
- `display: { xs: 'none', md: 'inline-flex' }`: 모바일(xs)에서 요소를 렌더링하되 보이지 않게 한다.

### 4. HomePage.jsx — Hero 섹션 모바일 반응형 적용

```jsx
<Grid container spacing={4} sx={{ mt: { xs: 8, md: 16 } }}>
  <Grid size={{ xs: 12, md: 8 }}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: { md: 6 } }}>
      <Typography variant="h3" sx={{ color: COLORS.text, fontWeight: 'bold' }}>
        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
          세상에서 가장 짜릿한<br />핀볼 게임을 경험하세요.
        </Box>
        <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
          세상에서<br />가장 짜릿한<br />핀볼게임을<br />체험하세요
        </Box>
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => navigate('/pinball')}
        sx={{ backgroundColor: COLORS.primary, width: 'fit-content', px: 4, py: 1.5,
              display: { xs: 'none', md: 'inline-flex' } }}
      >
        ▶ 지금 바로 플레이하기
      </Button>
    </Box>
  </Grid>
```
- **무엇을 하는가**: JS 조건 분기 없이 두 가지 문구를 모두 렌더링하고, `display` sx로 화면 크기에 따라 보이는 텍스트를 전환한다.
- `mt: { xs: 8, md: 16 }`: 모바일에서 Hero 상단 여백을 줄인다.
- `display: { xs: 'none', md: 'inline-flex' }`: CTA 버튼을 모바일에서 숨긴다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/components/HeaderUserInfo.jsx` | 수정 | 비로그인 버튼에 색상 props 추가 (기본값 유지) |
| `frontend/src/pages/HomePage/HomePage.jsx` | 수정 | `HeaderUserInfo` import 추가, AppBar 버튼 교체, `sx` 반응형으로 Hero 처리 |

## 완료 체크리스트

- [ ] 비로그인 상태로 홈 접속 시 AppBar에 "로그인", "회원가입" 버튼이 COLORS 스타일(남색/흰 테두리)로 표시된다.
- [ ] 로그인 상태로 홈 접속 시 AppBar에 아이콘 및 아바타 메뉴가 표시된다.
- [ ] 다른 페이지(Dashboard 등)의 HeaderUserInfo 스타일이 변경 전과 동일하다.
- [ ] 모바일(600px 이하)에서 "HEXSERA PINBALL" 폰트가 축소된다.
- [ ] 모바일에서 AppBar의 "게임하기" 버튼이 보이지 않는다.
- [ ] 모바일에서 소개 문구가 4줄로 줄바꿈되어 표시된다.
- [ ] 모바일에서 Hero 섹션 상단 여백이 데스크탑보다 좁다(mt:8 vs mt:16).
- [ ] 모바일에서 Hero CTA 버튼("▶ 지금 바로 플레이하기")이 보이지 않는다.
- [ ] 브라우저 콘솔에 에러가 없다.
