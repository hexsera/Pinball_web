# 핀볼 UI 비율 조정 실행계획

## 요구사항 요약

**요구사항**: 핀볼 게임에 UI 영역(700x300px)과 게임 영역을 분리

**목적**: 영역을 확정시켜 추가 변경사항으로 인한 사양변경과 개발 부채를 줄임

## 현재상태 분석

**Pinball.jsx 현재 구조**:
- Matter.js 캔버스 크기: 700px × 1200px (86-87번째 줄)
- 전체 컨테이너 크기: 700px × 1200px (470-471번째 줄)
- 점수 UI가 게임 영역 위에 position: absolute로 오버레이됨 (480-497번째 줄)
- 배경이미지가 전체 1200px 높이에 적용됨 (472번째 줄)
- calculateScale 함수가 1200px 기준으로 스케일 계산 (34번째 줄)

**주요 게임 오브젝트 y 좌표**:
- 공 초기 위치: y=400
- 장애물: y=300
- 범퍼: y=600
- 타겟: y=500
- 플리퍼: y=1150
- 바닥: y=1200
- 죽음구역: y=1200

## 구현 방법

**기술 스택**:
- Material-UI Box 컴포넌트 (UI 영역 컨테이너)
- Matter.js Render 옵션 수정 (캔버스 높이 변경)
- CSS Flexbox (수직 레이아웃)

**접근 방식**:
1. Matter.js 캔버스 높이를 1200px → 900px로 변경
2. UI 영역 Box를 게임 영역 위에 추가 (700x300px, 검은색 배경)
3. 전체 컨테이너를 flexDirection: 'column'으로 수직 배치
4. calculateScale 함수를 전체 높이(1200px) 기준으로 유지

## 구현 단계

### 1. Matter.js 캔버스 높이 변경
```javascript
const render = Render.create({
  element: sceneRef.current,
  engine: engine,
  options: {
    width: 700,
    height: 900,  // 1200 → 900
    wireframes: false,
    background: 'transparent'
  }
});
```
- 캔버스 높이를 1200px에서 900px로 변경
- width는 700px 유지

### 2. UI 영역 Box 추가 및 레이아웃 변경
```javascript
return (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }}>
    {!isPlaying && (
      <Button variant="contained" onClick={handlePlayMusic}>
        음악 시작
      </Button>
    )}
    <Box sx={{
      position: 'relative',
      width: '700px',
      height: '1200px',  // 전체 높이 유지
      transform: `scale(${gameScale})`,
      transformOrigin: 'top center'
    }}>
      {/* UI 영역 (상단 300px) */}
      <Box sx={{
        width: '700px',
        height: '300px',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Typography sx={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#ffffff'
        }}>
          SCORE: {score}
        </Typography>
        <Typography sx={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginTop: '20px'
        }}>
          LIVES: {lives}
        </Typography>
      </Box>

      {/* 게임 영역 (하단 900px) */}
      <Box sx={{
        width: '700px',
        height: '900px',
        backgroundImage: 'url(/images/pinball_back.png)',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div ref={sceneRef} />
      </Box>
    </Box>
  </Box>
);
```
- UI 영역: 700x300px, 검은색 배경, 점수 및 생명 표시
- 게임 영역: 700x900px, 배경이미지 적용
- flexDirection: 'column'으로 수직 배치
- 전체 컨테이너는 1200px 높이 유지 (스케일 계산 기준)

### 3. calculateScale 함수 수정
```javascript
const calculateScale = useCallback(() => {
  const canvasWidth = 700;
  const canvasHeight = 1200;  // 전체 높이 (UI 300 + 게임 900)
  const padding = 120;

  const scaleByWidth = (windowSize.width - padding) / canvasWidth;
  const scaleByHeight = (windowSize.height - padding) / canvasHeight;

  const optimalScale = Math.min(scaleByWidth, scaleByHeight, 1);

  setGameScale(optimalScale);
}, [windowSize]);
```
- canvasHeight를 1200px로 유지 (UI 300px + 게임 900px)
- 스케일 계산은 전체 높이 기준으로 유지

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| react/main/src/Pinball.jsx | 수정 | Matter.js 캔버스 높이 변경 (1200→900), UI 영역 Box 추가, 레이아웃 구조 변경 |

## 완료 체크리스트

- [ ] Matter.js 캔버스 높이가 900px로 변경되었는가
- [ ] UI 영역(700x300px)이 게임 위쪽에 표시되는가
- [ ] UI 영역 배경색이 검은색인가
- [ ] 게임 영역(700x900px)이 UI 영역 아래에 표시되는가
- [ ] 스케일링이 정상적으로 작동하는가
- [ ] 배경이미지가 게임 영역에만 적용되는가
- [ ] 점수와 생명이 UI 영역에 표시되는가
