# AI 대전 핀볼 게임 - 상세 PRD

## 1. 개요

기존 1인용 핀볼(`/pinball`)은 변경하지 않고 유지한다. `Pinball.jsx`를 그대로 복사하여 `AIPinball.jsx`를 만들고, **최소한의 변경**으로 AI 대전 모드를 구현한다.

추가할 것은 딱 두 가지다:
1. **상단 AI 플리퍼** (기존 플레이어 플리퍼의 상하 반전 배치)
2. **AI 제어 로직** (공 위치를 보고 자동으로 플리퍼 작동)

기존 핀볼의 모든 구조(중력, 필드, 범퍼, 스테이지, 플런저, 점수 등)는 **그대로 유지**한다.

---

## 2. 구현 범위

### 2.1 파일 구조

```
frontend/src/pages/
  AIPinball/
    AIPinball.jsx     # Pinball.jsx를 복사 후 AI 관련 코드만 추가
    index.js          # re-export
```

`PinballPage.jsx`는 그대로 두고, `AIPinball` 컴포넌트만 교체하여 사용한다.

### 2.2 라우팅

`App.jsx`에 다음 경로만 추가한다:

```jsx
import AIPinball from './pages/AIPinball';

<Route path="/ai-pinball" element={<PinballPage GameComponent={AIPinball} />} />
```

단, `PinballPage.jsx`가 `Pinball`을 하드코딩으로 import하고 있다면, prop으로 받도록 수정하거나 `AIPinballPage.jsx`를 간단히 만든다:

```jsx
// AIPinballPage.jsx (최소 래퍼, 10줄 이내)
import PinballPage from '../PinballPage/PinballPage';
import AIPinball from '../AIPinball';
export default function AIPinballPage() {
  return <PinballPage GameComponent={AIPinball} />;
}
```

---

## 3. AIPinball.jsx 변경사항 (Pinball.jsx 대비)

### 3.1 추가할 것

#### AI 플리퍼 바디 (상단, 기존 플리퍼의 y=995 → y=105로 반전)

| 항목 | AI 왼쪽 플리퍼 | AI 오른쪽 플리퍼 |
|------|--------------|----------------|
| 중심 위치 | `(400, 105)` | `(265, 105)` |
| 회전축(pointB) | `(440, 105)` | `(225, 105)` |
| 크기 | 100 x 20px | 100 x 20px |
| 색상 | `#e74c3c` | `#e74c3c` |
| 올린 각도(MIN) | +15도 | +35도 |
| 내린 각도(MAX) | -35도 | -15도 |

> 플레이어 플리퍼와 좌우가 뒤집힌다. 플레이어 좌플리퍼(x=225 회전축)의 반전 = AI 우플리퍼(x=225 회전축, y=105).

#### AI 플리퍼 Constraint (기존 패턴과 동일)

```js
Constraint.create({
  bodyA: aiLeftFlipper,
  pointA: { x: 40, y: 0 },
  pointB: { x: 440, y: 105 },
  stiffness: 1, damping: 0, length: 0
});

Constraint.create({
  bodyA: aiRightFlipper,
  pointA: { x: -40, y: 0 },
  pointB: { x: 225, y: 105 },
  stiffness: 1, damping: 0, length: 0
});
```

#### AI 제어 로직 (beforeUpdate 이벤트 내부에 추가)

```js
// AI 플리퍼 제어 상수
const AI_ACTIVATION_Y = 300; // 공이 이 y 이하로 올라오면 AI 반응
const AI_LEFT_CENTER_X = 400;  // AI 좌플리퍼 중심 x
const AI_RIGHT_CENTER_X = 265; // AI 우플리퍼 중심 x
const AI_REACTION_DISTANCE = 160; // x방향 반응 거리

// beforeUpdate 이벤트 내부에 추가
const ballPos = ball.position;
const ballVel = ball.velocity;

if (ballPos.y < AI_ACTIVATION_Y && ballVel.y < 0) {
  // 공이 AI 측으로 올라오는 중

  // AI 좌플리퍼 판정 (x=400 중심)
  if (Math.abs(ballPos.x - AI_LEFT_CENTER_X) < AI_REACTION_DISTANCE) {
    Body.setAngularVelocity(aiLeftFlipper, FLIPPER_SPEED);   // 올리기
  } else {
    Body.setAngularVelocity(aiLeftFlipper, -FLIPPER_SPEED);  // 내리기
  }

  // AI 우플리퍼 판정 (x=265 중심)
  if (Math.abs(ballPos.x - AI_RIGHT_CENTER_X) < AI_REACTION_DISTANCE) {
    Body.setAngularVelocity(aiRightFlipper, -FLIPPER_SPEED); // 올리기
  } else {
    Body.setAngularVelocity(aiRightFlipper, FLIPPER_SPEED);  // 내리기
  }
} else {
  // 공이 멀면 AI 플리퍼 내리기
  Body.setAngularVelocity(aiLeftFlipper, -FLIPPER_SPEED);
  Body.setAngularVelocity(aiRightFlipper, FLIPPER_SPEED);
}

// AI 플리퍼 각도 클램핑
if (aiLeftFlipper.angle > AI_LEFT_MAX_ANGLE) Body.setAngle(aiLeftFlipper, AI_LEFT_MAX_ANGLE);
if (aiLeftFlipper.angle < AI_LEFT_MIN_ANGLE) Body.setAngle(aiLeftFlipper, AI_LEFT_MIN_ANGLE);
if (aiRightFlipper.angle > AI_RIGHT_MAX_ANGLE) Body.setAngle(aiRightFlipper, AI_RIGHT_MAX_ANGLE);
if (aiRightFlipper.angle < AI_RIGHT_MIN_ANGLE) Body.setAngle(aiRightFlipper, AI_RIGHT_MIN_ANGLE);
```

#### AI 플리퍼 각도 상수

```js
const AI_LEFT_MIN_ANGLE  = 15 * Math.PI / 180;  // 내린 상태
const AI_LEFT_MAX_ANGLE  = -35 * Math.PI / 180; // 올린 상태 (반전이므로 음수가 올림)
// 주의: min/max 개념이 플레이어와 반대
// 실제로는 setAngle 클램핑 방향도 반전 적용
```

> **각도 반전 정리**: 상단 플리퍼는 아래를 향해 '올린다'. 플레이어 좌플리퍼는 반시계(-) 방향이 올리기지만, AI 좌플리퍼는 시계(+) 방향이 올리기다.

### 3.2 제거할 것

#### 점수 API 호출 비활성화

`AIPinball.jsx`에서 아래 두 함수를 제거(또는 주석 처리)한다. AI 대전 모드는 점수를 서버에 저장하지 않는다.

- `submitScore()` 함수 전체 — 월간 점수 POST 요청
- `setBestScore` 관련 상태 및 UI — 최고 점수 표시 불필요
- 게임오버 시 `submitScore()` 호출 부분

게임오버 오버레이에서도 `최고 점수: {bestScore}` 표시 줄을 제거한다.

### 3.3 변경할 것

- 타이틀 텍스트: `PINBALL` → `AI PINBALL`
- 시작 안내 문구: `SPACE : 플런저 발사` 아래에 `AI 플리퍼가 상단에서 공을 막습니다` 추가

---

## 4. PinballPage.jsx 수정

`PinballPage.jsx`에서 `Pinball`을 하드코딩 import하는 부분을 `GameComponent` prop으로 교체한다.

```jsx
// 기존
import Pinball from '../Pinball';
<Pinball onReady={...} />

// 변경 후
function PinballPage({ GameComponent = Pinball }) {
  ...
  <GameComponent onReady={...} />
}
```

이렇게 하면 `/pinball`은 기존 그대로, `/ai-pinball`은 `AIPinball`을 주입하는 방식으로 재사용할 수 있다.

---

## 5. 기존 핀볼과의 차이점 요약

| 항목 | 기존 1인용 핀볼 | AI 대전 핀볼 |
|------|----------------|-------------|
| 경로 | `/pinball` | `/ai-pinball` |
| 중력 | `{ x: 0, y: 1 }` | 동일 (유지) |
| 필드 구조 | 기존 | 동일 (유지) |
| 플런저 | 있음 | 동일 (유지) |
| 스테이지 | 복수 스테이지 | 동일 (유지) |
| 점수 체계 | 타겟 충돌 +300점 | 동일 (유지) |
| 플리퍼 | 하단 2개 | 하단 2개 (플레이어) + **상단 2개 (AI 추가)** |
| AI 제어 | 없음 | **공 위치 감지 자동 제어 (추가)** |

---

## 6. 테스트 체크리스트

- [ ] `/pinball` 기존 핀볼이 변경 없이 정상 동작한다
- [ ] `/ai-pinball` 접속 시 기존 핀볼과 동일하게 동작한다
- [ ] 화면 상단에 AI 플리퍼 2개가 표시된다 (빨간색)
- [ ] 공이 상단으로 올라올 때 AI 플리퍼가 자동으로 작동한다
- [ ] 공이 멀어지면 AI 플리퍼가 내려간다
- [ ] 플레이어 플리퍼(하단) 조작이 정상 동작한다
- [ ] 플런저, 범퍼, 스테이지 등 기존 기능이 모두 동작한다
- [ ] 게임오버 시 월간 점수 API가 호출되지 않는다
- [ ] 게임오버 오버레이에 최고 점수 표시가 없다
