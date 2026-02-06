# 핀볼 목숨 하트 아이콘 UI 실행계획

## 요구사항 요약

**요구사항**: 핀볼게임의 "LIVES: {숫자}" 텍스트를 제거하고, 남은 목숨 수만큼 하트 아이콘을 가로로 나열하는 UI로 교체

**목적**: 텍스트 기반 목숨 표시를 시각적 아이콘으로 변경하여 게임 UI의 직관성을 향상

## 현재상태 분석

- `frontend/src/Pinball.jsx` Line 650-656에 `<Typography>LIVES: {lives}</Typography>`로 텍스트 표시 중
- `lives` 상태값(useState(3))에 따라 숫자가 변동됨
- 상단 UI 영역(700px × 100px, 검정 배경)의 좌측에 위치, 우측에는 음악 토글 아이콘 배치
- `@mui/icons-material` 패키지가 이미 설치되어 있어 FavoriteIcon 사용 가능

## 구현 방법

- MUI의 `FavoriteIcon` (채워진 하트 아이콘)을 import하여 사용
- `Array.from({ length: lives })`로 lives 상태값만큼 하트 아이콘을 동적 렌더링
- 기존 flex 레이아웃 구조를 유지하면서 Typography만 Box + FavoriteIcon으로 교체

## 구현 단계

### 1. FavoriteIcon import 추가
```javascript
// Line 6 (VolumeOffIcon import) 아래에 추가
import FavoriteIcon from '@mui/icons-material/Favorite';
```
- MUI의 채워진 하트 아이콘 컴포넌트를 가져옴
- 기존 VolumeUpIcon, VolumeOffIcon과 동일한 import 패턴 사용

### 2. Typography를 하트 아이콘 Box로 교체
```jsx
// Line 650-656의 Typography 블록을 아래 코드로 교체
<Box sx={{
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '6px'
}}>
  {Array.from({ length: lives }).map((_, index) => (
    <FavoriteIcon
      key={index}
      sx={{
        fontSize: '36px',
        color: '#ff1744'
      }}
    />
  ))}
</Box>
```
- `lives` 값이 3이면 하트 3개, 1이면 1개, 0이면 빈 Box 렌더링
- `fontSize: '36px'`는 우측 음악 아이콘과 동일한 크기
- `color: '#ff1744'`는 MUI의 빨간색 계열로 검정 배경에서 높은 대비 제공
- `gap: '6px'`으로 하트 간 간격 유지

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| frontend/src/Pinball.jsx | 수정 | FavoriteIcon import 추가, Typography를 하트 아이콘 Box로 교체 |

## 완료 체크리스트

- [ ] "LIVES: {숫자}" 텍스트가 화면에서 완전히 제거되었는지 확인
- [ ] 게임 시작 시 하트 아이콘이 3개 가로로 표시되는지 확인
- [ ] 공이 죽음구역에 빠질 때 하트 아이콘 수가 줄어드는지 확인
- [ ] 하트 아이콘이 상단 UI 영역(검정 배경 바)의 좌측에 위치하는지 확인
- [ ] npm run start로 에러 없이 실행되는지 확인
