# Pinball Score API 전송 버그 수정 실행계획

## 요구사항 요약

**요구사항**: 게임오버 시 실제로 획득한 점수를 API에 전송하도록 수정

**목적**: 현재 게임 UI에서는 점수가 올바르게 표시되지만, API에는 항상 0점이 전송되는 버그를 수정하여 실제 점수가 정확히 저장되도록 한다.

## 현재상태 분석

**버그 원인: React useState와 클로저(Closure)의 상호작용**

`score`는 `useState(0)`으로 관리되는 상태 변수이다. 상태 변수는 리렌더링될 때마다 새로운 값을 가지지만, **클로저 내부에서 캡처된 값은 클로저가 생성된 시점의 값으로 고정된다.**

`submitScore()` 함수와 `collisionStart` 이벤트 핸들러는 모두 `useEffect(() => { ... }, [])` 내부에 정의되어 있다. 의존성 배열이 빈 배열 `[]`이므로 이 `useEffect`는 컴포넌트가 처음 마운트될 때 **단 한 번만** 실행된다.

이때 클로저에 캡처되는 `score` 값은 초기값 `0`이다. 이후 공이 타겟에 충돌하여 `setScore(prev => prev + 300)`을 호출하면 UI는 갱신되지만, `collisionStart` 핸들러 안에서 참조하는 `score`는 여전히 `0`이다.

**정리:**
- `setScore(prev => prev + 300)` → UI 갱신은 정상 (함수형 업데이트로 최신 값 사용)
- `submitScore()` 내의 `score` → 항상 마운트 시점의 `0` (클로저에 고정)

| 구분 | score 값 | 이유 |
|------|----------|------|
| UI 표시 (`SCORE: {score}`) | 최신 값 | 리렌더링 시마다 최신 상태 참조 |
| `submitScore()` 내 `score` | 항상 0 | `useEffect []` 클로저에 초기값 캡처 |

## 구현 방법

`useRef`를 사용하여 score의 최신 값을 별도로 저장한다. `useRef`로 생성된 ref 객체는 컴포넌트 수명 전체에서 동일한 객체를 유지하며, `.current` 속성을 통해 언제든지 최신 값을 읽을 수 있다. 이는 클로저에 캡처되지 않기 때문이다.

- `scoreRef`를 생성하여 score 상태가 변경될 때마다 `scoreRef.current`를 동기화
- `submitScore()` 내부에서 `score` 대신 `scoreRef.current`를 API 전송에 사용

기존 코드에서 `livesRef`도 동일한 방식으로 클로저 문제를 해결하고 있으므로, 이미 확립된 패턴을 따라 구현한다.

## 구현 단계

### 1. scoreRef 생성
```javascript
const scoreRef = useRef(0);
```
- **무엇을 하는가**: score의 최신 값을 클로저 밖에서 접근할 수 있도록 저장하는 ref 객체를 생성한다.
- `useRef(0)`의 초기값은 `useState(0)`과 동일하게 0으로 설정
- 기존 `livesRef = useRef(2)`와 같은 위치(다른 ref 선언 옆)에 추가

### 2. scoreRef와 score 상태 동기화
```javascript
useEffect(() => {
  scoreRef.current = score;
}, [score]);
```
- **무엇을 하는가**: `score` 상태가 변경될 때마다 `scoreRef.current`에 최신 값을 복사한다.
- `score`가 의존성 배열에 포함되어 score가 변경되면 즉시 실행
- 이후 클로저 내 어디서든 `scoreRef.current`를 읽으면 항상 최신 score 값을 가져올 수 있음

### 3. submitScore()에서 scoreRef.current 사용
```javascript
const submitScore = async () => {
  if (!user || !user.id) {
    console.log('User not logged in, score not submitted');
    return;
  }

  try {
    const response = await axios.post('/api/v1/monthly-scores', {
      user_id: user.id,
      score: scoreRef.current
    });
    console.log("sendsocre", scoreRef.current);
    console.log('Score submitted successfully:', response.data);
    setBestScore(response.data.score);
  } catch (error) {
    console.error('Failed to submit score:', error);
  }
};
```
- **무엇을 하는가**: API 전송 시 클로저에 고정된 `score` 대신 항상 최신 값인 `scoreRef.current`를 사용한다.
- `score` → `scoreRef.current`로 변경하는 곳은 두 가지: axios POST의 `score` 필드, console.log의 디버그 출력

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `react/main/src/Pinball.jsx` | 수정 | scoreRef 생성, score 동기화 useEffect 추가, submitScore에서 scoreRef.current 사용 |

## 완료 체크리스트

- [ ] `scoreRef = useRef(0)` 선언이 다른 ref 선언과 같은 위치에 추가되었는지 확인
- [ ] `score`가 변경될 때 `scoreRef.current`가 동기화되는 `useEffect`가 추가되었는지 확인
- [ ] `submitScore()` 내 axios POST의 `score` 필드가 `scoreRef.current`로 변경되었는지 확인
- [ ] 게임을 실행하여 타겟에 공을 튕기고 점수가 올라가는지 확인
- [ ] 게임오버 후 API에 전송되는 점수가 UI에 표시된 점수와 동일한지 확인 (console.log "sendsocre" 출력 확인)
- [ ] API 응답 및 DB에 저장된 점수가 정확한지 확인
