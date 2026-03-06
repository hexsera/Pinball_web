# AIPinball & SkillIcon 보완 실행계획

## 요구사항 요약

**요구사항**:
1. 스킬 충전 타이밍 변경: 데이터 수집 30초 → 10초, 대기 10초 유지
2. 'a' 키로 스킬 발동이 작동하지 않는 버그 수정
3. flipperTrigger Body의 render를 보이지 않게 변경
4. SkillIcon에 스킬 충전 진행도를 흰색이 아래에서 위로 차오르는 시각 피드백 구현

**목적**: 스킬 시스템의 타이밍 단축, 키 입력 버그 수정, 불필요한 시각 요소 제거, 사용자에게 충전 진행도 시각 정보 제공

## 현재상태 분석

- `AIPinball.jsx:121` `analysisTimerRef`가 30000ms(30초)로 설정되어 있음
- `AIPinball.jsx:1049` 'a' 키 핸들러에서 `skillState` React state를 클로저로 참조 → `useEffect` 내부에서 캡처된 초기값(`'loading'`)을 계속 사용하여 스킬 발동 안됨
- `AIPinball.jsx:421-424` triggerBody의 render에 `fillStyle: '#00ff00'`, `opacity: 0.3` 설정되어 화면에 초록색으로 표시됨
- `SkillIcon.jsx` 현재 `loading` 상태일 때 `CircularProgress`만 표시하며 충전 진행도 표시 없음

## 구현 방법

- **타이밍 변경**: setTimeout 값을 30000에서 10000으로 수정
- **'a' 키 버그**: React state 대신 `useRef`로 skillState를 추적하여 클로저 문제 해결
- **trigger 숨기기**: Matter.js Body render의 `opacity`를 0으로 설정
- **SkillIcon 충전 바**: CSS `clip-path` 또는 `linear-gradient`를 사용해 아래에서 위로 채워지는 흰색 영역 구현

## 구현 단계

### 1. [AIPinball.jsx] 데이터 수집 시간 30초 → 10초 변경

```javascript
// AIPinball.jsx:121
analysisTimerRef.current = setTimeout(() => {
  clearInterval(collectIntervalRef.current);
  // ...
}, 10000); // 30000 → 10000
```
- `analysisTimerRef` setTimeout의 ms 값을 30000에서 10000으로 변경
- 대기 10초(`responseTimerRef` 10000ms)는 그대로 유지

### 2. [AIPinball.jsx] skillState를 useRef로 관리하여 'a' 키 버그 수정

```javascript
// useRef 추가 (useState와 함께)
const skillStateRef = useRef('loading');

// setSkillState 호출 시 ref도 함께 업데이트
const setSkillStateSync = (value) => {
  skillStateRef.current = value;
  setSkillState(value);
};

// handleKeyDown 내 'a' 키 처리 (ref 사용)
if (event.key === 'a' || event.key === 'A') {
  if (skillStateRef.current === 'big') {
    activateSpecialRef.current?.(bigBallRef.current);
  } else if (skillStateRef.current === 'small') {
    activateSpecialRef.current?.(smallBallRef.current);
  }
}
```
- `useEffect` 클로저 내부에서 React state는 최초 캡처값만 참조하는 문제 해결
- `skillStateRef.current`는 항상 최신값을 가리키므로 'a' 키 발동 정상 작동
- `setSkillStateSync`을 기존 `setSkillState` 호출 위치(응답 반영 코드)에 교체 적용

### 3. [AIPinball.jsx] triggerBody render 숨기기

```javascript
// AIPinball.jsx:421-424
render: {
  fillStyle: '#00ff00',
  opacity: 0
}
```
- `opacity`를 0.3에서 0으로 변경하면 Matter.js 캔버스에서 렌더링되지 않음
- `isSensor: true`이므로 물리 동작(충돌 감지)에는 영향 없음

### 4. [SkillIcon.jsx] 충전 진행도 시각 피드백 구현

```jsx
// SkillIcon.jsx - skillState='loading' 시 props 추가
function SkillIcon({ skillState, cooldownProgress }) {
  // cooldownProgress: 0(시작) ~ 1(완료) 숫자값
  return (
    <Box sx={{ position: 'relative', width: '80px', height: '80px', ... }}>
      {/* 충전 바: 아래에서 위로 흰색이 차오름 */}
      {skillState === 'loading' && (
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: `${cooldownProgress * 100}%`,
          backgroundColor: '#ffffff44',
          borderRadius: '0 0 10px 10px',
          transition: 'height 0.1s linear',
        }} />
      )}
      {/* 기존 아이콘 컨텐츠 */}
    </Box>
  );
}
```
- `cooldownProgress` prop(0~1)을 받아 `height`를 백분율로 변환
- `position: absolute`로 아이콘 내부에 오버레이하여 기존 UI와 겹침
- `transition`으로 부드러운 채움 애니메이션 적용

### 5. [AIPinball.jsx] cooldownProgress 상태 추가 및 SkillIcon에 전달

```javascript
// 상태 추가
const [cooldownProgress, setCooldownProgress] = useState(0);

// startGame 내에서 인터벌로 진행도 업데이트 (10초 기준)
const cooldownStartTime = Date.now();
const progressInterval = setInterval(() => {
  const elapsed = Date.now() - cooldownStartTime;
  setCooldownProgress(Math.min(elapsed / 10000, 1));
}, 100);

// 10초 후(analysisTimerRef 콜백) progressInterval 정리
clearInterval(progressInterval);

// JSX
<SkillIcon skillState={skillState} cooldownProgress={cooldownProgress} />
```
- 게임 시작 시 `cooldownStartTime` 기록, 100ms마다 경과 비율(0~1) 계산
- `analysisTimerRef` 콜백(10초 후)에서 progressInterval을 정리
- `SkillIcon`에 `cooldownProgress` prop으로 전달

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | 타이밍 30초→10초, skillStateRef 추가, 'a' 키 버그 수정, triggerBody opacity 0, cooldownProgress 상태 추가 |
| `frontend/src/pages/AIPinball/SkillIcon.jsx` | 수정 | cooldownProgress prop 추가, 아래에서 위로 차오르는 흰색 충전 바 구현 |

## 완료 체크리스트

- [ ] 게임 시작 후 10초 뒤에 스킬이 충전 완료되는지 확인
- [ ] 스킬 충전 중 SkillIcon 내부에 흰색 영역이 아래에서 위로 점점 채워지는지 확인
- [ ] 스킬 충전 완료 후 'a' 키를 눌렀을 때 big/small 스킬이 정상 발동되는지 확인
- [ ] 게임 화면에서 초록색 triggerBody 사각형이 보이지 않는지 확인
- [ ] 스킬 발동 후 skillState가 'loading'으로 돌아오는 경우 충전 바가 다시 작동하는지 확인
