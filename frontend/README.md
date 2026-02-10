# Frontend README

React + Vite 기반 핀볼 게임 웹 플랫폼 프론트엔드.

## 기술 스택

- **React 19** (함수형 컴포넌트, Hooks)
- **Vite** (빌드 도구, 개발 서버)
- **Material-UI (MUI)** (UI 컴포넌트)
- **React Router v6** (클라이언트 라우팅)
- **Axios** (HTTP 요청)
- **Matter.js** (핀볼 게임 물리 엔진)
- **Vitest** (테스트)

## 개발 명령어

```bash
npm install
npm run start   # 개발 서버 (Vite, HMR)
npm run build   # 프로덕션 빌드 → dist/
npm test        # Vitest 테스트 실행
```

## 디렉토리 구조

```
src/
├── App.jsx                    # 루트 컴포넌트. React Router 라우팅 정의, AuthProvider 래핑
├── main.jsx                   # Vite 엔트리포인트
│
├── contexts/
│   ├── AuthContext.jsx        # 전역 인증 상태 (AuthProvider, useAuth)
│   └── index.js               # barrel export
│
├── components/
│   └── HeaderUserInfo.jsx     # 헤더 우측 유저 정보 영역 (로그인/로그아웃, 알림, 아바타 메뉴)
│
├── pages/
│   ├── Dashboard/
│   │   ├── Dashboard.jsx      # 메인 대시보드 (사이드바, 헤더 포함). 내부 라우팅으로 Pinball/UserInfo/FriendPage 조건부 렌더링
│   │   └── index.js
│   │
│   ├── Login/
│   │   ├── Login.jsx          # 로그인 폼. POST /api/v1/login, AuthContext.login() 호출
│   │   └── index.js
│   │
│   ├── Register/
│   │   ├── Register.jsx       # 3단계 회원가입 폼. POST /api/v1/register
│   │   └── index.js
│   │
│   ├── UserInfo/
│   │   ├── UserInfo.jsx       # 회원 정보 조회/수정/탈퇴. GET /api/v1/users/{id}
│   │   └── index.js
│   │
│   ├── FriendPage/
│   │   ├── FriendPage.jsx     # 친구 목록/검색/요청 페이지
│   │   └── index.js
│   │
│   ├── Pinball/
│   │   ├── Pinball.jsx        # Matter.js 핀볼 게임 본체 (물리 엔진, 플리퍼, 범퍼, 점수, 스테이지)
│   │   ├── WallOverlay.jsx    # 핀볼 벽 CSS 오버레이 (Matter.js 캔버스 위에 렌더링)
│   │   ├── stageConfigs.js    # 스테이지별 범퍼 배치 설정, 공유 상수 (BUMPER_RADIUS, BUMPER_OPTIONS 등)
│   │   ├── pinballSound.js    # 사운드 재생 유틸 함수 (playFlipperSound, playBumperSound 등)
│   │   ├── pinballRestart.js  # 게임 재시작 시 초기 상태값 반환 (getRestartState)
│   │   └── index.js
│   │
│   └── admin/
│       ├── AdminPage.jsx      # Admin 전체 레이아웃 (Sidebar + Header + Main 조합)
│       ├── AdminSidebar.jsx   # Admin 좌측 Drawer 사이드바 (260px)
│       ├── AdminHeader.jsx    # Admin 상단 AppBar (HeaderUserInfo 포함)
│       ├── AdminMain.jsx      # Admin 메인 콘텐츠 영역
│       ├── AdminUserPage.jsx  # Admin 회원 관리 페이지 레이아웃
│       ├── AdminUserMain.jsx  # Admin 회원 관리 메인 콘텐츠
│       ├── AdminStatisticsPage.jsx  # Admin 통계 페이지 레이아웃
│       ├── AdminStatisticsMain.jsx  # Admin 통계 메인 콘텐츠
│       └── index.js           # barrel export (AdminPage, AdminUserPage, AdminStatisticsPage)
│
├── test/
│   ├── setup.js               # Vitest 전역 설정
│   ├── sample.test.jsx
│   ├── PinballSound.test.jsx  # pinballSound.js 단위 테스트
│   ├── pinball-restart.test.jsx # pinballRestart.js 단위 테스트
│   ├── FriendPage.test.jsx
│   ├── FriendList.test.jsx
│   ├── FriendPageIntegration.test.jsx
│   ├── FriendRequest.test.jsx
│   ├── FriendSearch.test.jsx
│   └── HeaderUserInfo.test.jsx
```

## 라우팅

| URL | 컴포넌트 | 설명 |
|-----|----------|------|
| `/` | `Dashboard` | 메인 대시보드 |
| `/login` | `Login` | 로그인 |
| `/Register` | `Register` | 회원가입 |
| `/Pinball_test` | `Pinball` | 핀볼 게임 독립 페이지 |
| `/admin` | `AdminPage` | Admin 메인 |
| `/admin/users` | `AdminUserPage` | Admin 회원 관리 |
| `/admin/statistics` | `AdminStatisticsPage` | Admin 통계 |

Dashboard는 URL 변경 없이 내부 상태(`showPinball`, `showUserInfo`, `showFriendPage`)로 Pinball/UserInfo/FriendPage를 조건부 렌더링한다.

## 인증 (AuthContext)

- **저장소**: `localStorage` (`user` 키, `{ id, name }` 형식)
- **페이지 로드 시**: `useEffect`로 localStorage 복원
- **제공 값**: `isLoggedIn`, `user`, `login(userData)`, `logout()`
- **접근**: `useAuth()` 훅 사용. `AuthProvider`는 `App.jsx`에서 전체 앱을 감싼다.

```js
// 사용 예시
const { isLoggedIn, user, login, logout } = useAuth();
```

## API 연동

백엔드 FastAPI와 Axios로 통신. 상대 경로 사용 (`/api/v1/...`).

인증이 필요한 엔드포인트는 요청 헤더에 API Key를 포함한다:
```js
headers: { 'X-API-Key': 'hexsera-secret-api-key-2026' }
```

## Pinball 게임 구조

`pages/Pinball/` 내에 게임 관련 파일이 모두 위치한다.

- **`Pinball.jsx`**: Matter.js Engine/Render/Runner 생성 및 게임 루프 관리. `useEffect`로 마운트 시 초기화, 언마운트 시 정리.
- **`stageConfigs.js`**: 스테이지별 범퍼 위치 배열(`STAGE_CONFIGS`)과 공유 상수(`BUMPER_RADIUS`, `BUMPER_OPTIONS`) 정의.
- **`pinballSound.js`**: Audio 객체를 인자로 받아 재생하는 순수 함수들. `currentTime = 0` 후 `play()` 호출.
- **`pinballRestart.js`**: `getRestartState()` — 재시작 시 초기 상태 객체 반환 (`score: 0`, `lives: 3`, `stage: 1`, `overlayState: null`).
- **`WallOverlay.jsx`**: Matter.js 캔버스 위에 절대 위치로 렌더링되는 CSS 벽 컴포넌트.

Matter.js 캔버스는 `transparent` 배경, 그 위를 감싸는 MUI `Box`에 배경이미지(`/images/pinball_back.png`)를 `backgroundSize: '100% 100%'`로 적용한다.

## 주의사항

- `App.jsx`는 `src/pages/admin/`의 barrel export(`index.js`)를 통해 import한다.
- Dashboard에 내장된 사이드바/헤더는 아직 별도 컴포넌트로 분리되지 않았다.
