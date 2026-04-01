# AIPinball 구조 정리

## 파일 구성

| 파일 | 역할 |
|------|------|
| `AIPinball.jsx` | 메인 컴포넌트. 플레이어 + AI 플리퍼, 플레이스타일 분석, 필살기 로직 포함 |
| `aiStageConfigs.js` | 스테이지별 범퍼/장애물/목표물 좌표 데이터 (Pinball과 별도 관리) |
| `playstyleService.js` | 플레이스타일 API 통신 + 응답 파싱 + 랜덤 폴백 |
| `SkillIcon.jsx` | 스킬 상태 표시 아이콘 UI (`loading` / `big` / `small`) |
| `index.js` | AIPinball 컴포넌트 re-export |

공유 모듈 (Pinball 폴더에서 import):
- `../Pinball/pinballSound` — 사운드 재생 유틸
- `../Pinball/pinballRestart` — 재시작 초기 상태값
- `../Pinball/WallOverlay` — CSS 벽 오버레이

---

## Pinball과의 차이점 (핵심)

| 항목 | Pinball | AIPinball |
|------|---------|-----------|
| 플리퍼 | 플레이어만 (하단) | 플레이어(하단) + AI(상단) |
| 세션 저장/복원 | O (Redis) | X (없음) |
| 점수 제출 | O (`/api/v1/monthly-scores`) | X |
| 플레이스타일 분석 | X | O (10초 수집 → API) |
| 필살기 시스템 | X | O (`big` / `small` 공 교체) |
| 공 시작 위치 | Plunger lane (x=662) | 필드 중앙 (x=280, y=700) |
| flipperTrigger | X | O (데이터 수집 범위 감지 센서) |

---

## 게임 전체 흐름

```
[페이지 진입]
  ↓ useEffect (마운트)
  ├─ game_visits API 호출 (방문 기록)
  ├─ 오디오 객체 생성
  ├─ Matter.js 초기화 (engine.timeScale = 0)
  ├─ 물리 오브젝트 생성
  │    플레이어: leftFlipper / rightFlipper (하단 y=995)
  │    AI:       aiLeftFlipper / aiRightFlipper (상단 y=105)
  │    공: ball (중앙), bigBall/smallBall (사전 생성, World 미추가)
  │    센서: flipperTrigger (플리퍼 영역 진입 감지)
  └─ 스테이지 1 맵 로딩

[게임 시작 대기 화면]
  Space 키 또는 클릭
         ↓
  startGame()
  ├─ timeScale = 1, BGM 재생
  ├─ collectInterval 시작 (100ms마다 공 위치/속도/플리퍼 상태 수집)
  │    단, 공이 flipperTrigger 영역 안에 있을 때만 수집
  ├─ cooldownInterval 시작 (10초 충전 진행도 표시)
  └─ analysisTimer 시작 (10초 후 수집 종료 + API 호출)

[10초 후 자동 실행]
  sendPlaystyleData(수집된 데이터)
  ├─ 응답 받으면: parsePlaystyleResponse()
  │    attack  → skillState = 'small'
  │    defence → skillState = 'big'
  │    none    → 스킬 없음
  └─ 30초 내 응답 없으면: getRandomSkill() 폴백 ('big' or 'small')

[게임 진행 중]
  ← 플레이어: ArrowLeft / ArrowRight (플리퍼), Space (플런저)
  ← AI: beforeUpdate 이벤트마다 자동 판단
        공이 y < 300 이고 위로 이동 중(vy < 0)일 때
        AI 플리퍼 중심 X에서 160px 이내면 해당 플리퍼 올림

  [충돌 이벤트]
  ├─ flipperTrigger 진입/이탈 → isBallInTriggerRef 갱신
  ├─ 범퍼 충돌 → 추가 속도 + 사운드
  ├─ 목표물 충돌 → +300점
  └─ deathZone 충돌
       ├─ lives > 0: 목숨 -1, 공을 중앙(x=280, y=700)으로 복귀
       └─ lives == 0: 공 제거, 게임오버 overlay

[스킬 발동 - 스킬 아이콘 클릭 or 키 입력]
  activateSpecial(bigBall or smallBall)
  ├─ 현재 ball을 World에서 제거
  ├─ 특수 공을 같은 위치/속도로 투입 (ballRef 교체)
  └─ 5초 후 자동 복귀 (원래 ball로 재교체)
```

---

## AI 플리퍼 구조

필드 상단에 플레이어 플리퍼를 y축 대칭으로 배치.  
플레이어가 공을 위로 올리면 AI가 받아쳐서 돌려보내는 구조.

```
┌──────────────────────────────────────────┐  ← upWall (y=0)
│   [aiRightFlipper]  [aiLeftFlipper]      │  ← y=105 (AI)
│      \                    /              │
│    aiRightFunnel   aiLeftFunnel          │
│                                          │
│           [범퍼] [목표물]                │
│                 ↑                        │
│         공 이 여기를 통과하면            │
│         AI 플리퍼가 반응                 │
│                                          │
│    [leftFlipper]  [rightFlipper]         │  ← y=995 (플레이어)
│      /                    \              │
│  leftFunnel           rightFunnel        │
│                  ↓                       │
│             [deathZone]                  │
└──────────────────────────────────────────┘

AI 판단 조건:
  ball.y < 300  AND  ball.vy < 0  (위로 올라가는 중)
  → 가까운 쪽 AI 플리퍼 올림 (반응거리 160px 이내)
```

---

## 필살기(Special Ball) 시스템

| 스킬 | 공 크기 | 밀도 | 효과 |
|------|---------|------|------|
| `big` | r=30 (2배) | 조금 무거움 | 범퍼를 강하게 밀어냄 |
| `small` | r=10.5 (0.7배) | 가벼움 | 빠르고 좁은 틈 통과 가능 |

발동 조건: `skillState`가 `'big'` 또는 `'small'`일 때 스킬 아이콘 클릭  
지속 시간: 5초, 이후 원래 공으로 자동 복귀

---

## 플레이스타일 분석 흐름

```
게임 시작
  └─ 100ms 인터벌로 수집 (공이 flipperTrigger 안에 있을 때만)
       수집 항목: timestamp, ball_x, ball_y, ball_vx, ball_vy,
                 left_flipper(bool), right_flipper(bool)

10초 후 수집 종료
  └─ POST /api/v1/pinball_ai/playstyle (수집된 배열 전송)
       응답: { playstyle: 'attack' | 'defence' | 'none' }
         attack  → 'small' 스킬 부여
         defence → 'big' 스킬 부여
         none    → 스킬 없음
       30초 내 무응답 → getRandomSkill() 폴백
```

---

## 상태 관리 (AIPinball 전용 추가분)

| 상태 | 타입 | 설명 |
|------|------|------|
| `skillState` / `skillStateRef` | `'loading'` \| `'big'` \| `'small'` | 스킬 상태 (UI + 콜백 이중 관리) |
| `cooldownProgress` | `number` 0~1 | 스킬 아이콘 충전 진행도 |
| `bigBallRef` / `smallBallRef` | Matter Body | 특수 공 사전 생성 (World 미추가) |
| `specialActiveRef` | `bool` | 필살기 발동 중 여부 (중복 방지) |
| `isBallInTriggerRef` | `bool` | 공이 flipperTrigger 센서 내부 여부 |
| `playstyleDataRef` | `array` | 수집된 플레이스타일 데이터 |
