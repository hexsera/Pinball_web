# 핀볼 게임 점수 UI 개선 실행계획

## 요구사항 요약

**요구사항**: 점수 컴포넌트를 현재 위치에서 300px 아래로 이동, 상위 Box의 배경/테두리 등 스타일 제거, 점수 텍스트를 숫자만 표시, 폰트 크기를 92px로 확대

**목적**: 점수를 게임 화면에 자연스럽게 오버레이하여 시각적으로 깔끔하고 눈에 잘 띄게 표시

## 현재상태 분석

- 파일 위치: `frontend/src/pages/Pinball/Pinball.jsx` (라인 889~906)
- 상위 Box: `top: '10px'`, `backgroundColor: 'rgba(255,255,255,0.7)'`, `borderRadius: '8px'`, `padding: '6px 20px'` 적용됨
- Typography: `SCORE: {score}` 형식, `fontSize: '28px'`, `fontWeight: 'bold'`, `color: '#000000'`

## 구현 방법

Box 컴포넌트의 `sx` prop을 직접 수정하여 스타일을 변경한다. React 상태(`score`)는 그대로 사용하며 표시 형식만 변경한다.

## 구현 단계

### 1. 상위 Box top 값 수정 (10px → 310px)
```jsx
<Box sx={{
  position: 'absolute',
  top: '310px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 5
}}>
```
- **무엇을 하는가**: 점수 박스를 기존 위치(10px)에서 300px 아래(310px)로 이동
- `backgroundColor`, `borderRadius`, `padding` 속성을 제거하여 박스를 투명하게 만듦
- `position`, `left`, `transform`, `zIndex`는 중앙 정렬 및 레이어 유지를 위해 그대로 유지

### 2. Typography 점수 형식 및 크기 수정
```jsx
<Typography sx={{
  fontSize: '92px',
  fontWeight: 'bold',
  color: '#ffffff'
}}>
  {score}
</Typography>
```
- **무엇을 하는가**: 점수 텍스트를 `SCORE: {score}` 형식에서 숫자만 표시하도록 변경하고 크기를 92px로 확대
- `SCORE: ` 접두사 텍스트를 제거하고 `{score}` 변수만 렌더링
- `fontSize`를 `28px`에서 `92px`로 변경

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/Pinball/Pinball.jsx` | 수정 | 점수 Box sx 스타일 변경, Typography 텍스트 및 fontSize 변경 |

## 완료 체크리스트

- [ ] 점수 박스가 게임 화면 상단에서 310px 아래 위치에 표시됨
- [ ] 점수 박스 배경색이 없어 투명하게 보임
- [ ] 점수가 `SCORE: 숫자` 형식이 아닌 숫자만 표시됨
- [ ] 점수 글자 크기가 92px로 표시됨
- [ ] 게임 플레이 중 점수 증가 시 UI가 정상적으로 업데이트됨
- [ ] 브라우저 콘솔에 에러 없이 실행됨
