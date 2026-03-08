# 메인화면 UI 변경2 실행계획

## 요구사항 요약

**요구사항**:
1. 화면이 작을 때(모바일) 헤더의 "HEXSERA PINBALL" 텍스트를 숨긴다.
2. 헤더의 "게임하기" 버튼을 `variant="contained"`로 변경하고, 위치를 오른쪽 영역(HeaderUserInfo 옆)에서 왼쪽 영역(타이틀 오른쪽)으로 이동한다.

**목적**: 모바일에서 헤더 공간을 확보하고, "게임하기" 버튼을 주요 액션으로 시각적으로 강조한다.

## 현재상태 분석

- `Toolbar`는 `justifyContent: 'space-between'`으로 좌(타이틀)·우(버튼 영역)로 나뉜다.
- 좌측: `Typography`("HEXSERA PINBALL") — 모바일 숨김 처리 없음.
- 우측 `Box`: "게임하기"(`Button`, `variant` 없음 = text 스타일) + `HeaderUserInfo`.
- "게임하기"는 현재 우측 박스에 있으며 `color: COLORS.text` 스타일만 적용되어 있다.

## 구현 방법

- MUI `sx` prop의 반응형 객체 문법(`{ xs: ..., md: ... }`)만 사용한다.
- `Typography`에 `display: { xs: 'none', md: 'block' }`을 추가해 모바일에서 숨긴다.
- "게임하기" 버튼을 우측 `Box`에서 분리하여 좌측 `Box`(타이틀과 같은 영역)로 이동하고 `variant="contained"` 적용한다.
- `Toolbar` 좌측을 `Box`로 감싸 타이틀과 버튼을 나란히 배치한다.

## 구현 단계

### 1. HomePage.jsx — Toolbar 좌측 Box로 감싸기 + 타이틀 숨김 처리

```jsx
<Toolbar sx={{ justifyContent: 'space-between' }}>
  {/* 좌측: 타이틀 + 게임하기 버튼 */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Typography
      variant="h6"
      sx={{
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: { xs: '0.9rem', md: '1.25rem' },
        display: { xs: 'none', md: 'block' },
      }}
    >
      HEXSERA PINBALL
    </Typography>
    <Button
      variant="contained"
      onClick={() => navigate('/pinball')}
      sx={{ backgroundColor: COLORS.primary, color: COLORS.text }}
    >
      게임하기
    </Button>
  </Box>
  {/* 우측: HeaderUserInfo */}
  <HeaderUserInfo
    buttonColor={COLORS.primary}
    buttonTextColor={COLORS.text}
    outlinedBorderColor={COLORS.text}
  />
</Toolbar>
```
- **무엇을 하는가**: Toolbar를 좌측 Box(타이틀+게임하기)와 우측 HeaderUserInfo로 재구성한다.
- `display: { xs: 'none', md: 'block' }`: 모바일(xs)에서 타이틀 Typography를 DOM에서 숨긴다.
- `variant="contained"` + `backgroundColor: COLORS.primary`: 게임하기 버튼을 채워진 인디고색 버튼으로 변경한다.
- 기존 우측 `Box` 래퍼를 제거하고 `HeaderUserInfo`를 Toolbar 직속 자식으로 올린다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/HomePage/HomePage.jsx` | 수정 | Toolbar 구조 개편, 타이틀 모바일 숨김, 게임하기 버튼 이동 및 스타일 변경 |

## 완료 체크리스트

- [ ] 데스크탑에서 "HEXSERA PINBALL" 텍스트가 헤더 좌측에 표시된다.
- [ ] 모바일(600px 이하)에서 "HEXSERA PINBALL" 텍스트가 보이지 않는다.
- [ ] "게임하기" 버튼이 헤더 좌측에서 타이틀 오른쪽에 위치한다.
- [ ] "게임하기" 버튼이 `contained` 스타일(채워진 인디고색)로 표시된다.
- [ ] 로그인/회원가입 버튼(HeaderUserInfo)이 헤더 우측에 유지된다.
- [ ] 브라우저 콘솔에 에러가 없다.
