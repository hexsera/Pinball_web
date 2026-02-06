# 핀볼 Plunger(발사기) 실행계획

## 요구사항 요약

**요구사항**: 핀볼게임에 Plunger(발사기)를 추가한다. 스페이스바로 작동해야 한다.

**목적**: 전통적인 핀볼 게임처럼 공을 발사 통로에서 충전 후 발사하는 메커니즘을 구현한다.

## 현재상태 분석

- 캔버스 크기: 700×1100px
- rightWall(x=700)과 rightWall2(x=630) 사이에 폭 35px의 통로가 이미 존재한다 (x=645~680)
- 공 직경 30px → 통로 통과 가능 (2.5px 여유)
- 현재 rightWall2가 전체 높이(1100px)를 차지하여 통로 상단이 막혀 있다
- 공 초기 위치: (250, 400) — 게임 필드 중앙에서 시작 중
- 스페이스바 이벤트: 미사용 상태
- stageConfigs의 모든 장애물은 x=540 이하 → plunger lane과 겹치지 않음

## 구현 방법

**Static Plunger + 공에 직접 Velocity 적용 방식**을 사용한다.

Plunger Body를 `isStatic: true`로 생성하여 시각적 표현만 담당하고, 발사 시에는 공에 `Body.setVelocity()`를 직접 적용한다. 스페이스바 누른 시간(충전량)에 비례하여 발사 속도가 결정된다. 이 방식은 기존 플리퍼의 직접 제어 패턴과 일관성이 있고, 물리 충돌 문제를 회피할 수 있다.

## 구현 단계

### Phase 1: Plunger lane 및 Body 생성 (테스트 가능)

#### 1-1. rightWall2 높이 축소 (lane 상단 출구 생성)

```javascript
// 변경 전: 전체 높이
const rightWall2 = Bodies.rectangle(630, 550, 30, 1100, {

// 변경 후: y=200~1100 구간만 벽 유지 (상단 160px 개방)
const rightWall2 = Bodies.rectangle(630, 650, 30, 900, {
  isStatic: true,
  render: { fillStyle: '#16213e' }
});
```
- rightWall2의 상단 면이 y=200이 되어, y=40(천장)~y=200 구간에 출구가 생긴다
- 공이 lane을 통해 위로 올라가면 이 출구로 게임 필드에 진입한다

#### 1-2. lane 상단 가이드 벽 추가

```javascript
// 공이 lane 출구에서 왼쪽 게임 필드로 자연스럽게 나가도록 유도하는 경사면
const plungerLaneGuide = Bodies.rectangle(660, 200, 60, 10, {
  isStatic: true,
  angle: -0.3,
  render: { fillStyle: '#16213e' }
});
```
- lane 상단 출구에 약간 왼쪽으로 기울어진 경사면을 배치한다
- 공이 위로 올라온 후 왼쪽 게임 필드로 빠지도록 유도한다

#### 1-3. Plunger 상수 정의 및 Body 생성

```javascript
// Plunger 상수
const PLUNGER_X = 662;
const PLUNGER_REST_Y = 1050;
const PLUNGER_PULL_SPEED = 0.8;
const PLUNGER_MAX_PULL_Y = 1080;
const PLUNGER_MAX_LAUNCH_SPEED = 35;

// Plunger Body (시각적 표현, isStatic)
const plunger = Bodies.rectangle(PLUNGER_X, PLUNGER_REST_Y, 30, 15, {
  isStatic: true,
  label: 'plunger',
  render: { fillStyle: '#c0c0c0' }
});
```
- Plunger는 lane 중앙(x=662)에 위치한다
- `isStatic: true`로 물리 엔진의 영향을 받지 않고, 위치를 직접 제어한다

#### 1-4. 공 초기 위치를 Plunger lane으로 변경

```javascript
// 변경 전
const ball = Bodies.circle(250, 400, 15, { ... });

// 변경 후: Plunger lane 안에서 시작
const ball = Bodies.circle(662, 1020, 15, {
  restitution: 0.8,
  friction: 0,
  frictionAir: 0,
  render: { fillStyle: '#e94560' }
});
```
- 공이 Plunger 바로 위(y=1020)에서 시작한다
- Plunger(y=1050) 위에 공이 놓인 형태가 된다

#### 1-5. World.add에 Phase 1 Body 추가 (Phase 1 테스트용)

```javascript
World.add(engine.world, [
  leftWall, rightWall, rightWall2, upWall,
  leftFunnelWall, rightFunnelWall, deathZone,
  ball, leftFlipper, rightFlipper,
  leftFlipperConstraint, rightFlipperConstraint,
  plunger,              // Phase 1에서 추가
  plungerLaneGuide      // Phase 1에서 추가
]);
```
- plunger와 plungerLaneGuide를 물리 세계에 등록한다
- **Phase 1 테스트**: 게임을 실행하여 공이 Plunger lane(오른쪽 끝 통로)에 있고, Plunger Body(은색 직사각형)가 공 아래에 보이는지 확인

**Phase 1 완료 체크리스트**:
- [ ] 공이 오른쪽 끝 통로(Plunger lane)에 위치하는가
- [ ] 은색 Plunger Body가 공 아래에 보이는가
- [ ] rightWall2 상단에 출구가 열려있는가 (상단 벽이 짧아졌는가)
- [ ] 에러 없이 게임이 실행되는가

---

### Phase 2: 키보드/터치 이벤트 및 발사 로직

#### 2-1. 키 상태 변수 추가

```javascript
// 기존 변수 아래에 추가
let isLeftKeyPressed = false;
let isRightKeyPressed = false;
let isSpacePressed = false;
let spaceHoldStartTime = 0;
```
- 스페이스바 누름 상태와 누른 시각을 저장하는 변수를 추가한다

#### 2-2. handleKeyDown에 스페이스바 처리 추가

```javascript
if (event.key === ' ' || event.code === 'Space') {
  event.preventDefault();
  if (!isSpacePressed) {
    isSpacePressed = true;
    spaceHoldStartTime = Date.now();
    console.log('스페이스바 눌림 - Plunger 충전 시작');
  }
}
```
- `event.preventDefault()`로 페이지 스크롤을 방지한다
- 첫 눌림 시에만 충전을 시작한다 (키 반복 무시)

#### 2-3. handleKeyUp에 스페이스바 발사 처리 추가

```javascript
if (event.key === ' ' || event.code === 'Space') {
  if (isSpacePressed) {
    isSpacePressed = false;

    const holdDuration = Math.min(Date.now() - spaceHoldStartTime, 1500);
    const chargeRatio = Math.max(holdDuration / 1500, 0.1);
    const launchSpeed = PLUNGER_MAX_LAUNCH_SPEED * chargeRatio;

    // 공이 plunger lane 안에 있을 때만 발사
    const ballInLane = ball.position.x > 640 && ball.position.x < 685 &&
                       ball.position.y > 900 && ball.position.y < 1080;

    if (ballInLane) {
      Body.setVelocity(ball, { x: 0, y: -launchSpeed });
      console.log(`Plunger 발사! 충전: ${(chargeRatio * 100).toFixed(0)}%`);
    }

    // Plunger 원래 위치로 복귀
    Body.setPosition(plunger, { x: PLUNGER_X, y: PLUNGER_REST_Y });
  }
}
```
- 충전 시간(최대 1.5초)에 비례하여 발사 속도가 결정된다
- 공이 lane 영역 안에 있을 때만 발사가 작동한다
- 발사 후 Plunger는 원래 위치로 즉시 복귀한다

#### 2-4. beforeUpdate에 Plunger 시각적 당기기 추가

```javascript
// 기존 플리퍼 제어 코드 뒤에 추가
if (isSpacePressed) {
  const currentY = plunger.position.y;
  if (currentY < PLUNGER_MAX_PULL_Y) {
    Body.setPosition(plunger, {
      x: PLUNGER_X,
      y: Math.min(currentY + PLUNGER_PULL_SPEED, PLUNGER_MAX_PULL_Y)
    });
  }
}
```
- 스페이스바를 누르고 있으면 Plunger가 아래로 천천히 이동한다 (당기는 시각 효과)

#### 2-5. 공 리셋 위치 변경 (death zone, N키)

```javascript
// death zone 리셋 (344행 부근)
Body.setPosition(ball, { x: 662, y: 1020 });

// N키 스테이지 전환 리셋 (445행 부근)
Body.setPosition(ball, { x: 662, y: 1020 });
```
- 공이 죽거나 스테이지 전환 시 Plunger lane으로 리셋된다

**Phase 2 완료 체크리스트**:
- [ ] 스페이스바를 누르면 Plunger가 아래로 당겨지는가
- [ ] 스페이스바를 떼면 공이 위로 발사되는가
- [ ] 오래 누를수록 더 강하게 발사되는가
- [ ] 공이 lane 상단 출구를 통해 게임 필드로 나가는가
- [ ] 공이 죽으면 다시 Plunger lane으로 리셋되는가

---

### Phase 3: 모바일 터치 대응

#### 3-1. handleTouchStart 수정

```javascript
const handleTouchStart = (event) => {
  const touch = event.touches[0];
  const rect = sceneRef.current.getBoundingClientRect();
  const touchX = touch.clientX - rect.left;
  const centerX = rect.width / 2;
  const plungerZone = rect.width * 0.9;

  if (touchX > plungerZone) {
    isSpacePressed = true;
    spaceHoldStartTime = Date.now();
    console.log('Plunger 터치 시작');
  } else if (touchX < centerX) {
    isLeftKeyPressed = true;
  } else {
    isRightKeyPressed = true;
  }
};
```
- 화면 오른쪽 끝 10% 영역을 터치하면 Plunger 충전이 시작된다

#### 3-2. handleTouchEnd에 Plunger 발사 로직 추가

```javascript
const handleTouchEnd = () => {
  if (isSpacePressed) {
    isSpacePressed = false;
    const holdDuration = Math.min(Date.now() - spaceHoldStartTime, 1500);
    const chargeRatio = Math.max(holdDuration / 1500, 0.1);
    const launchSpeed = PLUNGER_MAX_LAUNCH_SPEED * chargeRatio;

    const ballInLane = ball.position.x > 640 && ball.position.x < 685 &&
                       ball.position.y > 900 && ball.position.y < 1080;
    if (ballInLane) {
      Body.setVelocity(ball, { x: 0, y: -launchSpeed });
    }
    Body.setPosition(plunger, { x: PLUNGER_X, y: PLUNGER_REST_Y });
  }
  isLeftKeyPressed = false;
  isRightKeyPressed = false;
};
```
- 터치를 떼면 충전 시간에 비례하여 발사한다

**Phase 3 완료 체크리스트**:
- [ ] 모바일에서 오른쪽 끝을 터치하면 Plunger가 충전되는가
- [ ] 터치를 떼면 공이 발사되는가
- [ ] 기존 플리퍼 터치(좌/우)가 정상 작동하는가

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| frontend/src/Pinball.jsx | 수정 | rightWall2 높이 축소, Plunger Body 생성, 공 초기 위치 변경, 스페이스바/터치 이벤트, beforeUpdate 로직, World.add, 리셋 위치 변경 |

## 완료 체크리스트

- [ ] 스페이스바를 누르면 Plunger가 아래로 당겨지는 시각 효과가 보이는가
- [ ] 스페이스바를 떼면 공이 위쪽으로 발사되는가
- [ ] 오래 누를수록 더 강하게 발사되는가 (충전 시스템)
- [ ] 공이 lane 상단 출구를 통해 게임 필드로 진입하는가
- [ ] 공이 죽었을 때 Plunger lane으로 리셋되는가
- [ ] 공이 게임 필드에 있을 때 스페이스바를 눌러도 아무 일도 일어나지 않는가
- [ ] 모바일에서 오른쪽 끝 터치로 Plunger가 작동하는가
- [ ] 기존 플리퍼(좌/우 방향키)가 정상 작동하는가
- [ ] 에러 없이 게임이 실행되는가
