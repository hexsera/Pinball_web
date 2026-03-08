# 핀볼 모바일 조작 UI 실행계획

## 요구사항 요약

**요구사항**: 핀볼 게임에 모바일 터치 환경을 감지하고, 터치 환경일 때 흰색 반투명(20%) 원형 버튼 3개(좌 플리퍼, 플런저, 우 플리퍼)를 게임 UI에 표시한다.

**목적**: 키보드가 없는 모바일 환경에서도 핀볼 게임을 조작할 수 있도록 전용 터치 버튼을 제공한다.

## 현재상태 분석

- `Pinball.jsx`에 `handleTouchStart`/`handleTouchEnd`가 이미 존재하지만, sceneRef(캔버스 영역) 전체를 좌/우로 나눠 감지하는 방식이라 플런저(Space) 터치 조작이 없다.
- 별도의 버튼 UI가 없어 모바일에서 플리퍼 위치를 시각적으로 알 수 없다.
- 터치 환경 감지 로직이 없다. 현재 터치 이벤트는 항상 등록된다.

## 구현 방법

- `navigator.maxTouchPoints > 0`으로 터치 가능 환경을 감지해 `isTouchDevice` state로 관리한다.
- 버튼 3개는 게임 하단 영역에 `position: absolute`로 오버레이하며, `pointer-events`를 버튼에만 적용해 게임 캔버스 터치를 방해하지 않는다.
- 버튼의 `onPointerDown`/`onPointerUp`으로 플리퍼/플런저 변수를 직접 조작한다. (`touchstart` 대신 `pointerdown`을 사용하면 마우스·터치 모두 지원)
- 기존 sceneRef의 `touchstart` 핸들러는 버튼 UI가 생기면 불필요해지므로 `isTouchDevice`일 때 등록하지 않도록 분기한다.

## 구현 단계

### 1. 터치 환경 감지 state 추가

```javascript
const [isTouchDevice, setIsTouchDevice] = useState(false);

useEffect(() => {
  setIsTouchDevice(navigator.maxTouchPoints > 0);
}, []);
```

- **무엇을 하는가**: 화면 크기가 아닌 터치 포인트 지원 여부로 모바일 환경을 판단한다.
- `navigator.maxTouchPoints > 0`은 터치스크린이 있는 모든 기기(스마트폰, 태블릿)에서 true를 반환한다.
- 마운트 시 1회만 실행하므로 의존성 배열을 빈 배열로 지정한다.

### 2. 기존 sceneRef touchstart 등록 조건 분기

```javascript
// 기존 코드 (수정 전)
if (sceneRef.current) {
  sceneRef.current.addEventListener('touchstart', handleTouchStart);
  sceneRef.current.addEventListener('touchend', handleTouchEnd);
}

// 수정 후: 터치 디바이스가 아닐 때만 등록 (버튼 UI가 대체)
if (sceneRef.current && !isTouchDevice) {
  sceneRef.current.addEventListener('touchstart', handleTouchStart);
  sceneRef.current.addEventListener('touchend', handleTouchEnd);
}
```

- **무엇을 하는가**: 모바일에서는 버튼 UI가 조작을 담당하므로 캔버스 전체 터치 분기 로직과의 충돌을 방지한다.
- `isTouchDevice`가 false인 데스크탑에서는 기존 터치 이벤트가 그대로 동작한다.

### 3. 플런저 플래그 변수 ref 노출

```javascript
// 기존 Space 키 핸들러가 사용하는 변수를 버튼에서도 접근 가능하도록 확인
// isPlungerCharging 등 플런저 관련 변수가 클로저 내부에 있으면 ref로 변환
const isPlungerChargingRef = useRef(false);
```

- **무엇을 하는가**: 버튼의 `onPointerDown`에서 플런저 충전을, `onPointerUp`에서 발사를 트리거하려면 기존 Space 키 로직과 동일한 변수에 접근해야 한다.
- 기존 Space 로직과 동일한 변수명을 사용하면 별도 중복 구현 없이 재사용 가능하다.
- 기존 코드 구조에 따라 이미 ref인 경우 이 단계는 생략한다.

### 4. 모바일 조작 버튼 3개 JSX 추가

```jsx
{isTouchDevice && (
  <Box sx={{
    position: 'absolute',
    bottom: '40px',
    left: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 40px',
    zIndex: 20,
    pointerEvents: 'none',   // 컨테이너는 터치 통과
  }}>
    {/* 왼쪽 플리퍼 버튼 */}
    <Box
      onPointerDown={() => { isLeftKeyPressed = true; playFlipperSound(fliperSoundRef.current); }}
      onPointerUp={() => { isLeftKeyPressed = false; }}
      onPointerLeave={() => { isLeftKeyPressed = false; }}
      sx={{
        width: '100px', height: '100px', borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        pointerEvents: 'auto',
        userSelect: 'none', touchAction: 'none',
      }}
    />
    {/* 플런저 버튼 */}
    <Box
      onPointerDown={() => { /* Space keydown 로직 실행 */ }}
      onPointerUp={() => { /* Space keyup 로직 실행 */ }}
      onPointerLeave={() => { /* Space keyup 로직 실행 */ }}
      sx={{
        width: '100px', height: '100px', borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        pointerEvents: 'auto',
        userSelect: 'none', touchAction: 'none',
      }}
    />
    {/* 오른쪽 플리퍼 버튼 */}
    <Box
      onPointerDown={() => { isRightKeyPressed = true; playFlipperSound(fliperSoundRef.current); }}
      onPointerUp={() => { isRightKeyPressed = false; }}
      onPointerLeave={() => { isRightKeyPressed = false; }}
      sx={{
        width: '100px', height: '100px', borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        pointerEvents: 'auto',
        userSelect: 'none', touchAction: 'none',
      }}
    />
  </Box>
)}
```

- **무엇을 하는가**: 게임 하단에 반투명 원형 버튼 3개를 오버레이하여 모바일에서 플리퍼와 플런저를 조작한다.
- 부모 Box에 `pointerEvents: 'none'`을 주고 각 버튼에만 `pointerEvents: 'auto'`를 주어 버튼 외 영역의 게임 터치를 막지 않는다.
- `onPointerLeave`로 버튼 밖으로 손가락이 벗어나도 플리퍼가 해제되도록 한다.
- `touchAction: 'none'`으로 브라우저 기본 스크롤 동작을 막아 버튼 오작동을 방지한다.
- 버튼 위치는 게임 영역(`position: relative` Box) 안에 `position: absolute`로 배치한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/Pinball/Pinball.jsx` | 수정 | isTouchDevice state 추가, 모바일 버튼 JSX 추가, touchstart 등록 조건 분기 |

## 완료 체크리스트

- [ ] 모바일(또는 브라우저 DevTools 터치 에뮬레이션)에서 접속 시 원형 버튼 3개가 게임 하단에 표시됨
- [ ] 데스크탑에서 접속 시 버튼이 표시되지 않음
- [ ] 왼쪽 버튼을 누르는 동안 왼쪽 플리퍼가 올라가고, 떼면 내려옴
- [ ] 오른쪽 버튼을 누르는 동안 오른쪽 플리퍼가 올라가고, 떼면 내려옴
- [ ] 가운데 버튼을 누르면 플런저가 충전되고, 떼면 공이 발사됨
- [ ] 버튼 영역 외 게임 화면 터치가 게임 플레이에 영향을 주지 않음
