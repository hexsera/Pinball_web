# AIPinball Phase 3 — AI 라이프 + aiDeathZone 충돌 로직 실행계획

## 요구사항 요약

**요구사항**: AI에게 라이프(목숨)를 부여하고, 공이 aiDeathZone에 닿으면 AI 목숨을 차감한다. AI 목숨이 0이 되면 플레이어 승리를 표시한다.

**목적**: 플레이어 vs AI 대결 구조를 완성한다. 현재는 플레이어만 목숨이 있어 일방적인 구조이며, AI도 목숨을 잃는 조건을 추가해야 진정한 대결이 된다.

---

## 현재상태 분석

- `aiDeathZone` 물리 바디는 이미 생성되어 있음 (`y=10`, 전체 너비 센서, label: `'aiDeathZone'`)
- 하지만 `collisionStart` 이벤트 핸들러에서 `aiDeathZone` 충돌을 처리하는 로직이 **없음**
- `lives` / `livesRef`는 플레이어 전용으로만 사용 중
- `overlayState`는 현재 `'gameOver'` 케이스만 처리
- `handleRestart()`는 `getRestartState()`로 플레이어 상태만 초기화

---

## 구현 방법

Matter.js의 기존 `collisionStart` 이벤트에 `aiDeathZone` 감지 분기를 추가한다. React `useState` + `useRef` 패턴(플레이어 lives와 동일한 방식)으로 `aiLives` 상태를 관리한다. 승리 overlay는 기존 `overlayState` 분기 구조에 `'playerWin'` 케이스를 추가한다.

---

## 구현 단계

### 1. aiLives 상태 및 ref 추가

```javascript
// AIPinball.jsx — 기존 lives/livesRef 선언 바로 아래에 추가
const [aiLives, setAiLives] = useState(3);
const aiLivesRef = useRef(3);
```

- **무엇을 하는가**: AI의 남은 목숨을 React 렌더링용(`useState`)과 이벤트 콜백 내 최신값 읽기용(`useRef`) 두 가지로 관리
- `useState`는 UI 하트 표시에 사용, `useRef`는 `collisionStart` 콜백 내에서 클로저 문제 없이 최신값 읽기 위해 필요
- 플레이어 `lives`/`livesRef` 패턴과 완전히 동일한 구조

---

### 2. collisionStart에 aiDeathZone 충돌 처리 추가

```javascript
// 기존 deathZone 충돌 블록(~line 646) 바로 아래에 추가
if ((bodyA.label === 'aiDeathZone' && bodyB === activeBall) ||
    (bodyB.label === 'aiDeathZone' && bodyA === activeBall)) {
  const newAiLives = aiLivesRef.current - 1;
  aiLivesRef.current = newAiLives;
  setAiLives(newAiLives);
  playLifeDownSound(lifeDownSoundRef.current);

  if (aiLivesRef.current > 0) {
    Body.setPosition(activeBall, { x: 350, y: 550 });
    Body.setVelocity(activeBall, { x: launchDirectionRef.current * 8, y: 8 });
    Body.setAngularVelocity(activeBall, 0);
  } else {
    World.remove(engine.world, activeBall);
    setOverlayState('playerWin');
  }
}
```

- **무엇을 하는가**: 공이 AI 죽음구역(`aiDeathZone`)에 닿으면 AI 목숨을 1 차감하고, 0이 되면 플레이어 승리 overlay를 표시
- `activeBall`로 필살기 공(`bigBall`/`smallBall`) 교체 상태에서도 정상 동작
- AI 목숨 > 0이면 공을 중앙(`x=350, y=550`)으로 재발사 — 플레이어 deathZone 복귀 로직과 동일한 방식
- `playLifeDownSound`를 재사용해 별도 사운드 추가 없이 처리

---

### 3. handleRestart에 aiLives 초기화 추가

```javascript
// handleRestart() 내 기존 ref 초기화 블록에 추가
aiLivesRef.current = 3;
setAiLives(3);
```

- **무엇을 하는가**: 재시작 시 AI 목숨을 3으로 원복
- 기존 `livesRef.current = lives`(플레이어 초기화) 바로 아래에 추가
- `setAiLives(3)` 호출로 UI 하트도 즉시 갱신

---

### 4. 상단바에 AI 하트 추가

```jsx
{/* 상단 UI 바 — 기존 플레이어 하트 Box와 음소거 버튼 사이에 추가 */}
<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
  {Array.from({ length: aiLives }).map((_, index) => (
    <FavoriteIcon
      key={index}
      sx={{ fontSize: '36px', color: '#3498db' }}
    />
  ))}
</Box>
```

- **무엇을 하는가**: AI의 남은 목숨을 파란색 하트 아이콘으로 상단바 오른쪽에 표시
- 플레이어 하트(`#ff1744` 빨간색)와 구분하기 위해 `#3498db`(파란색) 사용 — AI 플리퍼 색과 동일
- `Array.from({ length: aiLives })`로 목숨 수만큼 아이콘 렌더링

---

### 5. playerWin overlay 추가

```jsx
{/* 기존 overlayState === 'gameOver' 블록 바로 아래에 추가 */}
{overlayState === 'playerWin' && (
  <>
    <Typography variant="h2" sx={{ color: '#00ff88', fontWeight: 'bold', mb: 4 }}>
      YOU WIN
    </Typography>
    <Typography variant="h4" sx={{ color: '#ffffff', mb: 4 }}>
      획득 점수: {score}
    </Typography>
    <Button
      variant="contained"
      onClick={handleRestart}
      sx={{ fontSize: '1.2rem', padding: '10px 30px' }}
    >
      다시 시작
    </Button>
  </>
)}
```

- **무엇을 하는가**: AI 목숨이 0이 되면 "YOU WIN" 화면을 표시하고 재시작 버튼 제공
- 기존 `overlayState` 렌더링 블록(`{overlayState && (...)}`) 내부에 분기 추가 — 구조 변경 없음
- 승리 텍스트 색상 `#00ff88`(초록)으로 게임오버 빨강과 시각적으로 구분

### 6. G키 중력 반전 핸들러 추가

```javascript
// handleKeyDown 내 'n' 키 블록 바로 위에 추가
if (event.key === 'g' || event.key === 'G') {
  engine.gravity.y *= -1;
}
```

- **무엇을 하는가**: G키를 누를 때마다 Matter.js 엔진의 중력 방향을 반전시켜 aiDeathZone 충돌 테스트를 용이하게 함
- `engine.gravity.y`에 `-1`을 곱하면 양수(아래)↔음수(위)가 토글됨
- 초기값 `gravity.y = 1`(아래) → G키 1회: `-1`(위) → G키 2회: `1`(아래) 반복
- `engine` 변수는 `useEffect` 내 클로저에서 직접 접근 가능하므로 ref 없이 사용

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | aiLives 상태/ref 추가, collisionStart aiDeathZone 처리, handleRestart 초기화, 상단바 AI 하트, playerWin overlay, G키 중력 반전 |

---

## 완료 체크리스트

- [x] 게임 시작 시 상단바에 빨간 하트 3개(플레이어)와 파란 하트 3개(AI)가 표시된다
- [x] 공이 화면 상단 aiDeathZone에 닿으면 파란 하트가 1개 줄어든다
- [x] AI 하트가 남아있을 때 aiDeathZone 충돌 후 공이 중앙(x=350, y=550)에서 재발사된다
- [x] AI 하트가 0개가 되면 "YOU WIN" overlay가 표시된다
- [x] 공이 바닥 deathZone에 닿으면 빨간 하트가 줄고, 0이 되면 "GAME OVER" overlay가 표시된다
- [x] "다시 시작" 버튼 클릭 시 플레이어·AI 하트 모두 3개로 초기화된다
- [x] 게임 중 G키를 누르면 공이 반대 방향으로 떨어진다 (중력 반전)
- [x] G키를 한 번 더 누르면 중력이 원래대로 돌아온다
- [x] 브라우저 콘솔에 에러 없이 실행된다
