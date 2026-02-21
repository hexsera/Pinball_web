# AI 대전 핀볼 게임 실행계획

## 요구사항 요약

**요구사항**: 기존 1인용 핀볼(`/pinball`)을 유지하면서, 상단에 AI 제어 플리퍼 2개를 추가한 AI 대전 모드를 구현한다. PinballPage 헤더에 "AI 대전" 버튼을 추가하여, 버튼 클릭 시 Pinball 컴포넌트가 AIPinball 컴포넌트로 전환된다.

**목적**: 플레이어가 공을 위로 올리면 AI 플리퍼가 자동으로 막아내는 대전 구도를 추가하여 게임에 새로운 긴장감을 부여한다. 별도 URL 없이 같은 페이지에서 모드를 전환할 수 있어 접근성이 높다.

## 현재상태 분석

- `Pinball.jsx`: 하단 플리퍼 2개(왼쪽 x=265/y=995, 오른쪽 x=400/y=995), `FLIPPER_SPEED=0.3`, `submitScore()` 함수, `bestScore` 상태, beforeUpdate 이벤트 내 플리퍼 제어 로직 존재
- `PinballPage.jsx`: `Pinball`을 하드코딩으로 import, `onReady` prop만 사용, 상태 기반 모드 전환 기능 없음. AppBar에 홈 버튼과 `HeaderUserInfo`만 존재
- `App.jsx`: `/pinball` → `<PinballPage />` 라우트 존재, AI 관련 라우트 없음
- AI 플리퍼, AI 제어 로직, AIPinball 컴포넌트 모두 없음

## 구현 방법

- `Pinball.jsx`를 복사하여 `AIPinball.jsx`를 만들고, AI 플리퍼 추가·불필요 기능 제거만 수행한다.
- `PinballPage.jsx`에 `isAIMode` 상태를 추가하고, 상태에 따라 `<Pinball>` 또는 `<AIPinball>`을 렌더링한다.
- AppBar에 "AI 대전" 토글 버튼을 추가하여 `isAIMode`를 제어한다. 모드 전환 시 `isReady`를 초기화하여 게임을 재시작한다.
- `App.jsx`는 변경하지 않는다. `/ai-pinball` 별도 라우트를 만들지 않는다.

## 구현 단계

### 1. AIPinball.jsx 파일 생성 (Pinball.jsx 복사)

```bash
mkdir -p frontend/src/pages/AIPinball
cp frontend/src/pages/Pinball/Pinball.jsx \
   frontend/src/pages/AIPinball/AIPinball.jsx
```

- `frontend/src/pages/AIPinball/` 디렉토리를 생성하고 Pinball.jsx를 복사한다.
- 복사 후 아래 단계에서 AI 관련 코드를 추가/제거한다.

### 2. AIPinball.jsx - submitScore 및 bestScore 제거

```jsx
// 제거할 상태 (53줄 근처)
// const [bestScore, setBestScore] = useState(null);  ← 삭제

// 제거할 함수 (91~108줄 근처)
// const submitScore = async () => { ... }  ← 삭제

// 게임오버 시 호출 제거
// submitScore();  ← 삭제

// 게임오버 오버레이에서 제거
// <Typography>최고 점수: {bestScore !== null ? bestScore : '---'}</Typography>  ← 삭제
```

- AI 대전 모드는 서버에 점수를 저장하지 않으므로 `submitScore`, `bestScore` 관련 코드를 모두 제거한다.

### 3. AIPinball.jsx - 타이틀 및 안내문구 변경

```jsx
// 타이틀 변경
<Typography sx={{ fontSize: '92px', fontWeight: 'bold', color: '#e94560', ... }}>
  AI PINBALL
</Typography>

// SPACE 안내 아래에 추가
<Typography sx={{ color: '#aaaaaa', fontSize: '24px', mb: 4 }}>
  AI 플리퍼가 상단에서 공을 막습니다
</Typography>
```

- 타이틀을 `AI PINBALL`로 변경하여 AI 대전 모드임을 시각적으로 표시한다.
- 안내문구를 추가하여 플레이어에게 AI 플리퍼의 존재를 알린다.

### 4. AIPinball.jsx - AI 플리퍼 각도 상수 추가

```javascript
// 기존 플리퍼 상수 아래에 추가
const AI_LEFT_MIN_ANGLE  = -35 * Math.PI / 180;  // 올린 상태 (반시계)
const AI_LEFT_MAX_ANGLE  =  15 * Math.PI / 180;  // 내린 상태 (시계)
const AI_RIGHT_MIN_ANGLE = -15 * Math.PI / 180;  // 내린 상태 (반시계)
const AI_RIGHT_MAX_ANGLE =  35 * Math.PI / 180;  // 올린 상태 (시계)
```

- 상단 플리퍼는 하단 플리퍼의 상하 반전이므로 각도 범위는 동일하나 올리기/내리기 방향이 반대다.
- `AI_LEFT_MIN_ANGLE(-35도)`가 올린 상태, `AI_LEFT_MAX_ANGLE(15도)`가 내린 상태다.

### 5. AIPinball.jsx - AI 플리퍼 Bodies 및 Constraint 생성

```javascript
const aiLeftFlipper = Bodies.rectangle(400, 105, 100, 20, {
  chamfer: { radius: 10 },
  render: { fillStyle: '#e74c3c' },
  density: 0.001, isSleeping: false, sleepThreshold: Infinity
});
const aiRightFlipper = Bodies.rectangle(265, 105, 100, 20, {
  chamfer: { radius: 10 },
  render: { fillStyle: '#e74c3c' },
  density: 0.001, isSleeping: false, sleepThreshold: Infinity
});
const aiLeftConstraint = Constraint.create({
  bodyA: aiLeftFlipper, pointA: { x: 40, y: 0 },
  pointB: { x: 440, y: 105 }, stiffness: 1, damping: 0, length: 0
});
const aiRightConstraint = Constraint.create({
  bodyA: aiRightFlipper, pointA: { x: -40, y: 0 },
  pointB: { x: 225, y: 105 }, stiffness: 1, damping: 0, length: 0
});
Composite.add(world, [aiLeftFlipper, aiRightFlipper, aiLeftConstraint, aiRightConstraint]);
```

- AI 플리퍼는 y=105(상단)에 배치하며, 기존 하단 플리퍼와 좌우가 반전된다.
- `#e74c3c`(빨간색)으로 AI 플리퍼와 플레이어 플리퍼를 시각적으로 구분한다.
- `Constraint`로 회전축을 고정하며, 기존 플리퍼와 동일한 패턴을 사용한다.

### 6. AIPinball.jsx - AI 플리퍼 상태 변수 선언

```javascript
// 기존 isLeftKeyPressed, isRightKeyPressed ref 아래에 추가
const isAILeftPressed  = useRef(false);
const isAIRightPressed = useRef(false);
```

- 플레이어 플리퍼가 `isLeftKeyPressed.current` / `isRightKeyPressed.current`로 제어되는 것과 동일한 구조다.
- `useRef`를 사용하므로 값이 바뀌어도 리렌더링이 발생하지 않는다.

### 7. AIPinball.jsx - beforeUpdate에 AI 판단 로직 추가 (bool 갱신)

```javascript
// beforeUpdate 이벤트 내부 — 플레이어 플리퍼 제어 블록 위에 추가
const AI_ACTIVATION_Y = 300;
const AI_LEFT_CENTER_X = 400;
const AI_RIGHT_CENTER_X = 265;
const AI_REACTION_DISTANCE = 160;

const ballPos = ball.position;
const ballVel = ball.velocity;

if (ballPos.y < AI_ACTIVATION_Y && ballVel.y < 0) {
  isAILeftPressed.current  = Math.abs(ballPos.x - AI_LEFT_CENTER_X)  < AI_REACTION_DISTANCE;
  isAIRightPressed.current = Math.abs(ballPos.x - AI_RIGHT_CENTER_X) < AI_REACTION_DISTANCE;
} else {
  isAILeftPressed.current  = false;
  isAIRightPressed.current = false;
}
```

- AI 판단부는 `isAILeftPressed.current` / `isAIRightPressed.current`에 bool 값만 기록한다.
- 실제 플리퍼 물리 제어는 아래 단계(8)에서 분리하여 처리한다.

### 8. AIPinball.jsx - beforeUpdate에 AI 플리퍼 물리 제어 추가 (bool 소비)

```javascript
// 7단계 코드 바로 아래 — 플레이어 플리퍼 제어 패턴과 동일한 구조
if (isAILeftPressed.current) {
  Body.setAngularVelocity(aiLeftFlipper, FLIPPER_SPEED);   // 올리기 (시계 방향)
} else {
  Body.setAngularVelocity(aiLeftFlipper, -FLIPPER_SPEED);  // 내리기 (반시계 방향)
}
if (aiLeftFlipper.angle > AI_LEFT_MAX_ANGLE)  Body.setAngle(aiLeftFlipper, AI_LEFT_MAX_ANGLE);
if (aiLeftFlipper.angle < AI_LEFT_MIN_ANGLE)  Body.setAngle(aiLeftFlipper, AI_LEFT_MIN_ANGLE);

if (isAIRightPressed.current) {
  Body.setAngularVelocity(aiRightFlipper, -FLIPPER_SPEED); // 올리기 (반시계 방향)
} else {
  Body.setAngularVelocity(aiRightFlipper, FLIPPER_SPEED);  // 내리기 (시계 방향)
}
if (aiRightFlipper.angle > AI_RIGHT_MAX_ANGLE) Body.setAngle(aiRightFlipper, AI_RIGHT_MAX_ANGLE);
if (aiRightFlipper.angle < AI_RIGHT_MIN_ANGLE) Body.setAngle(aiRightFlipper, AI_RIGHT_MIN_ANGLE);
```

- `isAILeftPressed.current`의 true/false를 읽어 플리퍼 속도를 결정하는 구조가 플레이어 플리퍼와 완전히 동일하다.
- 판단(7단계)과 물리 제어(8단계)가 분리되어, 나중에 AI 로직만 교체해도 물리 제어 코드는 수정할 필요가 없다.
- 각도 클램핑으로 플리퍼가 지정 범위를 벗어나지 않도록 제한한다.

### 9. AIPinball/index.js 생성

```javascript
export { default } from './AIPinball';
```

- 디렉토리 기반 import(`import AIPinball from '../AIPinball'`)를 지원하기 위한 re-export 파일이다.

### 10. PinballPage.jsx - isAIMode 상태 및 "AI 대전" 버튼 추가

```jsx
import Pinball from '../Pinball';
import AIPinball from '../AIPinball';
import { Button } from '@mui/material';  // 기존 import에 Button 추가

function PinballPage() {
  const [isAIMode, setIsAIMode] = useState(false);
  // 기존 isReady, gameScale 등 상태 유지

  const handleModeToggle = () => {
    setIsAIMode(prev => !prev);
    setIsReady(false);  // 게임 컴포넌트 재마운트를 위해 초기화
  };

  // AppBar Toolbar 내부, HomeIcon 옆에 버튼 추가
  <Button
    onClick={handleModeToggle}
    variant={isAIMode ? 'contained' : 'outlined'}
    size="small"
    sx={{
      ml: 1,
      color: isAIMode ? '#ffffff' : '#e74c3c',
      borderColor: '#e74c3c',
      backgroundColor: isAIMode ? '#e74c3c' : 'transparent',
      '&:hover': { backgroundColor: '#c0392b', color: '#ffffff', borderColor: '#c0392b' },
    }}
  >
    {isAIMode ? 'AI 대전 ON' : 'AI 대전'}
  </Button>

  // 게임 영역에서 모드에 따라 컴포넌트 교체
  {isAIMode
    ? <AIPinball key="ai" onReady={() => setIsReady(true)} />
    : <Pinball    key="normal" onReady={() => setIsReady(true)} />
  }
}
```

- `isAIMode` 상태로 렌더링할 게임 컴포넌트를 결정한다.
- `key` prop을 각각 다르게 설정하여, 버튼 클릭 시 React가 컴포넌트를 완전히 언마운트·재마운트하도록 강제한다. 이렇게 해야 Matter.js 엔진이 초기화된다.
- `handleModeToggle`에서 `setIsReady(false)`를 함께 호출하여 모드 전환 중 로딩 스피너를 표시한다.
- 버튼은 AI 대전 모드일 때 `contained`(채워진) 스타일로 활성 상태를 표시한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 생성 | Pinball.jsx 복사 후 AI 플리퍼 추가, submitScore/bestScore 제거, 타이틀 변경 |
| `frontend/src/pages/AIPinball/index.js` | 생성 | AIPinball default re-export |
| `frontend/src/pages/PinballPage/PinballPage.jsx` | 수정 | `isAIMode` 상태 추가, "AI 대전" 토글 버튼 추가, 모드에 따른 게임 컴포넌트 조건부 렌더링 |

## 완료 체크리스트

- [ ] `/pinball` 접속 시 기본 모드로 기존 핀볼이 정상 동작한다
- [ ] AppBar에 "AI 대전" 버튼이 표시된다
- [ ] "AI 대전" 버튼 클릭 시 버튼 스타일이 활성 상태(빨간 배경)로 변경된다
- [ ] 버튼 클릭 후 로딩 스피너가 표시되다가 AIPinball 게임 화면으로 전환된다
- [ ] AI 대전 모드 시작 화면 타이틀이 `AI PINBALL`로 표시된다
- [ ] AI 대전 모드에서 화면 상단에 빨간색 AI 플리퍼 2개가 표시된다
- [ ] 공이 y=300 이하로 올라올 때 AI 플리퍼가 자동으로 작동한다
- [ ] "AI 대전" 버튼을 다시 클릭하면 일반 핀볼 모드로 돌아온다
- [ ] 모드 전환 시 이전 게임 상태가 초기화되고 새 게임이 시작된다
- [ ] AI 대전 모드에서 게임오버 시 월간 점수 API가 호출되지 않는다
- [ ] AI 대전 모드 게임오버 오버레이에 `최고 점수` 항목이 표시되지 않는다
