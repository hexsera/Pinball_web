# AI 플립퍼 수정 실행계획

## 요구사항 요약

**요구사항**:
1. AI 플립퍼의 작동 방향과 각도를 player 플립퍼의 x축 반전으로 변경
2. player 플립퍼 양옆 경사로(깔대기 벽)를 AI 플립퍼 양옆에도 추가
3. AI 핀볼 엔진의 중력을 임시로 y=-1로 설정 (디버깅용)

**목적**: AI 플립퍼가 공을 위로 치는 방향으로 올바르게 작동하게 하고, AI 영역의 구조를 player 영역과 대칭으로 만들기 위함.

## 현재상태 분석

- 파일: `frontend/src/pages/AIPinball/AIPinball.jsx`
- AI 플립퍼 위치: y=105 (상단), aiLeftFlipper(x=400), aiRightFlipper(x=265)
- AI 플립퍼 각도 상수(라인 385-388): AI_LEFT 범위 -35°~+15°, AI_RIGHT 범위 -15°~+35° (player와 동일 — 미반전 상태)
- Player 플립퍼 양옆 경사로: leftFunnelWall(x=105,y=915, 35°), rightFunnelWall(x=540,y=925, -35°) — player 영역(하단)에만 존재
- 엔진 중력: y=1 (라인 190-193)

## 구현 방법

- **각도 반전**: AI 플립퍼 각도 상수의 부호를 반전시켜 x축 대칭 동작 구현
- **경사로 추가**: 기존 funnelWall과 동일한 방식(Bodies.rectangle + Body.setAngle)으로 AI 영역 상단에 경사로 생성
- **중력 변경**: Engine.create의 gravity.y 값을 -1로 수정

## 구현 단계

### 1. 엔진 중력 y=-1로 변경 (라인 189-194)

```javascript
const engine = Engine.create({
  gravity: {
    x: 0,
    y: -1  // 임시: AI 플립퍼 디버깅용 (기존 1 → -1)
  }
});
```
- **무엇을 하는가**: 물리 엔진의 중력 방향을 위쪽으로 반전하여 공이 위로 떠오르게 함
- Matter.js에서 gravity.y 양수=아래, 음수=위
- AI 플립퍼 타격 방향 검증을 위한 임시 설정

### 2. AI 플립퍼 각도 상수 부호 반전 (라인 385-388)

```javascript
// AI 플리퍼 각도 상수 (player 플립퍼의 x축 반전)
// player Left: -35°(올림) ~ +15°(내림)  →  AI Left: -15°(내림) ~ +35°(올림)
// player Right: -15°(올림) ~ +35°(내림) →  AI Right: -35°(올림) ~ +15°(내림)
const AI_LEFT_MIN_ANGLE  = -15 * Math.PI / 180;  // 내린 상태
const AI_LEFT_MAX_ANGLE  =  35 * Math.PI / 180;  // 올린 상태
const AI_RIGHT_MIN_ANGLE = -35 * Math.PI / 180;  // 올린 상태
const AI_RIGHT_MAX_ANGLE =  15 * Math.PI / 180;  // 내린 상태
```
- **무엇을 하는가**: player 플립퍼 각도 범위를 x축 반전하여 AI 플립퍼가 공을 위쪽으로 타격하는 각도로 변경
- player Left MIN/MAX를 AI Left MAX/MIN으로 교환 (부호 반전)
- player Right MIN/MAX를 AI Right MAX/MIN으로 교환 (부호 반전)

### 3. AI 플립퍼 beforeUpdate 제어 로직 수정 (라인 607-622)

```javascript
// AI Left: true(올리기) → 반시계(-FLIPPER_SPEED), false(내리기) → 시계(+FLIPPER_SPEED)
if (isAILeftPressed.current) {
  Body.setAngularVelocity(aiLeftFlipper, -FLIPPER_SPEED);  // 올리기 (반시계, 기존 +에서 반전)
} else {
  Body.setAngularVelocity(aiLeftFlipper, FLIPPER_SPEED);   // 내리기 (시계, 기존 -에서 반전)
}
if (aiLeftFlipper.angle > AI_LEFT_MAX_ANGLE) Body.setAngle(aiLeftFlipper, AI_LEFT_MAX_ANGLE);
if (aiLeftFlipper.angle < AI_LEFT_MIN_ANGLE) Body.setAngle(aiLeftFlipper, AI_LEFT_MIN_ANGLE);

// AI Right: true(올리기) → 시계(+FLIPPER_SPEED), false(내리기) → 반시계(-FLIPPER_SPEED)
if (isAIRightPressed.current) {
  Body.setAngularVelocity(aiRightFlipper, FLIPPER_SPEED);  // 올리기 (시계, 기존 -에서 반전)
} else {
  Body.setAngularVelocity(aiRightFlipper, -FLIPPER_SPEED); // 내리기 (반시계, 기존 +에서 반전)
}
if (aiRightFlipper.angle > AI_RIGHT_MAX_ANGLE) Body.setAngle(aiRightFlipper, AI_RIGHT_MAX_ANGLE);
if (aiRightFlipper.angle < AI_RIGHT_MIN_ANGLE) Body.setAngle(aiRightFlipper, AI_RIGHT_MIN_ANGLE);
```
- **무엇을 하는가**: 새 각도 범위에 맞게 true/false 시 회전 방향(setAngularVelocity 부호)을 반전하고, 각도 제한(setAngle)을 새 MIN/MAX로 적용
- player Left `true` → `-FLIPPER_SPEED`(반시계)이므로 AI Left `true` → `-FLIPPER_SPEED`(반시계로 올림)
- player Right `true` → `+FLIPPER_SPEED`(시계)이므로 AI Right `true` → `+FLIPPER_SPEED`(시계로 올림)
- 각도 제한 clamp는 반드시 속도 설정 직후에 수행해야 플립퍼가 범위를 벗어나지 않음

### 4. AI 플립퍼 양옆 경사로 Bodies 생성 (라인 342 근처에 추가)

```javascript
// AI 깔대기 경사면 (AI 플립퍼 상단 영역, player 깔대기의 y축 반전)
const AI_FUNNEL_ANGLE = 35 * Math.PI / 180;
const AI_FUNNEL_THICKNESS = 20;

// AI 깔대기 왼쪽 경사면 (player leftFunnelWall의 y축 반전: y=915 → y=185)
const aiLeftFunnelWall = Bodies.rectangle(105, 185, 260, AI_FUNNEL_THICKNESS, {
  isStatic: true,
  render: { fillStyle: '#16213e' }
});
Body.setAngle(aiLeftFunnelWall, -AI_FUNNEL_ANGLE);  // player는 +35°, AI는 -35° (y축 반전)

// AI 깔대기 오른쪽 경사면 (player rightFunnelWall의 y축 반전: y=925 → y=175)
const aiRightFunnelWall = Bodies.rectangle(540, 175, 220, AI_FUNNEL_THICKNESS, {
  isStatic: true,
  render: { fillStyle: '#16213e' }
});
Body.setAngle(aiRightFunnelWall, AI_FUNNEL_ANGLE);  // player는 -35°, AI는 +35° (y축 반전)
```
- **무엇을 하는가**: AI 플립퍼(y=105) 양옆에 경사로를 만들어 공이 AI 플립퍼 방향으로 유도되게 함
- player 깔대기(y≈915-925)를 y축 대칭으로 뒤집어 상단(y≈175-185)에 배치
- 각도 부호도 반전: player leftFunnel +35° → AI leftFunnel -35°

### 5. AI 경사로 World에 추가

```javascript
// World.add 호출부에 aiLeftFunnelWall, aiRightFunnelWall 추가
World.add(engine.world, [
  // 기존 bodies...
  aiLeftFunnelWall,
  aiRightFunnelWall,
]);
```
- **무엇을 하는가**: 생성된 경사로 Body를 Matter.js 물리 월드에 등록하여 충돌이 작동하게 함
- World.add에 등록하지 않으면 물리 시뮬레이션에 포함되지 않음

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | 엔진 중력 y=1→-1, AI 플립퍼 각도 상수 반전, AI 경사로 Bodies 추가 |

## 완료 체크리스트

- [ ] 브라우저에서 AI 플립퍼가 공을 위쪽으로 타격하는지 확인
- [ ] AI Left 플립퍼 활성화(true) 시 반시계 방향으로 올라가는지 확인
- [ ] AI Right 플립퍼 활성화(true) 시 시계 방향으로 올라가는지 확인
- [ ] AI Left 플립퍼가 -15°~+35° 범위를 벗어나지 않는지 확인
- [ ] AI Right 플립퍼가 -35°~+15° 범위를 벗어나지 않는지 확인
- [ ] AI 플립퍼 양옆에 경사로가 화면에 표시되는지 확인
- [ ] 공이 AI 경사로에 충돌하여 AI 플립퍼 방향으로 유도되는지 확인
- [ ] 중력 y=-1로 인해 공이 위로 떠오르는지 확인
- [ ] 콘솔에 에러가 없는지 확인
