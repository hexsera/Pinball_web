# Frontend README

<!--
## README 작성 요령 (Claude를 위한 가이드)

이 README는 AI가 프론트엔드를 빠르게 탐색·이해하기 위한 네비게이션 문서다.
세부 구현은 각 파일을 직접 열어서 읽도록 유도하는 것이 목적이다.

### 작성 원칙
- 각 파일 설명은 1줄로 제한. "무엇을 하는 파일인가"만 기술
- 구현 세부 사항(코드 스니펫, 동작 흐름, 함수 시그니처 등)은 적지 않는다
- API 엔드포인트는 어떤 파일에서 사용하는지 식별용으로만 기재
- 주의사항은 "이 프로젝트에서만 특이한 것"만 기재 (일반적인 라이브러리 사용법 제외)

### 업데이트 시점
업무일지를 바탕으로 README를 업데이트할 때:
1. 신규 파일이 생겼으면 디렉토리 구조에 1줄 추가
2. 라우팅이 변경됐으면 라우팅 테이블 수정
3. 기존에 없던 "특이한 주의사항"이 생겼으면 주의사항에 추가
4. 그 외 세부 변경(구현 방식, 내부 로직 등)은 README에 기록하지 않는다
-->


React + Vite 기반 핀볼 게임 웹 플랫폼 프론트엔드.

## 기술 스택

- React 19, Vite, Material-UI v7, React Router v6, Axios, Matter.js, ogl, Vitest

## 개발 명령어

```bash
npm install
npm run start   # 개발 서버 (Vite, HMR)
npm run build   # 프로덕션 빌드 → dist/
npm test        # Vitest 테스트 실행
```

## 라우팅

| URL | 컴포넌트 | 설명 |
|-----|----------|------|
| `/` | `HomePage` | 랜딩 페이지 (Aurora WebGL 배경, 랭킹 테이블) |
| `/pinball` | `PinballPage` | 핀볼 게임 전용 페이지 (홈 버튼 + 스케일 조정) |
| `/dashboard` | `Dashboard` | 게임 대시보드 (사이드바: 친구·계정) |
| `/login` | `Login` | 로그인 → 성공 시 `/dashboard` 이동 |
| `/Register` | `Register` | 3단계 회원가입 |
| `/admin` | `AdminPage` | Admin 메인 |
| `/admin/users` | `AdminUserPage` | Admin 회원 관리 |
| `/admin/statistics` | `AdminStatisticsPage` | Admin 통계 |

## 디렉토리 구조

```
src/
├── App.jsx                    # 라우팅 정의, AuthProvider 래핑
├── main.jsx                   # Vite 엔트리포인트
│
├── contexts/
│   └── AuthContext.jsx        # 전역 인증 상태 (isLoggedIn, user, login, logout). useAuth() 훅
│
├── components/
│   ├── HeaderUserInfo.jsx     # 헤더 우측 유저 정보 (로그인/로그아웃, 아바타 메뉴)
│   └── Aurora/
│       └── Aurora.jsx         # WebGL 오로라 배경 애니메이션 (ogl 셰이더). props: colorStops, amplitude, speed, blend
│
├── pages/
│   ├── HomePage/
│   │   └── HomePage.jsx       # 랜딩 페이지. Aurora 배경, 랭킹 테이블. GET /api/v1/monthly-scores
│   │
│   ├── Dashboard/
│   │   └── Dashboard.jsx      # 게임 대시보드. 사이드바 메뉴: 게임하기(→/pinball 이동)·친구·계정. showUserInfo/showFriendPage 상태로 메인 영역 전환
│   │
│   ├── Login/
│   │   └── Login.jsx          # 로그인. POST /api/v1/login
│   │
│   ├── Register/
│   │   └── Register.jsx       # 3단계 회원가입. POST /api/v1/register
│   │
│   ├── UserInfo/
│   │   └── UserInfo.jsx       # 회원 정보 조회/수정/탈퇴. GET /api/v1/users/{id}
│   │
│   ├── FriendPage/
│   │   └── FriendPage.jsx     # 친구 목록/검색/요청
│   │
│   ├── PinballPage/
│   │   ├── PinballPage.jsx    # 핀볼 전용 페이지 레이아웃 (홈 버튼, 스케일 조정, HeaderUserInfo)
│   │   └── index.js           # 단축 export
│   │
   ├── Pinball/
│   │   ├── Pinball.jsx        # Matter.js 핀볼 게임 본체 (물리 엔진, 플리퍼, 범퍼, 점수, 스테이지). 700×1200px 고정
│   │   ├── WallOverlay.jsx    # 핀볼 벽 CSS 오버레이
│   │   ├── stageConfigs.js    # 스테이지별 범퍼 배치 설정 및 공유 상수
│   │   ├── pinballSound.js    # 사운드 재생 유틸 함수
│   │   └── pinballRestart.js  # 게임 재시작 초기 상태 반환 (getRestartState)
│   │
│   └── admin/
│       ├── AdminPage.jsx      # Admin 전체 레이아웃 (Sidebar + Header + Main)
│       ├── AdminSidebar.jsx   # Admin 좌측 Drawer (260px)
│       ├── AdminHeader.jsx    # Admin 상단 AppBar
│       ├── AdminMain.jsx      # Admin 랜딩 콘텐츠
│       ├── AdminUserPage.jsx  # Admin 회원 관리 레이아웃
│       ├── AdminUserMain.jsx  # Admin 회원 DataGrid. 수정(연필)·삭제(휴지통) Dialog. GET/PUT/DELETE /api/v1/users
│       ├── AdminStatisticsPage.jsx  # Admin 통계 레이아웃
│       └── AdminStatisticsMain.jsx  # Admin 통계 콘텐츠
│
└── test/
    ├── setup.js                       # Vitest 전역 설정 (jsdom)
    ├── AdminUserMain.test.jsx         # AdminUserMain 테스트 17개. @mui/x-data-grid mock 사용
    ├── HomePage.test.jsx              # HomePage 랭킹 API 연동 테스트 4개. Aurora mock 사용
    ├── HeaderUserInfo.test.jsx
    ├── PinballSound.test.jsx
    ├── pinball-restart.test.jsx
    ├── FriendPage.test.jsx / FriendList / FriendRequest / FriendSearch / FriendPageIntegration
    └── sample.test.jsx
```

## 주의사항

- MUI v7은 Grid v2 방식: `item xs md` 대신 `size={{ xs: 12, md: 6 }}` 사용
- `@mui/x-data-grid`는 CSS import 문제로 Vitest에서 mock 처리 필요
- Aurora(`ogl` WebGL)는 Vitest 환경에서 mock 처리 필요
- Dashboard 사이드바/헤더는 별도 컴포넌트로 분리되지 않음
- Pinball 로딩 스피너 오버레이 시 `display: none` 대신 `visibility: hidden` 사용 — `display: none`이면 `sceneRef.current`가 null이 되어 Matter.js 렌더러 초기화 실패
