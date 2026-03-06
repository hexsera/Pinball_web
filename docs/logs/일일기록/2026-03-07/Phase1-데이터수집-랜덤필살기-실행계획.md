# Phase 1: 데이터 수집 + 40초 타이머로 랜덤 필살기 활성화 실행계획

## 요구사항 요약

**요구사항**: 게임 시작 시 플립퍼 영역에 sensor body를 생성하고, 공이 그 안에 있을 때 100ms마다 데이터를 수집한다. 40초 후 수집된 데이터를 콘솔에 출력하고, 랜덤으로 필살기 종류를 결정해 `SkillIcon`에 반영한다. `a` 키로 필살기를 발동하고, `b`/`s`/`l` 테스트 키를 제거한다.

**목적**: Phase 2에서 AI API로 플레이스타일을 분류하기 위한 데이터 수집 기반을 마련하고, 전체 흐름(수집→분류→필살기 활성화)을 먼저 로컬에서 검증한다.

## 현재상태 분석

- `AIPinball.jsx`에 `skillState` state, `activateSpecialRef`, `bigBallRef`, `smallBallRef`가 선언되어 있다.
- `isLeftKeyPressedRef`, `isRightKeyPressedRef`로 플립퍼 키 입력 상태를 추적 중이다.
- `handleKeyDown`에 `b`/`s`/`l` 키로 `skillState`를 직접 변경하는 테스트 코드가 존재한다 (966~976줄).
- 플립퍼 위치: 왼쪽 플립퍼 중심 `(265, 995)`, 오른쪽 플립퍼 중심 `(400, 995)`, 둘 다 100×20 크기.
- Trigger sensor body, 충돌 이벤트, 데이터 수집 interval, 40초 타이머는 아직 존재하지 않는다.

## 구현 방법

Matter.js `Bodies.rectangle`로 플립퍼 두 개를 완전히 덮는 하나의 넓은 sensor body를 생성한다. `Matter.Events.on(engine, 'collisionStart/End')`로 공의 진입/이탈을 감지한다. `setInterval`(100ms)로 진입 중일 때만 데이터를 배열에 push한다. `setTimeout`(40초)으로 수집 종료 후 랜덤 필살기를 결정한다. `useEffect` cleanup에서 interval/timer를 해제한다.

## 구현 단계

### 1. useRef 선언 추가

```javascript
// AIPinball 함수 상단 기존 useRef 선언부에 추가
const isBallInTriggerRef = useRef(false);
const playstyleDataRef = useRef([]);
const collectIntervalRef = useRef(null);
const analysisTimerRef = useRef(null);
```

- `isBallInTriggerRef`: 공이 trigger body 안에 있는지 여부를 저장
- `playstyleDataRef`: 수집된 데이터 객체들을 담는 배열
- `collectIntervalRef`, `analysisTimerRef`: cleanup 시 해제할 ID 보관

### 2. Trigger sensor body 생성

```javascript
// leftFlipper, rightFlipper Bodies 생성 코드 다음에 추가
// 왼쪽 플립퍼 왼쪽 끝 x=225, 오른쪽 플립퍼 오른쪽 끝 x=440
// 너비: 440-225=215, 중심 x: (225+440)/2=332.5
const triggerBody = Bodies.rectangle(332, 995, 215, 60, {
  isStatic: true,
  isSensor: true,
  label: 'flipperTrigger',
  render: {
    fillStyle: '#00ff00',
    opacity: 0.3
  }
});
```

- `isSensor: true`: 물리 충돌 없이 감지만 수행
- 너비 215px: 왼쪽 플립퍼 끝(x=225)부터 오른쪽 플립퍼 끝(x=440)을 포괄
- 높이 60px: 플립퍼가 움직이는 범위를 충분히 커버

### 3. triggerBody를 World에 추가

```javascript
// World.add 호출부에 triggerBody 추가
World.add(engine.world, [
  // ...기존 bodies...,
  triggerBody,
]);
```

- 기존 `World.add` 호출에 `triggerBody`를 함께 추가한다.

### 4. 충돌 이벤트 등록 (진입/이탈 감지)

```javascript
Matter.Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach(({ bodyA, bodyB }) => {
    const isTrigger = bodyA.label === 'flipperTrigger' || bodyB.label === 'flipperTrigger';
    const isBall = bodyA.label === 'ball' || bodyB.label === 'ball';
    if (isTrigger && isBall) isBallInTriggerRef.current = true;
  });
});

Matter.Events.on(engine, 'collisionEnd', (event) => {
  event.pairs.forEach(({ bodyA, bodyB }) => {
    const isTrigger = bodyA.label === 'flipperTrigger' || bodyB.label === 'flipperTrigger';
    const isBall = bodyA.label === 'ball' || bodyB.label === 'ball';
    if (isTrigger && isBall) isBallInTriggerRef.current = false;
  });
});
```

- `collisionStart`/`collisionEnd`에서 label로 trigger와 ball 쌍을 식별해 ref를 갱신한다.
- 기존 범퍼 충돌 이벤트 등록 코드 근처에 함께 배치한다.

### 5. 데이터 수집 interval 시작 (startGame 함수 내)

```javascript
// startGame() 함수 내 게임 시작 처리 코드 다음에 추가
playstyleDataRef.current = [];

collectIntervalRef.current = setInterval(() => {
  if (!isBallInTriggerRef.current) return;
  const ball = ballRef.current;
  if (!ball) return;
  playstyleDataRef.current.push({
    timestamp: Date.now(),
    ballX: ball.position.x,
    ballY: ball.position.y,
    ballVX: ball.velocity.x,
    ballVY: ball.velocity.y,
    leftFlipper: isLeftKeyPressedRef.current,
    rightFlipper: isRightKeyPressedRef.current,
  });
}, 100);
```

- `isBallInTriggerRef.current`가 `false`이면 즉시 return해 수집하지 않는다.
- 100ms마다 실행되므로 초당 최대 10개 데이터가 쌓인다.

### 6. 40초 타이머 설정 (startGame 함수 내)

```javascript
// collectIntervalRef 설정 직후에 추가
analysisTimerRef.current = setTimeout(() => {
  clearInterval(collectIntervalRef.current);
  console.log('수집된 플레이스타일 데이터:', playstyleDataRef.current);

  const randomSkill = Math.random() < 0.5 ? 'big' : 'small';
  setSkillState(randomSkill);
}, 40000);
```

- 40초 후 interval을 중단하고, 수집 데이터를 콘솔에 출력한다.
- `Math.random()`으로 `'big'` 또는 `'small'`을 결정해 `skillState`를 업데이트한다.

### 7. `a` 키 필살기 발동 처리 (handleKeyDown 내)

```javascript
// handleKeyDown 내 b/s/l 키 분기 제거 후 아래 코드로 교체
if (event.key === 'a' || event.key === 'A') {
  if (skillState === 'big') {
    activateSpecialRef.current?.(bigBallRef.current);
  } else if (skillState === 'small') {
    activateSpecialRef.current?.(smallBallRef.current);
  }
  // 'loading' 상태면 아무것도 하지 않음
}
```

- `skillState`가 `'big'`이면 `bigBallRef`, `'small'`이면 `smallBallRef`로 필살기를 발동한다.
- `skillState`가 `'loading'`이면 아무 동작도 하지 않는다.

### 8. useEffect cleanup에서 interval/timer 해제

```javascript
// useEffect return 함수(기존 cleanup 블록)에 추가
return () => {
  // ...기존 cleanup 코드...
  clearInterval(collectIntervalRef.current);
  clearTimeout(analysisTimerRef.current);
};
```

- 컴포넌트가 언마운트될 때 interval과 timeout을 모두 해제해 메모리 누수를 방지한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | useRef 4개 추가, triggerBody 생성 및 World 추가, 충돌 이벤트 등록, startGame에 interval/timer 시작, handleKeyDown에서 b/s/l 제거 및 a 키 추가, cleanup 해제 |

## 완료 체크리스트

- [ ] 게임 시작 시 플립퍼 영역 위에 녹색 반투명 사각형이 화면에 표시된다.
- [ ] 공이 녹색 영역 안에 있을 때 브라우저 콘솔에 데이터 수집 로그가 출력된다 (초당 10회).
- [ ] 공이 녹색 영역 밖으로 나가면 콘솔 로그가 멈춘다.
- [ ] 게임 시작 40초 후 수집된 데이터 배열이 콘솔에 출력된다.
- [ ] 게임 시작 40초 후 `SkillIcon`이 `'big'` 또는 `'small'`로 변경된다.
- [ ] `a` 키 입력 시 `skillState`가 `'big'`이면 큰 공 필살기가 발동된다.
- [ ] `a` 키 입력 시 `skillState`가 `'small'`이면 작은 공 필살기가 발동된다.
- [ ] `skillState`가 `'loading'`일 때 `a` 키를 눌러도 아무 반응이 없다.
- [ ] `b`, `s`, `l` 키를 눌러도 아무 반응이 없다.
- [ ] 게임 페이지에서 나갔다가 돌아와도 콘솔에 interval 관련 에러가 없다.
