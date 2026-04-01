# AIPinball Phase 2 — 플런저 제거 + 공 중앙 발사 실행계획

## 요구사항 요약

**요구사항**: 플런저(발사대) 물리 바디, 관련 ref/핸들러, 모바일 UI를 모두 제거하고, 공이 필드 중앙(x=350, y=550)에서 랜덤 방향(왼쪽 아래 또는 오른쪽 아래)으로 자동 발사되도록 변경

**목적**: AIPinball은 플레이어 vs AI 대결 구조이므로 플런저 발사 조작이 어울리지 않음. 공이 중앙에서 자동 출발하면 대결 구조에 맞는 대칭적 시작이 가능

---

## 현재상태 분석

- `plunger`, `plungerShelf` — Matter.js 물리 바디, `World.add`에 포함
- `plungerRef`, `plungerStartRef`, `plungerReleaseRef` — 3개의 useRef
- `isSpacePressedRef`, `spaceHoldStartTimeRef` — 스페이스바 상태 ref 2개
- `PLUNGER_X`, `PLUNGER_REST_Y`, `PLUNGER_PULL_SPEED`, `PLUNGER_MAX_PULL_Y`, `PLUNGER_MAX_LAUNCH_SPEED`, `SHELF_Y` — 플런저 상수 6개
- `beforeUpdate` 이벤트 내 플런저 당기기 로직 존재 (line 789~798)
- `afterRender` 이벤트 내 플런저 스프링 코일 드로잉 로직 존재 (line 820~840)
- `handleKeyDown` 내 Space 플런저 충전 로직, `handleKeyUp` 내 플런저 발사 로직 존재
- 모바일 UI: 플런저 버튼(중앙 버튼) JSX 존재 (line 1338~1350)
- 공 초기 위치: `x=280, y=700` (plunger lane 옆) — `deathZone` 충돌 복귀, `handleRestart` 모두 동일
- `N` 키 스테이지 전환 시 공을 `x=662, y=1020`(plunger lane)으로 이동하는 코드 존재

---

## 구현 방법

`AIPinball.jsx` 한 파일만 수정. Matter.js 물리 바디 제거는 `World.add` 목록에서 삭제하고 바디 생성 코드를 삭제하면 됨. 발사 방향은 `Math.random()`으로 게임 시작 시 결정하고 `useRef`로 저장해 복귀 시 재사용. Space 키는 게임 시작 전 `startGame()` 호출 용도만 유지.

---

## 구현 단계

### 1. 불필요한 ref 선언 제거

```javascript
// 삭제 대상 (line 41~43, 59~60)
const plungerRef = useRef(null);
const plungerStartRef = useRef(null);
const plungerReleaseRef = useRef(null);
const isSpacePressedRef = useRef(false);
const spaceHoldStartTimeRef = useRef(0);

// 추가 — 발사 방향 저장용
const launchDirectionRef = useRef(1); // 1: 오른쪽 아래, -1: 왼쪽 아래
```

- **무엇을 하는가**: 플런저 관련 ref 5개 삭제, 공 발사 방향 기억용 ref 1개 추가
- `launchDirectionRef`는 최초 발사 방향을 저장하여 목숨 감소 후 복귀 시 동일 방향으로 재발사

### 2. 공 발사 함수 추출 및 플런저 상수/바디 제거

```javascript
// 추가 — 공 중앙 발사 함수 (useEffect 내부, 물리 바디 생성 직후)
const launchBall = (ball, direction) => {
  Body.setPosition(ball, { x: 350, y: 550 });
  Body.setVelocity(ball, { x: direction * 8, y: 8 });
  Body.setAngularVelocity(ball, 0);
};

// 게임 시작 시 방향 결정 및 발사
launchDirectionRef.current = Math.random() < 0.5 ? -1 : 1;
launchBall(ball, launchDirectionRef.current);
```

- **무엇을 하는가**: 공을 x=350, y=550 위치에서 랜덤 방향으로 발사하는 로직 구현
- `direction * 8`: 왼쪽(-8) 또는 오른쪽(+8) 수평 속도, `vy=8`로 아래 방향 고정
- `PLUNGER_X`, `PLUNGER_REST_Y`, `PLUNGER_PULL_SPEED`, `PLUNGER_MAX_PULL_Y`, `PLUNGER_MAX_LAUNCH_SPEED`, `SHELF_Y` 상수 6개 삭제
- `plungerShelf`, `plunger` 바디 생성 코드 삭제, `bigBall`/`smallBall` 초기 위치를 `x=350, y=530`으로 변경

### 3. World.add에서 플런저 바디 제거

```javascript
World.add(engine.world, [
  leftWall,
  rightWall,
  aiDeathZone,
  leftFunnelWall,
  rightFunnelWall,
  deathZone,
  ball,
  leftFlipper,
  rightFlipper,
  leftFlipperConstraint,
  rightFlipperConstraint,
  aiLeftFunnelWall,
  aiRightFunnelWall,
  aiLeftFlipper,
  aiRightFlipper,
  aiLeftConstraint,
  aiRightConstraint,
  triggerBody   // plunger, plungerShelf 삭제
]);
```

- **무엇을 하는가**: 플런저 관련 물리 바디 2개를 월드에서 제거
- `plunger`, `plungerShelf`를 목록에서 삭제하면 Matter.js 물리 연산 대상에서 제외됨

### 4. beforeUpdate 플런저 당기기 로직 제거

```javascript
// 삭제 대상 (line 789~798)
if (isSpacePressed.current) {
  const currentY = plunger.position.y;
  if (currentY < PLUNGER_MAX_PULL_Y) {
    Body.setPosition(plunger, {
      x: PLUNGER_X,
      y: Math.min(currentY + PLUNGER_PULL_SPEED, PLUNGER_MAX_PULL_Y)
    });
  }
}
```

- **무엇을 하는가**: `beforeUpdate` 이벤트에서 플런저 물리 조작 코드 삭제
- 삭제 후 `beforeUpdate` 블록에는 플리퍼 각도 제어와 AI 판단 로직만 남음

### 5. afterRender 스프링 코일 드로잉 제거

```javascript
// 삭제 대상 (line 820~840 전체)
const px = plunger.position.x;
const py = plunger.position.y + 8;
// ... 스프링 코일 ctx 드로잉 코드 전체
ctx.restore();
```

- **무엇을 하는가**: `afterRender`에서 플런저 시각화(스프링 코일 그리기) 코드 삭제
- 삭제 후 `afterRender` 블록에는 범퍼 글로우, 목표물 드로잉만 남음

### 6. plungerStartRef / plungerReleaseRef 등록 코드 삭제

```javascript
// 삭제 대상 (line 973~999)
plungerStartRef.current = () => { ... };
plungerReleaseRef.current = () => { ... };
```

- **무엇을 하는가**: 모바일 버튼에서 호출하는 플런저 핸들러 등록 코드 삭제

### 7. handleKeyDown / handleKeyUp Space 플런저 로직 제거

```javascript
// handleKeyDown에서 삭제 (line 1043~1051)
if (event.key === ' ' || event.code === 'Space') {
  event.preventDefault();
  if (!isSpacePressed.current) {
    isSpacePressed.current = true;
    spaceHoldStartTime.current = Date.now();
  }
}

// handleKeyUp에서 삭제 (line 1111~1132 — 발사 로직 전체)
if (event.key === ' ' || event.code === 'Space') {
  if (isSpacePressed.current) { ... }
}
```

- **무엇을 하는가**: 키보드 이벤트에서 플런저 충전/발사 로직 삭제
- Space 키로 `startGame()` 호출하는 부분(line 1029~1032, `!gameStartedRef.current` 블록)은 유지

### 8. deathZone 복귀 로직 + handleRestart + N키 공 위치 수정

```javascript
// deathZone 충돌 복귀 (line 687)
Body.setPosition(activeBall, { x: 350, y: 550 });
Body.setVelocity(activeBall, {
  x: launchDirectionRef.current * 8,
  y: 8
});

// handleRestart (line 184~185)
Body.setPosition(ball, { x: 350, y: 550 });
Body.setVelocity(ball, { x: launchDirectionRef.current * 8, y: 8 });

// N키 스테이지 전환 (line 1077~1079)
Body.setPosition(ball, { x: 350, y: 550 });
Body.setVelocity(ball, { x: launchDirectionRef.current * 8, y: 8 });
Body.setAngularVelocity(ball, 0);
```

- **무엇을 하는가**: 공 복귀/재시작 시 모두 중앙(350, 550)에서 저장된 방향으로 재발사
- `launchDirectionRef.current`를 재사용하므로 매 게임에서 처음과 동일한 방향 유지
- `handleRestart` 내 플런저 위치 복귀 코드(line 189~192) 삭제

### 9. 모바일 플런저 버튼 UI 삭제

```jsx
// 삭제 대상 (line 1338~1350)
{/* 플런저 버튼 */}
<Box
  onPointerDown={() => { plungerStartRef.current && plungerStartRef.current(); }}
  onPointerUp={() => { plungerReleaseRef.current && plungerReleaseRef.current(); }}
  onPointerLeave={() => { plungerReleaseRef.current && plungerReleaseRef.current(); }}
  sx={{ width: '100px', height: '100px', ... }}
/>
```

- **무엇을 하는가**: 모바일 조작 버튼 3개 중 중앙 플런저 버튼 JSX 삭제
- 삭제 후 모바일에는 왼쪽/오른쪽 플리퍼 버튼 2개만 남음

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | 플런저 ref/바디/핸들러/UI 제거, launchDirectionRef 추가, 공 발사 로직 변경 |

---

## 완료 체크리스트

- [ ] 브라우저에서 게임 시작 시 공이 x=350, y=550 위치에서 출발하는지 확인
- [ ] 공이 왼쪽 아래 또는 오른쪽 아래 방향 중 하나로 랜덤 발사되는지 확인
- [ ] 목숨 감소 후 공 복귀 시 처음과 동일한 방향으로 재발사되는지 확인
- [ ] 재시작 버튼 클릭 후 공이 중앙에서 발사되는지 확인
- [ ] 화면 오른쪽(x=630~700)에 플런저/발판벽 물리 바디가 시각적으로 없는지 확인
- [ ] 모바일에서 중앙 플런저 버튼이 사라지고 좌/우 버튼만 남는지 확인
- [ ] 콘솔에 `plunger`, `plungerShelf` 관련 참조 오류가 없는지 확인
- [ ] Space 키로 게임 시작이 정상 동작하는지 확인
