# Pinball 게임 흐름 정리

## 파일 구성

| 파일 | 역할 |
|------|------|
| `Pinball.jsx` | 메인 컴포넌트. 모든 게임 로직, 물리 엔진, 렌더링 포함 |
| `stageConfigs.js` | 스테이지별 범퍼/장애물/목표물 좌표 데이터 |
| `pinballRestart.js` | 재시작 시 초기 상태값 반환 (`getRestartState`) |
| `pinballSound.js` | 사운드 재생 유틸 함수 4개 |
| `WallOverlay.jsx` | CSS로 그린 벽 오버레이 (Canvas 아래 배치) |
| `index.js` | Pinball 컴포넌트 re-export |

---

## 게임 전체 흐름

```
[페이지 진입]
  ↓ useEffect (마운트)
  ├─ loadGameSession() → 세션 있으면 score/lives/stage 복원
  ├─ game_visits API 호출 (방문 기록)
  ├─ 오디오 객체 생성
  ├─ Matter.js Engine/Render/Runner 초기화
  ├─ 물리 오브젝트 생성 (벽, 플리퍼, 공, 플런저, deathZone 등)
  └─ 스테이지 1 맵 로딩 (범퍼/목표물 배치)
         ↓
  engine.timing.timeScale = 0  ← 물리 일시정지 (게임 시작 전 대기 상태)

[게임 시작 대기 화면]
  Space 키 또는 화면 클릭
         ↓
  startGame() → timeScale = 1, BGM 재생

[게임 진행 중]
  ← ArrowLeft / ArrowRight: 플리퍼 조작
  ← Space: 플런저 충전(누르는 동안) → 발사(뗄 때)
  ← 30초마다: saveGameSession() PUT 요청

  [공 충돌 이벤트 - collisionStart]
  ├─ 범퍼 충돌 → 추가 속도 부여 + 사운드
  ├─ 목표물 충돌 → +300점
  └─ deathZone 충돌
       ├─ lives > 0: 목숨 -1, 공 Plunger lane으로 복귀, saveGameSession() 즉시 저장
       └─ lives == 0: 공 제거, 게임오버 overlay 표시, submitScore(), deleteGameSession()

[게임오버 overlay]
  재시작 버튼 클릭
         ↓
  handleRestart()
  ├─ score/lives/stage 초기화 (0, 3, 1)
  ├─ 공을 Plunger lane으로 복귀
  ├─ 스테이지 1 맵 재로딩
  └─ deleteGameSession()
```

---

## 상태 관리 구조

게임 로직은 Matter.js 이벤트 콜백 내부에서 동작하므로, React 상태와 ref를 이중으로 관리한다.

| 값 | useState | useRef | 이유 |
|----|----------|--------|------|
| score | `score` | `scoreRef` | 렌더링(표시)용 + 콜백 내 최신값 읽기 |
| lives | `lives` | `livesRef` | 렌더링(하트 아이콘)용 + 콜백 내 최신값 읽기 |
| stage | `stage` | `stageRef` | 렌더링(스테이지 표시)용 + 콜백 내 최신값 읽기 |
| gameStarted | `gameStarted` | `gameStartedRef` | UI 표시용 + 이벤트 내 판별 |

> `scoreRef`는 `score` 상태가 바뀔 때마다 `useEffect`로 동기화된다.  
> 세션 저장 시에는 항상 ref 값을 읽는다 (콜백이 stale closure를 갖지 않도록).

---

## 물리 오브젝트 구성

```
┌─────────────────────────────────────────────┐  ← upWall (천장)
│  leftWall                         rightWall │
│  (x=20)                            (x=700) │
│                                             │
│       [범퍼] [범퍼] [범퍼]  ← stageConfigs  │
│                                             │
│           [목표물 target]                   │
│                                             │
│                           │rightWall2       │
│                           │(x=630, Plunger  │
│                           │ lane 내벽)      │
│  [leftFlipper]  [rightFlipper]    [공]      │
│  /                         \      [plunger] │
│ leftFunnelWall  rightFunnelWall    [shelf]  │
│                   ↓                         │
│              [deathZone] ← isSensor, y=1195 │
└─────────────────────────────────────────────┘
```

---

## Plunger (공 발사) 메커니즘

1. Space 누름: `isSpacePressed = true`, `plunger` 바디를 아래로 이동 (시각적 당기기)
2. Space 뗌: 누른 시간으로 `chargeRatio` 계산 → `launchSpeed` (최대 55)
3. 공이 Plunger lane 내에 있으면 `Body.setVelocity(ball, { x:0, y:-launchSpeed })`
4. Plunger를 원래 위치(`y=1020`)로 복귀

---

## 세션 저장/복원 타이밍

| 이벤트 | API 호출 |
|--------|---------|
| 마운트 시 | `GET /api/v1/game-sessions/{user_id}` (세션 복원) |
| 30초마다 | `PUT /api/v1/game-sessions/{user_id}` (자동 저장) |
| 목숨 감소 시 | `PUT /api/v1/game-sessions/{user_id}` (즉시 저장) |
| 게임오버 | `DELETE /api/v1/game-sessions/{user_id}` |
| 재시작 | `DELETE /api/v1/game-sessions/{user_id}` |

비로그인 사용자(`!user?.id`)는 모든 세션 API 호출 생략.

---

## 컴포넌트 언마운트 시 정리

- 오디오 객체 pause/reset
- Matter.js Events 리스너 off
- keyboard/touch 이벤트 리스너 remove
- `Render.stop`, `Runner.stop`, `Engine.clear`
