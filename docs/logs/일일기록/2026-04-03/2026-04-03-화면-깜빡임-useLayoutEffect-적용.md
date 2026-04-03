# 화면 깜빡임 useLayoutEffect 적용 실행계획

## 요구사항 요약

**요구사항**: 홈페이지(`/`)와 로그인 페이지(`/login`) 간 이동 시 흰색 깜빡임 제거

**목적**: 페이지 전환 시 브라우저 기본 흰색 배경이 노출되는 현상을 차단해 검증 후 전체 확대 적용 여부 결정

## 현재상태 분석

- `index.html`의 `<body>`에 배경색 지정 없음 → JS 로드 전/라우트 전환 중 흰색 노출
- `HomePage`, `Login` 모두 최상단 `<Box sx={{ backgroundColor: '#0F172A' }}>` 로 배경 적용
- 두 페이지 모두 `Aurora` 컴포넌트를 배경으로 사용 — Aurora는 JS 로드 후에만 렌더링됨
- 깜빡임 순서: `흰색(body 기본)` → `#0F172A Box` → `Aurora 렌더링` 순으로 단계적으로 표시됨
- `useBodyBg`로 body를 `#0F172A`로 선점하면 Aurora 뜨기 전 빈 순간도 검은 배경이 유지됨
- 배경색은 컴포넌트 내부의 `COLORS.bg = '#0F172A'` 상수로 관리 중
- `frontend/src/hooks/` 디렉토리 없음

## 구현 방법

`useLayoutEffect`를 사용한 커스텀 훅 `useBodyBg`를 작성해 각 페이지에서 호출한다.
`useLayoutEffect`는 DOM 페인트 전에 동기 실행되므로, 브라우저가 화면을 그리기 전에 `body` 배경색이 변경되어 깜빡임이 시각적으로 차단된다.

## 구현 단계

### 1. `useBodyBg` 커스텀 훅 생성

```javascript
// frontend/src/hooks/useBodyBg.js
import { useLayoutEffect } from 'react';

export function useBodyBg(color) {
  useLayoutEffect(() => {
    document.body.style.backgroundColor = color;
  }, [color]);
}
```

- **무엇을 하는가**: 페이지가 화면에 그려지기 전에 `body`의 배경색을 강제로 지정하는 훅
- `useLayoutEffect`는 React가 DOM을 업데이트한 직후, 브라우저 페인트 이전에 동기적으로 실행됨
- `color`가 바뀌면 재실행되어 배경색도 즉시 갱신됨

### 2. `HomePage`에 훅 적용

```jsx
// frontend/src/pages/HomePage/HomePage.jsx
import { useBodyBg } from '../../hooks/useBodyBg';

function HomePage() {
  useBodyBg(COLORS.bg);  // '#0F172A'
  // ... 기존 코드 유지
}
```

- **무엇을 하는가**: HomePage가 마운트될 때 `body` 배경을 `#0F172A`로 설정
- 기존 `<Box sx={{ backgroundColor: COLORS.bg }}>` 는 그대로 유지 (컴포넌트 내부 레이아웃용)
- `useBodyBg`는 컴포넌트 함수 최상단에서 호출 (훅 규칙 준수)

### 3. `Login`에 훅 적용

```jsx
// frontend/src/pages/Login/Login.jsx
import { useBodyBg } from '../../hooks/useBodyBg';

function Login() {
  useBodyBg(COLORS.bg);  // '#0F172A'
  // ... 기존 코드 유지
}
```

- **무엇을 하는가**: Login 페이지가 마운트될 때 `body` 배경을 `#0F172A`로 설정
- HomePage와 동일한 배경색이므로 값도 동일하게 적용

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/hooks/useBodyBg.js` | 생성 | `useLayoutEffect` 기반 커스텀 훅 |
| `frontend/src/pages/HomePage/HomePage.jsx` | 수정 | `useBodyBg` import 및 호출 추가 |
| `frontend/src/pages/Login/Login.jsx` | 수정 | `useBodyBg` import 및 호출 추가 |

## 완료 체크리스트

- [ ] 홈(`/`) → 로그인(`/login`) 이동 시 흰색 깜빡임이 사라졌는가
- [ ] 로그인(`/login`) → 홈(`/`) 이동 시 흰색 깜빡임이 사라졌는가
- [ ] 홈페이지 기존 UI(배경, Aurora, 랭킹 등)가 그대로 표시되는가
- [ ] 로그인 페이지 기존 UI(폼, 버튼 등)가 그대로 표시되는가
- [ ] 브라우저 콘솔에 에러가 없는가
