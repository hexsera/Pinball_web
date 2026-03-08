# AIPinball 버그 수정 실행계획

## 요구사항 요약

**요구사항 1**: `big_ball`, `small_ball`에서 충돌 이벤트(범퍼 반발, 사운드, 점수, 죽음 판정)가 동작하지 않는 문제 수정

**요구사항 2**: 게임 시작 시 및 공이 죽음구역에 빠진 후 부활 시, 공을 게임 영역 중앙(x=350)에 배치

**목적**: 필살기 사용 시 정상적인 게임 플레이 보장, 공 초기/부활 배치를 플레이어가 예측 가능한 중앙 위치로 통일

## 현재상태 분석

- **충돌 이벤트 버그 원인**: `collisionStart` 이벤트 핸들러 내부에서 충돌 여부를 `bodyA === ball` / `bodyB === ball`로 직접 참조 비교(객체 동일성)를 사용 (634, 644, 651, 656, 659, 663, 670 라인). `activateSpecial` 함수 실행 시 `ballRef.current`가 `bigBall` 또는 `smallBall`로 교체되지만, 클로저 내부의 `ball` 변수는 최초 생성된 일반 공 객체를 계속 참조하므로 `big_ball`/`small_ball`과 일치하지 않아 이벤트가 무시됨.
- **공 초기 배치**: 현재 일반 공(`ball`)은 `(60, SHELF_Y - 220)` 좌상단에서 시작하고, 죽음 후 부활 위치는 `(662, 990)`으로 Plunger lane 내부에 배치됨. 두 위치 모두 중앙(x=350)이 아님.

## 구현 방법

- **충돌 이벤트**: 이벤트 핸들러 내부에서 `ball` 클로저 변수 대신 `ballRef.current`를 사용하여 항상 현재 활성화된 공 객체를 참조하도록 수정.
- **공 배치**: 초기 생성 위치와 부활 위치를 게임 영역 중앙 x=350 기준으로 변경. 초기 Y는 플레이어가 바로 게임 가능한 플리퍼 위 영역으로 설정.

## 구현 단계

### 1. 충돌 이벤트 핸들러에서 ball 참조를 ballRef.current로 교체

```javascript
// 기존 (클로저로 고정된 ball 참조)
if (bodyA === ball || bodyB === ball) { ... }

// 수정 (항상 현재 활성 공 참조)
const activeBall = ballRef.current;
if (bodyA === activeBall || bodyB === activeBall) { ... }
```

- `collisionStart` 이벤트 내부 모든 `ball` 비교를 `ballRef.current`로 교체
- `bumperForce` 적용 시 `ball.velocity`도 `activeBall.velocity`로 교체
- `Body.setVelocity(ball, ...)` → `Body.setVelocity(activeBall, ...)` 로 교체
- flipperTrigger 진입/이탈 감지 이벤트(609~623라인)도 동일하게 수정

### 2. AI beforeUpdate 루프에서 ball 위치 참조 수정

```javascript
// 기존
const ballPos = ball.position;
const ballVel = ball.velocity;

// 수정
const activeBall = ballRef.current;
const ballPos = activeBall.position;
const ballVel = activeBall.velocity;
```

- AI 판단 로직(756~763라인)이 big_ball/small_ball 활성 시에도 올바른 위치를 읽도록 수정

### 3. 공 초기 생성 위치를 중앙으로 변경

```javascript
// 기존 (355번 라인)
const ball = Bodies.circle(60, SHELF_Y - 220, 15, { ... });

// 수정: 게임 영역 중앙 x=350, 플리퍼 위
const ball = Bodies.circle(350, 700, 15, { ... });
```

- x=350은 렌더러 너비(700px)의 정중앙
- y=700은 게임 필드 중간 높이 (플리퍼 y=995 기준 위쪽)

### 4. 죽음 후 부활 위치를 중앙으로 변경

```javascript
// 기존 (681번 라인)
Body.setPosition(ball, { x: 662, y: 990 });

// 수정
const activeBall = ballRef.current;
Body.setPosition(activeBall, { x: 350, y: 700 });
Body.setVelocity(activeBall, { x: 0, y: 0 });
Body.setAngularVelocity(activeBall, 0);
```

- 부활 시에도 `ballRef.current`를 사용해 현재 활성 공에 위치 적용
- x=350 중앙, y=700으로 통일

### 5. handleRestart 함수 부활 위치 수정

```javascript
// 기존 (167번 라인)
Body.setPosition(ball, { x: 662, y: 990 });

// 수정
Body.setPosition(ball, { x: 350, y: 700 });
```

- 재시작 시 일반 공(`ball`)도 중앙으로 이동

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | ball 클로저 참조 → ballRef.current 교체, 초기/부활 위치 x=350, y=700으로 변경 |

## 완료 체크리스트

- [ ] 일반 ball로 범퍼 충돌 시 점수 증가 및 반발이 정상 동작하는지 확인
- [ ] 'a' 키로 big_ball 필살기 발동 후 범퍼 충돌 시 점수 증가 및 반발이 정상 동작하는지 확인
- [ ] 'a' 키로 small_ball 필살기 발동 후 범퍼 충돌 시 점수 증가 및 반발이 정상 동작하는지 확인
- [ ] big_ball/small_ball이 죽음구역에 빠졌을 때 목숨 감소 이벤트가 정상 발생하는지 확인
- [ ] 게임 시작 시 공이 x=350 중앙에 배치되는지 확인
- [ ] 공이 죽음구역에 빠진 후 부활 위치가 x=350 중앙인지 확인
- [ ] 재시작(handleRestart) 후 공이 x=350 중앙에 배치되는지 확인
- [ ] big_ball 활성 중 AI 플리퍼가 공 위치를 정상적으로 추적하는지 확인
