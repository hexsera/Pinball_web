# WallOverlay.jsx Pinball.jsx 좌표 수정 실행계획

## 요구사항 요약

**요구사항**: `WallOverlay.jsx`의 시각적 오버레이 좌표를 `Pinball.jsx`의 실제 물리 벽 좌표에 맞게 수정한다.

**목적**: 현재 WallOverlay.jsx가 AIPinball.jsx 기준 좌표로 맞춰져 있어서 Pinball.jsx에서 시각적 벽과 실제 물리 충돌 영역이 어긋나는 문제를 해결한다.

## 현재상태 분석

- `WallOverlay.jsx`는 `Pinball.jsx`와 `AIPinball.jsx` 두 곳에서 공유 import 중
- 현재 WallOverlay의 깔대기 좌표: 왼쪽 `left:16.3px, top:905px` / 오른쪽 `left:421.8px, top:915px`
- 이 값은 AIPinball.jsx의 물리 좌표(왼쪽 center x=147.3, 오른쪽 center x=552.8) 기준
- Pinball.jsx의 실제 물리 좌표: 왼쪽 `center(105, 915), width=260` / 오른쪽 `center(540, 925), width=220`
- 왼쪽 벽: `center(20, 550), 40×1100` → 현재 WallOverlay 좌표와 일치

## 구현 방법

CSS `position: absolute`로 배치된 div의 `top`, `left`, `width`, `transform` 값을 Pinball.jsx의 물리 좌표에서 역산하여 수정한다.

**좌표 역산 공식**:
- `left = center_x - width/2`
- `top = center_y - height/2`

## 구현 단계

### 1. 왼쪽 깔대기 좌표 수정

```jsx
{/* 왼쪽 깔대기: center(105, 915), 260×20, rotate(35deg)
    top: 915 - 10 = 905, left: 105 - 130 = -25 */}
<div style={{
  position: 'absolute',
  top: '905px',
  left: '-25px',
  width: '260px',
  height: '20px',
  transform: 'rotate(35deg)',
  transformOrigin: 'center center',
  /* 나머지 스타일 동일 */
}} />
```
- **무엇을 하는가**: 왼쪽 깔대기 오버레이를 Pinball.jsx 물리 body와 일치시킴
- `left: 105 - 260/2 = -25px` (center x=105, width=260)
- `top: 915 - 20/2 = 905px` (center y=915, height=20)
- `width: 260px`로 변경 (현재 262px → 물리 body 기준 260px)

### 2. 오른쪽 깔대기 좌표 수정

```jsx
{/* 오른쪽 깔대기: center(540, 925), 220×20, rotate(-35deg)
    top: 925 - 10 = 915, left: 540 - 110 = 430 */}
<div style={{
  position: 'absolute',
  top: '915px',
  left: '430px',
  width: '220px',
  height: '20px',
  transform: 'rotate(-35deg)',
  transformOrigin: 'center center',
  /* 나머지 스타일 동일 */
}} />
```
- **무엇을 하는가**: 오른쪽 깔대기 오버레이를 Pinball.jsx 물리 body와 일치시킴
- `left: 540 - 220/2 = 430px` (center x=540, width=220)
- `top: 925 - 20/2 = 915px` (center y=925, height=20)
- `width: 220px`로 변경 (현재 262px → 물리 body 기준 220px)

### 3. 왼쪽 벽 좌표 확인 (변경 없음)

```jsx
{/* 왼쪽 벽: center(20, 550), 40×1100 → left:0, top:0 */}
<div style={{
  position: 'absolute',
  top: 0,
  left: 0,
  width: '40px',
  height: '1100px',
  /* 스타일 동일 */
}} />
```
- **무엇을 하는가**: 왼쪽 벽 좌표가 이미 Pinball.jsx 물리 body와 일치하므로 변경하지 않음
- `left: 20 - 40/2 = 0px`, `top: 550 - 1100/2 = 0px` → 계산값 일치 확인

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/Pinball/WallOverlay.jsx` | 수정 | 왼쪽 깔대기: left -25px, width 260px / 오른쪽 깔대기: left 430px, width 220px |

## 완료 체크리스트

- [ ] 브라우저에서 Pinball 게임 실행 시 왼쪽 깔대기 시각적 오버레이가 공의 실제 반사 방향과 일치하는가
- [ ] 오른쪽 깔대기 시각적 오버레이가 공의 실제 반사 방향과 일치하는가
- [ ] AIPinball.jsx 페이지에서 오버레이가 깨지거나 이상하게 표시되지 않는가 (분리 전까지 허용 범위)
- [ ] 왼쪽 벽 오버레이가 화면 좌측에 올바르게 붙어 있는가
