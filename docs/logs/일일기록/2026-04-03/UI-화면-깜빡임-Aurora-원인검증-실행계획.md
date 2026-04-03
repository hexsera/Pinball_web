# UI 화면 깜빡임 - Aurora 원인 검증 및 수정 실행계획

## 요구사항 요약

**요구사항**: 홈페이지(`/`)와 로그인 페이지(`/login`) 사이 전환 시 발생하는 흰색 깜빡임 제거

**목적**: Aurora 컴포넌트의 WebGL 초기화가 `useEffect`(페인트 이후 실행) 안에서 이루어지므로, 마운트 직후 첫 페인트 시점에 Aurora 영역이 투명하게 노출되는 문제를 해결한다.

## 현재상태 분析

- `Aurora.jsx`: WebGL 렌더러를 `useEffect` 내부에서 초기화 → 첫 렌더링 시 `.aurora-container` div가 배경 없이 노출됨
- `Aurora.css`: `.aurora-container`에 배경색 없음 → WebGL 붙기 전 투명 상태
- `HomePage.jsx`, `Login.jsx`: 감싸는 Box에 `backgroundColor: '#0F172A'`는 있으나, Aurora 컨테이너 위 레이어(MUI Paper 등)가 순간 흰색으로 노출될 가능성 있음
- `useBodyBg` 훅은 정상 동작하나 깜빡임 미해결 상태

## 구현 방법

**1단계 (검증)**: `.aurora-container`에 `background-color: #0F172A`를 추가해 WebGL 로드 전 공백 시점을 메운다. 깜빡임이 사라지면 Aurora 마운트 전 공백이 원인으로 확정된다.

**2단계 (확정 시 정식 수정)**: 각 페이지에서 Aurora에 배경색 prop을 전달하거나, Aurora 컴포넌트 자체에 `bgColor` prop을 추가해 페이지별 배경색을 동적으로 적용한다.

## 구현 단계

### 1. [검증] Aurora.css에 배경색 추가

```css
.aurora-container {
  width: 100%;
  height: 100%;
  background-color: #0F172A;
}
```

- **무엇을 하는가**: WebGL 캔버스가 DOM에 삽입되기 전까지의 공백 순간을 배경색으로 채워 흰색 노출을 방지
- WebGL은 `useEffect`(페인트 후) 실행이므로 첫 프레임 전 div가 투명하게 보이는 시간이 존재함
- 이 수정이 깜빡임을 없애면 원인 확정, 없애지 못하면 다른 원인 추가 조사 필요

### 2. [검증 확정 시] Aurora에 bgColor prop 추가

```jsx
// Aurora.jsx
export default function Aurora({ bgColor = 'transparent', ...props }) {
  // ...
  return <div ref={ctnDom} className="aurora-container" style={{ backgroundColor: bgColor }} />;
}
```

- **무엇을 하는가**: 각 페이지가 Aurora에 자신의 배경색을 전달할 수 있도록 prop 추가
- CSS 하드코딩 대신 prop으로 처리하면 배경색이 다른 페이지에서도 재사용 가능
- `style`은 CSS보다 우선순위가 높아 페이지별 색상이 정확히 적용됨

### 3. [검증 확정 시] 각 페이지에서 bgColor 전달

```jsx
// HomePage.jsx, Login.jsx
<Aurora
  colorStops={['#467ee5', '#7C3AED', '#908aff']}
  amplitude={1.2}
  speed={1.2}
  blend={0.35}
  bgColor={COLORS.bg}
/>
```

- **무엇을 하는가**: Aurora가 WebGL을 초기화하기 전 div 배경을 해당 페이지의 배경색(`#0F172A`)으로 채움
- `COLORS.bg`는 이미 각 페이지에 상수로 정의되어 있으므로 별도 값 추가 불필요

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/components/Aurora/Aurora.css` | 수정 | `.aurora-container`에 `background-color: #0F172A` 추가 (검증용) |
| `frontend/src/components/Aurora/Aurora.jsx` | 수정 | `bgColor` prop 추가, container div에 style 적용 (검증 확정 시) |
| `frontend/src/pages/HomePage/HomePage.jsx` | 수정 | Aurora에 `bgColor={COLORS.bg}` 전달 (검증 확정 시) |
| `frontend/src/pages/Login/Login.jsx` | 수정 | Aurora에 `bgColor={COLORS.bg}` 전달 (검증 확정 시) |

## 완료 체크리스트

- [ ] 홈 → 로그인 이동 시 흰색 깜빡임이 사라짐
- [ ] 로그인 → 홈 이동(뒤로가기 포함) 시 흰색 깜빡임이 사라짐
- [ ] Aurora 애니메이션이 정상적으로 동작함 (WebGL 렌더링 영향 없음)
- [ ] 빌드 오류 없이 `npm run build` 성공
