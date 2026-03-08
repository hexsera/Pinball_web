# React 개발 서버와 FastAPI 연결 실행 계획

## 목적

React 개발 서버(Vite)에서 FastAPI로 API 요청을 원활하게 보낼 수 있도록 설정하여, 빌드 없이 개발 환경에서 바로 테스트할 수 있도록 한다.

## 현재 상황 분석

### 프로덕션 환경 (Docker)
```
인터넷 → Traefik(:80/:443) → Nginx → React 정적 파일
                           → FastAPI(:8000) → /api/* 경로
```
- 같은 도메인 (hexsera.com)에서 서빙
- Traefik이 `/api/*` 경로를 FastAPI로 라우팅
- CORS 이슈 없음 (Same-Origin)

### 로컬 개발 환경 (현재)
```
React 개발 서버: localhost:5173 (Vite)
FastAPI 서버:    localhost:8000
```
- **문제**: 다른 포트 → Cross-Origin 요청
- **증상**: CORS 에러 발생 가능
- **원인**: Vite 프록시 미설정, FastAPI CORS 미설정

### React 코드의 API 요청 패턴

모든 API 요청이 **상대 경로**를 사용:
```javascript
axios.post('/api/v1/login', ...)      // Login.jsx
axios.post('/api/v1/register', ...)   // Register.jsx
axios.get('/api/v1/users/${id}', ...) // UserInfo.jsx
```

**문제점**:
- 개발 서버(`localhost:5173`)에서 `/api/v1/login` 호출 시
- 실제 요청: `http://localhost:5173/api/v1/login` (❌ 존재하지 않음)
- 의도한 요청: `http://localhost:8000/api/v1/login` (✅ FastAPI 엔드포인트)

## 해결 방안 비교

### 옵션 1: Vite 프록시 설정 (권장) ⭐

**장점**:
- 개발 환경에서만 작동, 프로덕션 영향 없음
- React 코드 수정 불필요
- 투명한 프록시 (브라우저는 같은 도메인으로 인식)
- 구현 간단 (설정 파일 4줄)

**단점**:
- Vite 개발 서버 재시작 필요

**구현**:
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
});
```

**동작 원리**:
1. 브라우저 → `http://localhost:5173/api/v1/login`
2. Vite 개발 서버가 프록시 → `http://localhost:8000/api/v1/login`
3. FastAPI 응답 → Vite → 브라우저
4. 브라우저는 CORS 이슈를 인식하지 못함 (같은 도메인)

### 옵션 2: FastAPI CORS 설정

**장점**:
- 명시적인 보안 정책
- 브라우저 자동 검증
- 프로덕션에서도 사용 가능

**단점**:
- FastAPI 코드 수정 필요
- 프로덕션에서 불필요 (Traefik이 처리)
- 보안상 허용 도메인 관리 필요

**구현**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://hexsera.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 옵션 3: axios 기본 URL + 환경변수

**장점**:
- 명시적인 API 베이스 URL 관리
- 환경별 다른 URL 설정 가능

**단점**:
- 모든 axios 호출 수정 필요
- 상대 경로 사용 불가
- 코드 변경 범위가 큼

## 권장 솔루션: Vite 프록시 설정

### 이유

1. **개발 편의성**: 코드 수정 없이 즉시 개발 가능
2. **프로덕션 영향 없음**: Vite 개발 서버 설정만 변경
3. **최소 변경**: 설정 파일 1개만 수정
4. **투명성**: React 코드는 상대 경로 유지
5. **Docker 환경과 일관성**: 프로덕션과 동일한 경로 구조

### 구현 단계

#### 단계 1: vite.config.js 수정

**파일**: `/home/hexsera/Pinball_web/react/main/vite.config.js`

**현재 코드**:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**수정 후 코드**:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
```

**설정 옵션 설명**:
- `target`: 프록시 대상 서버 (FastAPI)
- `changeOrigin`: Host 헤더를 target URL로 변경 (CORS 회피)
- `secure`: HTTPS 인증서 검증 비활성화 (로컬 개발용)

#### 단계 2: Docker FastAPI 서버 실행 확인

```bash
# FastAPI 서버가 실행 중인지 확인
docker compose ps | grep fastapi

# 실행 중이 아니면 시작
docker compose up -d fastapi

# 로그 확인
docker compose logs -f fastapi
```

#### 단계 3: React 개발 서버 재시작

```bash
cd /home/hexsera/Pinball_web/react/main

# 기존 개발 서버 종료 (Ctrl+C)

# 개발 서버 재시작
npm start
```

#### 단계 4: 테스트

**브라우저에서 확인**:
1. React 개발 서버 접속: `http://localhost:5173`
2. 로그인 페이지로 이동
3. 테스트 계정으로 로그인 시도:
   - 이메일: `admin@hexsera.com`
   - 비밀번호: `admin_secure_password_2026`
4. 개발자 도구(F12) → Network 탭에서 API 요청 확인
   - 요청 URL: `http://localhost:5173/api/v1/login` (브라우저 표시)
   - 실제 프록시: `http://localhost:8000/api/v1/login` (백엔드)
   - 상태 코드: 200 OK

**터미널에서 확인**:
```bash
# FastAPI 로그에서 요청 확인
docker compose logs fastapi | grep "POST /api/v1/login"
```

## 프록시 동작 원리

### 요청 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  브라우저 (localhost:5173)                                       │
│  axios.post('/api/v1/login', ...)                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ HTTP POST /api/v1/login
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vite 개발 서버 (localhost:5173)                                │
│  - /api 경로 감지                                               │
│  - 프록시 규칙 적용                                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ HTTP POST localhost:8000/api/v1/login
                   │ (changeOrigin: true → Host 헤더 변경)
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI 서버 (localhost:8000)                                  │
│  - 로그인 엔드포인트 처리                                        │
│  - 응답 반환                                                    │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ HTTP 200 OK + JSON
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vite 개발 서버 → 브라우저                                       │
│  - 응답 전달 (Same-Origin으로 인식)                            │
└─────────────────────────────────────────────────────────────────┘
```

### CORS 회피 메커니즘

**CORS 문제 발생 조건**:
- 브라우저가 다른 Origin(`localhost:8000`)으로 요청
- FastAPI에 CORS 헤더 없음
- 브라우저가 응답 차단

**프록시로 해결**:
- 브라우저는 같은 Origin(`localhost:5173`)으로 요청
- Vite가 서버 측에서 FastAPI로 프록시
- 서버-서버 통신은 CORS 제약 없음
- 브라우저는 Same-Origin으로 인식

## 추가 설정 (선택 사항)

### 1. 여러 API 경로 프록시

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,  // WebSocket 프록시
      }
    }
  }
})
```

### 2. 경로 재작성 (Rewrite)

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')  // /api 제거
      }
    }
  }
})
```

**예시**:
- 요청: `/api/v1/login`
- 프록시: `http://localhost:8000/v1/login` (api 제거)

**주의**: 현재 프로젝트는 FastAPI도 `/api` 경로를 사용하므로 불필요

### 3. 개발 서버 포트 변경

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,  // 기본값 5173 → 3000으로 변경
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

## 검증 체크리스트

### 설정 확인
- [ ] vite.config.js에 proxy 설정 추가
- [ ] FastAPI 서버 실행 중 (`docker compose ps`)
- [ ] React 개발 서버 재시작 (`npm start`)

### 기능 테스트
- [ ] 로그인 기능 정상 작동 (POST /api/v1/login)
- [ ] 회원가입 기능 정상 작동 (POST /api/v1/register)
- [ ] 회원 정보 조회 정상 작동 (GET /api/v1/users/:id)
- [ ] 점수 전송 정상 작동 (POST /api/v1/scores)
- [ ] 친구 요청 조회 정상 작동 (GET /api/friend-requests)

### 네트워크 확인
- [ ] 브라우저 개발자 도구 → Network 탭에서 API 요청 확인
- [ ] 요청 URL이 `localhost:5173/api/*` 형식
- [ ] 상태 코드 200 (성공) 또는 적절한 에러 코드
- [ ] CORS 에러 없음

### FastAPI 로그 확인
- [ ] `docker compose logs fastapi`에서 API 요청 로그 확인
- [ ] 요청이 FastAPI 서버에 도달하는지 확인

## 트러블슈팅

### 문제 1: 여전히 CORS 에러 발생

**원인**: Vite 개발 서버가 재시작되지 않음

**해결**:
```bash
# 개발 서버 종료 (Ctrl+C)
# 재시작
npm start
```

### 문제 2: 404 Not Found 에러

**원인**: FastAPI 서버가 실행 중이 아님

**확인**:
```bash
docker compose ps | grep fastapi
```

**해결**:
```bash
docker compose up -d fastapi
```

### 문제 3: Connection Refused 에러

**원인**: FastAPI 서버 포트가 8000이 아님

**확인**:
```bash
docker compose ps
```

**해결**: vite.config.js의 target 포트 수정

### 문제 4: 프록시 설정이 적용되지 않음

**원인**: Vite 캐시 문제

**해결**:
```bash
# 캐시 삭제 후 재시작
rm -rf react/main/node_modules/.vite
npm start
```

## 프로덕션 배포 시 주의사항

### Vite 프록시는 개발 환경에만 작동

**개발 환경**:
- `npm start` → Vite 개발 서버 실행
- 프록시 설정 활성화
- `/api/*` → `localhost:8000`

**프로덕션 환경**:
- `npm run build` → 정적 파일 생성 (dist/)
- 프록시 설정 무시됨
- Traefik이 `/api/*` 라우팅 처리

**결론**: 프로덕션 배포에 영향 없음

### Docker Compose 환경

Docker Compose로 전체 스택 실행 시:
- Traefik이 모든 라우팅 처리
- Vite 프록시 설정과 독립적
- 정상 작동 보장

## 파일 구조

```
Pinball_web/
├── react/main/
│   ├── vite.config.js          # 프록시 설정 추가 (이 파일만 수정)
│   ├── package.json            # 개발 스크립트 확인
│   └── src/
│       ├── Login.jsx           # API 호출 (수정 불필요)
│       ├── Register.jsx        # API 호출 (수정 불필요)
│       └── UserInfo.jsx        # API 호출 (수정 불필요)
├── fastapi/
│   └── main.py                 # FastAPI 엔드포인트 (수정 불필요)
└── docker-compose.yml          # FastAPI 포트 확인 (수정 불필요)
```

## 완료 조건

1. ✅ vite.config.js에 프록시 설정 추가
2. ✅ React 개발 서버에서 로그인 성공
3. ✅ React 개발 서버에서 회원가입 성공
4. ✅ React 개발 서버에서 회원 정보 조회 성공
5. ✅ CORS 에러 없음
6. ✅ FastAPI 로그에서 요청 확인 가능
7. ✅ 프로덕션 배포 영향 없음 (Docker Compose 정상 작동)

## 참고 문서

- Vite 공식 문서 (Server Options): https://vitejs.dev/config/server-options.html#server-proxy
- FastAPI CORS 문서: https://fastapi.tiangolo.com/tutorial/cors/
- CLAUDE.md: 프로젝트 전체 구조 및 아키텍처
- docker-compose.yml: FastAPI 포트 설정

## 예상 소요 시간

- 설정 파일 수정: 1분
- 개발 서버 재시작: 1분
- 테스트 및 검증: 3분
- **총 소요 시간**: 약 5분
