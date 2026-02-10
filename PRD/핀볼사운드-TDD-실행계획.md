# 핀볼 사운드 추가 - TDD 실행계획

## 목표

Pinball.jsx에 두 가지 사운드를 추가한다.

1. 플리퍼 작동 시 (`ArrowLeft` / `ArrowRight` 키, 터치) → `public/audio/fliper.mp3` 재생
2. life가 줄어들 때 → `public/audio/lifedown.wav` 재생

---

## 핵심 개념: 유틸 파일 추출이란?

### 문제 상황

`Pinball.jsx`는 다음과 같은 브라우저 전용 기술들을 사용한다.

```
Pinball.jsx
├── Matter.js (물리 엔진, 캔버스 기반)
├── window 이벤트 (keydown, keyup, touchstart 등)
├── Audio API (new Audio(), .play())
├── HTMLElement (sceneRef, canvas)
└── axios (HTTP 요청)
```

Vitest는 **Node.js 환경 + jsdom**에서 실행된다. jsdom은 브라우저를 흉내내지만 Matter.js가 요구하는 캔버스 렌더링, 물리 시뮬레이션은 jsdom에서 동작하지 않는다.

따라서 Pinball.jsx 전체를 렌더링(`render(<Pinball />)`)하면 Matter.js 에러로 테스트 자체가 깨진다.

### 해결책: 로직 분리 (유틸 추출)

사운드 재생 로직을 **별도 파일로 분리**하면, 해당 파일만 독립적으로 테스트할 수 있다.

```
변경 전:
Pinball.jsx ──── 사운드 로직 (테스트 불가)
                 Matter.js 로직

변경 후:
Pinball.jsx ──── Matter.js 로직
     └──────── pinballSound.js (사운드 로직, 테스트 가능)
```

### pinballSound.js 역할

```javascript
// frontend/src/pinballSound.js

// 플리퍼 사운드 재생
export function playFlipperSound(audioRef) {
  if (audioRef) {
    audioRef.currentTime = 0;
    audioRef.play();
  }
}

// 라이프다운 사운드 재생
export function playLifeDownSound(audioRef) {
  if (audioRef) {
    audioRef.currentTime = 0;
    audioRef.play();
  }
}
```

이 함수들은 `Audio 객체`를 인자로 받는다. 따라서 테스트에서는 **가짜(mock) Audio 객체**를 넘겨서 `play()`가 호출됐는지만 확인하면 된다.

---

## RED 계획이란?

TDD의 첫 번째 단계인 **RED**는 "아직 존재하지 않는 기능을 테스트하는 코드를 먼저 작성"하는 것이다.

- 코드가 없으므로 테스트는 **반드시 실패**해야 한다
- 실패를 확인해야만 테스트가 올바른 것을 검증하고 있음을 알 수 있다
- "테스트가 통과했다" = 기능이 이미 있거나 테스트가 잘못된 것

### RED가 유효한 이유

```
1. playFlipperSound 함수가 아직 없다
2. pinballSound.js 파일이 아직 없다
3. import { playFlipperSound } from '../pinballSound' → 파일 없음 에러 발생
4. → 테스트 실패 (RED 확인)
```

---

## 전체 TDD 진행 순서

### 1단계: playFlipperSound RED

**테스트 파일**: `frontend/src/test/PinballSound.test.jsx`

```javascript
import { playFlipperSound } from '../pinballSound'  // 아직 없는 파일

describe('playFlipperSound', () => {
  it('플리퍼 버튼을 누르면 flipper 사운드의 play()가 호출된다', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const mockAudio = { play: mockPlay, currentTime: 0 }

    playFlipperSound(mockAudio)

    expect(mockPlay).toHaveBeenCalledTimes(1)
  })
})
```

**예상 실패 이유**: `pinballSound.js` 파일이 없어서 import 에러

---

### 2단계: playFlipperSound GREEN

`frontend/src/pinballSound.js` 파일 생성:
```javascript
export function playFlipperSound(audio) {
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
}
```

`Pinball.jsx` 연결:
- `fliperSoundRef` 추가 (`new Audio('/audio/fliper.mp3')`)
- `handleKeyDown`의 ArrowLeft/ArrowRight에서 `playFlipperSound(fliperSoundRef.current)` 호출
- `handleTouchStart`에서도 동일하게 호출

---

### 3단계: playLifeDownSound RED

```javascript
import { playLifeDownSound } from '../pinballSound'

describe('playLifeDownSound', () => {
  it('life가 줄어들면 lifedown 사운드의 play()가 호출된다', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const mockAudio = { play: mockPlay, currentTime: 0 }

    playLifeDownSound(mockAudio)

    expect(mockPlay).toHaveBeenCalledTimes(1)
  })
})
```

**예상 실패 이유**: `playLifeDownSound` 함수가 아직 없음

---

### 4단계: playLifeDownSound GREEN

`frontend/src/pinballSound.js`에 추가:
```javascript
export function playLifeDownSound(audio) {
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
}
```

`Pinball.jsx` 연결:
- `lifeDownSoundRef` 추가 (`new Audio('/audio/lifedown.wav')`)
- deathZone 충돌 이벤트에서 `playLifeDownSound(lifeDownSoundRef.current)` 호출

---

## Mock이란?

테스트에서 실제 `Audio` 객체를 생성하면 jsdom 환경에서는 실제 오디오 파일을 재생할 수 없다 (`NotSupportedError`). 따라서 **가짜 Audio 객체(mock)**를 만들어서 `play()`가 호출됐는지만 검증한다.

```javascript
// 실제 Audio 객체 (테스트 불가)
const audio = new Audio('/audio/fliper.mp3')
audio.play()  // jsdom에서 에러 발생

// Mock Audio 객체 (테스트 가능)
const mockAudio = {
  play: vi.fn().mockResolvedValue(undefined),  // play()를 가짜 함수로 대체
  currentTime: 0
}
playFlipperSound(mockAudio)
expect(mockAudio.play).toHaveBeenCalledTimes(1)  // ✅ play()가 1번 호출됐는지 확인
```

`vi.fn()`은 Vitest의 함수 모킹 유틸로, 해당 함수가 몇 번 호출됐는지 추적한다.

---

## 파일 변경 요약

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/pinballSound.js` | 신규 생성 (playFlipperSound, playLifeDownSound) |
| `frontend/src/test/PinballSound.test.jsx` | 신규 생성 (테스트 파일) |
| `frontend/src/Pinball.jsx` | fliperSoundRef, lifeDownSoundRef 추가 + 호출 연결 |

---

## 오디오 파일 필요

다음 파일이 `frontend/public/audio/`에 존재해야 한다.

| 파일 | 용도 |
|------|------|
| `fliper.mp3` | 플리퍼 작동 시 재생 |
| `lifedown.wav` | 라이프 감소 시 재생 |
