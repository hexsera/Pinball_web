# 핀볼 게임 스테이지 시스템 구현 계획

## 프로젝트 개요

현재 단일 레벨로 구성된 핀볼 게임에 스테이지 시스템을 추가하여, 사용자가 단계별로 난이도가 증가하는 레벨을 경험할 수 있도록 개선합니다.

## 목표

- 여러 스테이지를 순차적으로 플레이할 수 있는 시스템 구축
- 스테이지별 고유한 레이아웃 및 난이도 설정
- 스테이지 진행 상태 관리 및 UI 표시
- 스테이지 클리어 조건 및 전환 로직 구현

## 구현 단계

### 1단계: 스테이지 데이터 구조 설계

**목표**: 스테이지별 설정을 관리할 데이터 구조 정의

**작업 내용**:
- 스테이지 설정 객체 구조 설계
  - 스테이지 번호
  - 장애물 위치 및 속성
  - 목표 점수 (스테이지 클리어 조건)
  - 중력 설정
  - 배경 이미지
  - 특수 오브젝트 (범퍼, 타겟 등)

**예시 구조**:
```javascript
const stages = [
  {
    id: 1,
    name: "Stage 1: 시작",
    clearScore: 1000,
    gravity: { x: 0, y: 1 },
    background: '/images/stage1_back.png',
    obstacles: [
      { type: 'circle', x: 300, y: 300, radius: 30, color: '#0f3460' },
      { type: 'circle', x: 500, y: 300, radius: 30, color: '#0f3460' }
    ],
    bumpers: [
      { x: 400, y: 600, radius: 40, restitution: 1.5 }
    ],
    targets: [
      { x: 500, y: 500, radius: 40, score: 300 }
    ]
  },
  {
    id: 2,
    name: "Stage 2: 도전",
    clearScore: 2000,
    gravity: { x: 0, y: 1.2 },
    // ... 더 많은 장애물 및 복잡한 레이아웃
  }
  // ... 추가 스테이지
];
```

**완료 조건**:
- stages.js 또는 stageConfig.js 파일 생성
- 최소 3개 이상의 스테이지 데이터 정의

---

### 2단계: 상태 관리 구조 추가

**목표**: 현재 스테이지 및 진행 상태를 관리할 React 상태 추가

**작업 내용**:
- Pinball.jsx에 스테이지 관련 상태 추가
  ```javascript
  const [currentStage, setCurrentStage] = useState(1);
  const [stageClearScore, setStageClearScore] = useState(0);
  const [isStageCleared, setIsStageCleared] = useState(false);
  ```
- useRef로 스테이지 데이터 참조
  ```javascript
  const stageDataRef = useRef(stages[0]);
  ```

**완료 조건**:
- 스테이지 상태 변수 추가 완료
- 초기 스테이지 로드 확인

---

### 3단계: 스테이지별 오브젝트 생성 함수 구현

**목표**: 스테이지 데이터를 기반으로 Matter.js 오브젝트를 동적으로 생성

**작업 내용**:
- `createStageObjects(stageData)` 함수 구현
  - 장애물 생성
  - 범퍼 생성
  - 타겟 생성
  - 특수 오브젝트 생성
- 기존 하드코딩된 오브젝트 생성 코드를 함수 기반으로 리팩토링

**예시 코드**:
```javascript
const createStageObjects = (stageData) => {
  const objects = [];

  // 장애물 생성
  stageData.obstacles.forEach(obs => {
    if (obs.type === 'circle') {
      objects.push(Bodies.circle(obs.x, obs.y, obs.radius, {
        isStatic: true,
        render: { fillStyle: obs.color }
      }));
    }
  });

  // 범퍼 생성
  stageData.bumpers.forEach(bumper => {
    objects.push(Bodies.circle(bumper.x, bumper.y, bumper.radius, {
      isStatic: true,
      restitution: bumper.restitution,
      label: 'bumper',
      render: { fillStyle: '#e74c3c' }
    }));
  });

  // 타겟 생성
  stageData.targets.forEach(target => {
    objects.push(Bodies.circle(target.x, target.y, target.radius, {
      isStatic: true,
      restitution: 1.5,
      label: 'target',
      render: { fillStyle: '#87CEEB' }
    }));
  });

  return objects;
};
```

**완료 조건**:
- 동적 오브젝트 생성 함수 구현 완료
- 스테이지 1 데이터로 정상 작동 확인

---

### 4단계: 스테이지 초기화 및 재시작 함수 구현

**목표**: 스테이지 시작 시 게임 상태를 초기화하고 오브젝트를 로드

**작업 내용**:
- `initializeStage(stageNumber)` 함수 구현
  - 이전 스테이지 오브젝트 제거
  - 새 스테이지 데이터 로드
  - 오브젝트 생성 및 World에 추가
  - 점수, 생명 초기화 (또는 유지)
  - 공 위치 초기화

**예시 코드**:
```javascript
const initializeStage = (stageNumber, engineRef, worldRef) => {
  const stageData = stages.find(s => s.id === stageNumber);

  // 이전 오브젝트 제거 (벽, 플리퍼 제외)
  const bodiesToRemove = worldRef.current.bodies.filter(
    body => !body.isStatic || body.label === 'obstacle' || body.label === 'bumper' || body.label === 'target'
  );
  World.remove(worldRef.current, bodiesToRemove);

  // 새 스테이지 오브젝트 생성
  const newObjects = createStageObjects(stageData);
  World.add(worldRef.current, newObjects);

  // 중력 설정
  engineRef.current.gravity.y = stageData.gravity.y;

  // 공 초기화
  Body.setPosition(ballRef.current, { x: 250, y: 400 });
  Body.setVelocity(ballRef.current, { x: 0, y: 0 });

  // UI 상태 업데이트
  setCurrentStage(stageNumber);
  setStageClearScore(stageData.clearScore);
  setIsStageCleared(false);
};
```

**완료 조건**:
- 스테이지 초기화 함수 구현 완료
- 스테이지 전환 시 오브젝트 정상 교체 확인

---

### 5단계: 스테이지 클리어 조건 및 전환 로직 구현

**목표**: 목표 점수 달성 시 스테이지 클리어 판정 및 다음 스테이지로 전환

**작업 내용**:
- 점수 증가 시 스테이지 클리어 조건 체크
  ```javascript
  useEffect(() => {
    if (score >= stageClearScore && !isStageCleared) {
      setIsStageCleared(true);
      setOverlayState('stageCleared');
    }
  }, [score, stageClearScore, isStageCleared]);
  ```
- 스테이지 클리어 오버레이 UI 추가
- "다음 스테이지" 버튼 클릭 시 다음 스테이지로 전환
  ```javascript
  const handleNextStage = () => {
    const nextStageNumber = currentStage + 1;
    if (nextStageNumber <= stages.length) {
      initializeStage(nextStageNumber);
      setOverlayState(null);
    } else {
      // 모든 스테이지 클리어
      setOverlayState('allStagesCleared');
    }
  };
  ```

**완료 조건**:
- 스테이지 클리어 판정 로직 구현 완료
- 다음 스테이지 전환 기능 정상 작동

---

### 6단계: UI 개선 - 스테이지 정보 표시

**목표**: 현재 스테이지 번호, 목표 점수 등을 화면에 표시

**작업 내용**:
- 상단 UI에 스테이지 정보 추가
  ```jsx
  <Typography sx={{ fontSize: '24px', color: '#ffffff' }}>
    STAGE: {currentStage}
  </Typography>
  <Typography sx={{ fontSize: '20px', color: '#ffff00' }}>
    목표: {stageClearScore}
  </Typography>
  ```
- 스테이지 클리어 오버레이 디자인
  ```jsx
  {overlayState === 'stageCleared' && (
    <>
      <Typography variant="h2" sx={{ color: '#00ff00', fontWeight: 'bold', mb: 4 }}>
        STAGE {currentStage} CLEAR!
      </Typography>
      <Typography variant="h4" sx={{ color: '#ffffff', mb: 2 }}>
        획득 점수: {score}
      </Typography>
      <Button
        variant="contained"
        onClick={handleNextStage}
        sx={{ fontSize: '1.2rem', padding: '10px 30px' }}
      >
        다음 스테이지
      </Button>
    </>
  )}
  ```

**완료 조건**:
- 스테이지 정보 UI 표시 완료
- 스테이지 클리어 오버레이 디자인 완료

---

### 7단계: 스테이지별 배경 이미지 동적 로드

**목표**: 스테이지마다 다른 배경 이미지 적용

**작업 내용**:
- 배경 이미지 상태 추가
  ```javascript
  const [backgroundImage, setBackgroundImage] = useState('/images/stage1_back.png');
  ```
- 스테이지 전환 시 배경 이미지 업데이트
  ```javascript
  useEffect(() => {
    const stageData = stages.find(s => s.id === currentStage);
    if (stageData) {
      setBackgroundImage(stageData.background);
    }
  }, [currentStage]);
  ```
- Box 컴포넌트에 동적 배경 적용
  ```jsx
  <Box sx={{
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: '100% 100%',
    // ...
  }}>
  ```

**완료 조건**:
- 스테이지별 배경 이미지 정상 전환 확인

---

### 8단계: 게임 오버 시 스테이지 재시작 기능

**목표**: 게임 오버 후 현재 스테이지를 처음부터 다시 시작

**작업 내용**:
- "다시 시작" 버튼 클릭 시 현재 스테이지 재초기화
  ```javascript
  const handleRestart = () => {
    initializeStage(currentStage);
    setScore(0);
    setLives(3);
    setOverlayState(null);
  };
  ```
- 게임 오버 오버레이에 버튼 연결
  ```jsx
  <Button
    variant="contained"
    onClick={handleRestart}
    sx={{ fontSize: '1.2rem', padding: '10px 30px' }}
  >
    다시 시작
  </Button>
  ```

**완료 조건**:
- 게임 오버 후 재시작 기능 정상 작동

---

### 9단계: 모든 스테이지 클리어 UI

**목표**: 마지막 스테이지 클리어 시 축하 화면 표시

**작업 내용**:
- 모든 스테이지 클리어 오버레이 추가
  ```jsx
  {overlayState === 'allStagesCleared' && (
    <>
      <Typography variant="h1" sx={{ color: '#ffd700', fontWeight: 'bold', mb: 4 }}>
        🎉 ALL STAGES CLEARED! 🎉
      </Typography>
      <Typography variant="h3" sx={{ color: '#ffffff', mb: 2 }}>
        총 점수: {score}
      </Typography>
      <Button
        variant="contained"
        onClick={() => {
          initializeStage(1);
          setScore(0);
          setLives(3);
          setOverlayState(null);
        }}
        sx={{ fontSize: '1.2rem', padding: '10px 30px' }}
      >
        처음부터 다시 시작
      </Button>
    </>
  )}
  ```

**완료 조건**:
- 모든 스테이지 클리어 시 축하 화면 정상 표시

---

### 10단계: 리팩토링 및 최적화

**목표**: 코드 정리 및 성능 최적화

**작업 내용**:
- 스테이지 설정 파일 분리 (stageConfig.js)
- 오브젝트 생성 함수 모듈화
- 불필요한 코드 제거
- 메모리 누수 방지 (오브젝트 제거 시 이벤트 리스너 정리)
- 주석 추가 및 코드 가독성 개선

**완료 조건**:
- 코드 리팩토링 완료
- 성능 테스트 통과 (스테이지 전환 시 렉 없음)

---

## 선택적 개선 사항

### A. 스테이지 선택 메뉴
- 메인 메뉴에서 클리어한 스테이지를 자유롭게 선택할 수 있는 기능
- 스테이지별 최고 점수 저장 및 표시

### B. 난이도 증가 패턴
- 스테이지가 진행될수록 중력 증가
- 장애물 개수 증가
- 플리퍼 속도 감소
- 공 크기 감소

### C. 특수 오브젝트 추가
- 이동하는 장애물
- 공을 순간이동시키는 포털
- 보너스 점수를 주는 아이템
- 생명 회복 아이템

### D. 스테이지 진행 저장
- localStorage를 사용하여 진행 상황 저장
- 페이지 새로고침 후에도 현재 스테이지 유지

---

## 기술 스택

- **React**: 상태 관리 및 UI 렌더링
- **Matter.js**: 물리 엔진 및 오브젝트 관리
- **Material-UI**: UI 컴포넌트

---

## 예상 일정

| 단계 | 소요 시간 (예상) |
|------|-----------------|
| 1단계: 스테이지 데이터 구조 설계 | 1시간 |
| 2단계: 상태 관리 구조 추가 | 30분 |
| 3단계: 오브젝트 생성 함수 구현 | 2시간 |
| 4단계: 스테이지 초기화 함수 구현 | 2시간 |
| 5단계: 클리어 조건 및 전환 로직 | 1.5시간 |
| 6단계: UI 개선 | 1시간 |
| 7단계: 배경 이미지 동적 로드 | 30분 |
| 8단계: 재시작 기능 | 30분 |
| 9단계: 모든 스테이지 클리어 UI | 30분 |
| 10단계: 리팩토링 및 최적화 | 2시간 |
| **총계** | **약 12시간** |

---

## 주의사항

1. **Matter.js World 관리**: 스테이지 전환 시 오브젝트를 완전히 제거하지 않으면 메모리 누수 발생 가능
2. **이벤트 리스너 정리**: 오브젝트 제거 시 관련 이벤트 리스너도 함께 제거 필요
3. **상태 동기화**: React 상태와 Matter.js 엔진 상태가 동기화되도록 useRef 활용
4. **성능 최적화**: 스테이지 전환 시 렌더링 최적화 (불필요한 re-render 방지)

---

## 참고 자료

- [Matter.js 공식 문서](https://brm.io/matter-js/)
- [React useEffect 훅](https://react.dev/reference/react/useEffect)
- [Material-UI Box 컴포넌트](https://mui.com/material-ui/react-box/)

---

## 다음 단계

이 계획서를 기반으로 단계별로 구현을 진행하며, 각 단계 완료 후 테스트를 통해 정상 작동을 확인합니다. 문제가 발생하면 해당 단계로 돌아가 디버깅합니다.
