# AIPinball Phase 1 — 맵 재구성 실행계획

## 요구사항 요약

**요구사항**: Plunger lane 제거, 천장을 좌우 벽 2개로 분리해 가운데 구멍을 뚫고 aiDeathZone 센서 배치. 전체 폭을 플레이 구역으로 확장.

**목적**: 플레이어(하단)와 AI(상단) 대결 구조에 맞는 좌우 대칭 맵 구성.

## 현재상태 분석

- `upWall`: 천장 단일 벽 (x=350, y=20, width=700)
- `rightWall2`: Plunger lane 내벽 (x=630, y=700, width=30, height=850) — 제거 대상
- `plungerLaneGuide`: 플런저 레인 가이드 (x=660, y=150) — 제거 대상
- `aiLeftFunnelWall` / `aiRightFunnelWall`: 현재 구멍 없이 막힌 천장 아래 배치
- `WallOverlay.jsx`: 물리 오브젝트와 1:1 대응하는 CSS 오버레이 — 동일하게 수정 필요

## 구현 방법

- `upWall` 1개를 `upWallLeft`(x=100, width=200) + `upWallRight`(x=550, width=300) 2개로 교체
- 구멍 범위: x=200 ~ x=500 (width=300), AI 깔대기가 이 구멍으로 공을 유도
- `aiDeathZone` 센서를 구멍 위 y=-30에 배치
- `rightWall2`, `plungerLaneGuide` 제거
- `WallOverlay.jsx` 에서 동일한 CSS 오버레이 변경

## 구현 단계

### 1. rightWall2, plungerLaneGuide 제거

```javascript
// 제거: rightWall2, plungerLaneGuide 생성 코드 삭제
// 제거: World.add() 목록에서 rightWall2, plungerLaneGuide 삭제
World.add(engine.world, [
  leftWall,
  rightWall,
  // rightWall2,        ← 삭제
  upWallLeft,
  upWallRight,
  // ...
  // plungerLaneGuide,  ← 삭제
]);
```
- **무엇을 하는가**: Plunger lane을 구성하던 오브젝트를 완전히 제거해 우측 벽면을 플레이 구역으로 개방

### 2. upWall을 2개로 분리

```javascript
// 기존 upWall 삭제 후 아래로 교체
const upWallLeft = Bodies.rectangle(100, 20, 200, 40, {
  isStatic: true,
  render: { fillStyle: '#16213e' }
});
const upWallRight = Bodies.rectangle(550, 20, 300, 40, {
  isStatic: true,
  render: { fillStyle: '#16213e' }
});
```
- **무엇을 하는가**: 천장 가운데(x=200~500)에 300px 구멍을 만들어 공이 천장 위로 나갈 수 있게 함
- `upWallLeft`: center x=100, width=200 → x=0~200 구간 커버
- `upWallRight`: center x=550, width=300 → x=400~700 구간 커버 (rightWall 두께 고려)

### 3. aiDeathZone 센서 추가

```javascript
const aiDeathZone = Bodies.rectangle(350, -30, 300, 30, {
  isStatic: true,
  isSensor: true,
  label: 'aiDeathZone',
  render: { fillStyle: '#003399', opacity: 0.3 }
});
```
- **무엇을 하는가**: 천장 구멍(x=200~500) 위에 센서를 배치해 공이 구멍을 통과해 나가면 감지
- `isSensor: true` — 물리 충돌 없이 감지만 수행
- y=-30 — 천장(y=0~40) 위쪽에 위치
- width=300 — 구멍 범위(x=200~500)와 동일

### 4. AI 깔대기 위치 조정

```javascript
// aiLeftFunnelWall: 구멍 왼쪽 끝(x=200)으로 공을 유도
const aiLeftFunnelWall = Bodies.rectangle(120, 185, 220, 20, {
  isStatic: true,
  render: { fillStyle: '#16213e' }
});
Body.setAngle(aiLeftFunnelWall, -35 * Math.PI / 180);

// aiRightFunnelWall: 구멍 오른쪽 끝(x=500)으로 공을 유도
const aiRightFunnelWall = Bodies.rectangle(480, 175, 220, 20, {
  isStatic: true,
  render: { fillStyle: '#16213e' }
});
Body.setAngle(aiRightFunnelWall, 35 * Math.PI / 180);
```
- **무엇을 하는가**: AI 깔대기 경사면이 공을 천장 구멍(x=200~500) 안쪽으로 유도하도록 위치 조정

### 5. WallOverlay.jsx 수정

```jsx
// 기존: upWall 1개, rightWall2, plungerLaneGuide CSS div 제거
// 추가: upWallLeft, upWallRight CSS div 2개로 교체

// upWallLeft (x=0~200)
<Box sx={{ position:'absolute', left:0, top:0,
  width:'200px', height:'40px',
  background:'linear-gradient(to bottom, #0a0a1a, #1a1a3e)',
  borderBottom:'3px solid #00d4ff' }} />

// upWallRight (x=400~700)
<Box sx={{ position:'absolute', left:'400px', top:0,
  width:'300px', height:'40px',
  background:'linear-gradient(to bottom, #0a0a1a, #1a1a3e)',
  borderBottom:'3px solid #00d4ff' }} />
```
- **무엇을 하는가**: 물리 오브젝트 변경과 동기화해 천장 구멍이 시각적으로도 보이도록 CSS 오버레이 수정
- `rightWall2`, `plungerLaneGuide` CSS div도 함께 삭제

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | upWall 분리, rightWall2/plungerLaneGuide 제거, aiDeathZone 추가, AI 깔대기 위치 조정 |
| `frontend/src/pages/Pinball/WallOverlay.jsx` | 수정 | upWall CSS → upWallLeft/Right 2개로 분리, rightWall2/plungerLaneGuide CSS 제거 |

## 완료 체크리스트

- [ ] 브라우저에서 천장 가운데(x=200~500)에 구멍이 시각적으로 보임
- [ ] 공이 천장 구멍을 통해 위로 빠져나갈 수 있음
- [ ] 우측 Plunger lane 내벽(rightWall2)이 사라져 우측 공간이 플레이 구역이 됨
- [ ] AI 깔대기가 공을 천장 구멍 방향으로 유도함
- [ ] 콘솔에 오류 없이 정상 실행됨
