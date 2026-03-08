# React Bits Aurora 배경 적용 실행계획

## 요구사항 요약

**요구사항**: React Bits Aurora 컴포넌트를 설치하여 HomePage.jsx 백그라운드에 적용한다.

**목적**: 홈페이지 배경에 Aurora(오로라) 애니메이션 효과를 추가하여 시각적 완성도를 높인다.

## 현재상태 분석

- `frontend/src/pages/HomePage/HomePage.jsx` 존재, 현재 배경색은 `#0F172A` (단색)
- `package.json`에 React Bits 관련 패키지 없음 (`ogl` 미설치)
- React Bits는 npm 패키지가 아닌 **소스코드 직접 복사** 방식으로 사용
- Aurora 컴포넌트는 WebGL(OGL 라이브러리)을 사용하므로 `ogl` 패키지 설치 필요

## 구현 방법

React Bits의 Aurora는 전통적인 npm 패키지가 아니라 소스코드를 직접 프로젝트에 복사하는 방식.
공식 사이트에서 JS-CSS 버전 소스코드를 복사하여 `components/` 폴더에 저장 후 `HomePage.jsx`에 적용.

## 구현 단계

### 1. ogl 패키지 설치
```bash
cd frontend && npm install ogl
```
- Aurora 컴포넌트는 WebGL 렌더링을 위해 `ogl` 라이브러리를 사용하므로 반드시 설치 필요
- `ogl`은 경량 WebGL 라이브러리로 번들 크기가 작음

### 2. Aurora 컴포넌트 소스코드 파일 생성
```
frontend/src/components/Aurora/Aurora.jsx   ← 공식 소스 복사
frontend/src/components/Aurora/Aurora.css   ← 공식 소스 복사
```
- [reactbits.dev/backgrounds/aurora](https://www.reactbits.dev/backgrounds/aurora) 에서 JS-CSS 탭 선택
- `Aurora.jsx`와 `Aurora.css` 소스코드를 복사하여 위 경로에 저장

### 3. HomePage.jsx에 Aurora 컴포넌트 적용
```jsx
import Aurora from '../../components/Aurora/Aurora';

// 최상위 Box를 position: 'relative'로 변경
<Box sx={{ position: 'relative', minHeight: '100vh', backgroundColor: COLORS.bg, ... }}>

  {/* Aurora 배경 */}
  <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
    <Aurora
      colorStops={['#4F46E5', '#7C3AED', '#4F46E5']}
      amplitude={1.2}
      speed={0.5}
      blend={0.5}
    />
  </Box>

  {/* 기존 콘텐츠 (zIndex 상향) */}
  <Box sx={{ position: 'relative', zIndex: 1 }}>
    {/* AppBar, Container, Footer 그대로 유지 */}
  </Box>
</Box>
```
- Aurora Box에 `position: 'absolute', inset: 0`을 설정하여 전체 배경에 깔리도록 함
- 기존 콘텐츠는 `position: 'relative', zIndex: 1`로 Aurora 위에 표시
- `colorStops`는 현재 COLORS.primary(`#4F46E5`) 계열 색상으로 설정

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/package.json` | 수정 | `ogl` 패키지 추가 |
| `frontend/src/components/Aurora/Aurora.jsx` | 생성 | React Bits Aurora 컴포넌트 소스코드 |
| `frontend/src/components/Aurora/Aurora.css` | 생성 | Aurora 컴포넌트 CSS |
| `frontend/src/pages/HomePage/HomePage.jsx` | 수정 | Aurora 컴포넌트 import 및 배경 적용 |

## 완료 체크리스트

- [ ] `npm install` 후 오류 없이 설치되는지 확인
- [ ] `npm run start` 실행 시 홈페이지(`/`)에서 Aurora 애니메이션이 배경에 표시되는지 확인
- [ ] 기존 AppBar, 텍스트, 버튼, 랭킹 테이블이 Aurora 위에 정상 표시되는지 확인
- [ ] 모바일 화면에서 Aurora 배경이 전체 화면을 채우는지 확인
- [ ] 브라우저 콘솔에 WebGL 관련 오류가 없는지 확인
