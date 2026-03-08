# 핀볼 게임 시작 UI 실행계획

## 요구사항 요약

**요구사항**: 핀볼 게임 진입 시 키 조작 설명과 시작 안내 UI를 표시하고, 스페이스바 또는 클릭으로 게임을 시작한다.

**목적**: 사용자에게 조작 방법을 안내하고, 사용자 인터랙션(키/클릭) 발생 시점에 BGM을 재생하여 크롬 자동재생 정책(Autoplay Policy)을 우회한다.

## 현재상태 분석

- `Pinball.jsx`에서 `Runner.run(runner, engine)` 호출 시 물리 엔진이 즉시 실행됨
- `runner`는 `useEffect` 내 지역변수로 선언되어 외부에서 제어 불가
- `overlayState`(null | 'gameOver')로 게임오버 오버레이를 별도 관리 중
- `bgmRef.current.play()`가 자동 호출되지 않아 BGM이 없는 상태로 게임 시작됨
- `handleKeyDown`에서 Space 키는 플런저 충전 전용으로만 처리됨

## 구현 방법

- `gameStarted` state(boolean)로 시작 UI와 실제 게임을 분기
- `engine.timing.timeScale = 0`으로 물리 연산을 정지하여 게임 속도를 0으로 만듦
- `gameStartedRef`(useRef)를 사용하여 클로저 내 이벤트 핸들러에서 최신 상태를 참조
- 시작 UI는 게임 영역 위에 absolute 오버레이로 렌더링

## 구현 단계

### 1. 상태 및 ref 추가

```javascript
const [gameStarted, setGameStarted] = useState(false);
const gameStartedRef = useRef(false);
```
- **무엇을 하는가**: 게임 시작 여부를 추적하는 state와, 이벤트 핸들러 클로저 내에서 최신 값을 읽기 위한 ref를 추가
- `useState`는 UI 렌더링 분기용, `useRef`는 `handleKeyDown` 클로저 내 최신 값 동기화용
- 두 값은 항상 함께 업데이트 해야 한다: `gameStartedRef.current = true; setGameStarted(true);`

### 2. 엔진 초기 timeScale 0 설정 및 runnerRef 추가

```javascript
const runnerRef = useRef(null);

// useEffect 내 엔진 생성 직후
const engine = Engine.create({ gravity: { x: 0, y: 1 } });
engine.timing.timeScale = 0; // 시작 전 물리 정지

const runner = Runner.create();
runnerRef.current = runner;
Runner.run(runner, engine);
```
- **무엇을 하는가**: 물리 엔진이 시작되더라도 `timeScale=0`이면 모든 물리 연산이 정지 상태가 됨
- `Runner.run()`은 그대로 호출하되, timeScale로 속도만 제어
- `runnerRef`에 runner를 저장하여 나중에 외부에서도 접근 가능하게 함

### 3. 게임 시작 함수 작성

```javascript
const startGame = () => {
  if (gameStartedRef.current) return;
  gameStartedRef.current = true;
  setGameStarted(true);
  engineRef.current.timing.timeScale = 1;
  bgmRef.current?.play().catch(() => {});
  setIsPlaying(true);
};
```
- **무엇을 하는가**: 한 번만 실행되도록 guard를 두고, 엔진 속도를 1로 복원하며 BGM을 재생
- `bgmRef.current.play()`는 사용자 인터랙션 콜백 내에서 호출되므로 크롬 자동재생 정책 우회 가능
- `.catch(() => {})`로 재생 실패 시 에러가 콘솔에 출력되지 않도록 처리

### 4. handleKeyDown에 게임 시작 로직 추가

```javascript
const handleKeyDown = (event) => {
  // 게임 시작 전: Space로 시작
  if (!gameStartedRef.current) {
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      startGame();
    }
    return; // 게임 시작 전에는 다른 키 무시
  }
  // 기존 키 처리 로직 (ArrowLeft, ArrowRight, Space 플런저, N 스테이지)...
};
```
- **무엇을 하는가**: 게임이 시작되기 전에는 Space 키만 인식하고 나머지 키 입력을 차단
- `return`으로 기존 플런저/플리퍼 로직이 실행되지 않게 막음
- `gameStartedRef.current`로 클로저 내 최신 상태를 읽음

### 5. 게임 시작 UI 오버레이 렌더링

```jsx
{!gameStarted && (
  <Box sx={{
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  }}>
    <Typography sx={{ fontSize: '52px', fontWeight: 'bold', color: '#e94560',
      textShadow: '0 0 20px #e94560, 0 0 40px #e94560', mb: 4 }}>
      PINBALL
    </Typography>
    <Typography sx={{ color: '#ffffff', mb: 1 }}>← → : 플리퍼 조작</Typography>
    <Typography sx={{ color: '#ffffff', mb: 4 }}>SPACE : 플런저 발사</Typography>
    <Typography sx={{ color: '#f39c12', fontSize: '20px', fontWeight: 'bold' }}>
      PRESS SPACE TO START
    </Typography>
  </Box>
)}
```
- **무엇을 하는가**: `gameStarted=false`일 때 게임 캔버스 위에 반투명 오버레이를 표시
- 제목은 `textShadow`로 네온 글로우 효과 적용

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/Pinball/Pinball.jsx` | 수정 | gameStarted state/ref 추가, timeScale 제어, startGame 함수, 시작 UI 오버레이 추가 |

## 완료 체크리스트

- [ ] 게임 페이지 진입 시 "PINBALL" 제목과 키 설명, "PRESS SPACE TO START"가 표시된다
- [ ] 시작 UI가 표시된 상태에서 공과 플리퍼가 움직이지 않는다
- [ ] 스페이스바를 누르면 시작 UI가 사라지고 게임이 시작된다
- [ ] 게임 시작 시 BGM이 자동으로 재생된다
- [ ] 게임 시작 후 상단 볼륨 아이콘이 켜진 상태(VolumeUpIcon)로 표시된다
- [ ] 게임 시작 전에는 ArrowLeft/Right 키를 눌러도 플리퍼가 움직이지 않는다
