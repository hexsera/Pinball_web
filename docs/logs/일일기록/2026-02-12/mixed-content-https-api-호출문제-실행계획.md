# Mixed Content HTTPS API 호출 문제 실행계획

## 요구사항 요약

**요구사항**: `https://hexsera.com/` 접속 시 `http://hexsera.com/api/v1/monthly-scores/` 호출이 Mixed Content 오류로 차단되는 문제를 해결한다.

**목적**: HTTPS 페이지에서 HTTP 요청이 브라우저에 의해 차단되어 랭킹 데이터가 표시되지 않는 문제를 수정하여 정상적으로 랭킹 데이터를 불러올 수 있게 한다.

## 현재상태 분석

- `HomePage.jsx`는 `axios.get('/api/v1/monthly-scores')`로 상대 경로를 사용하고 있어 코드 자체는 문제 없음
- 빌드된 JS 번들(`html/assets/index-DVqWSRq-.js`) 안에 `http://hexsera.com` 절대 URL이 하드코딩되어 있을 가능성이 있음
- 2월 12일 프론트를 빌드했으나 변경사항 없이 올렸다고 했으므로, 빌드 당시 환경변수나 vite 설정에서 절대 URL이 주입되었을 가능성이 있음
- `vite.config.js`의 proxy 설정은 개발 서버 전용이며, 프로덕션 빌드에는 영향 없음
- Traefik이 HTTPS 443 포트에서 `/api` 경로를 FastAPI로 라우팅하므로, 상대 경로 `/api/v1/monthly-scores`는 HTTPS 환경에서 올바르게 동작해야 함
- nginx.conf에 API 관련 proxy 설정이 없음 (Traefik에서 직접 처리)

## 구현 방법

빌드된 JS 번들 파일을 검사하여 `http://` 절대 URL이 포함되어 있는지 확인하고, 문제가 있다면 프론트엔드 소스코드에서 절대 URL을 제거한 후 재빌드·재배포한다.
소스코드에 `http://` 절대 URL이 없다면, 빌드 시 환경변수(`VITE_API_BASE_URL` 등)로 잘못된 URL이 주입되었는지 확인한다.

## 구현 단계

### 1. 빌드 번들에서 하드코딩된 HTTP URL 확인

```bash
grep -o 'http://hexsera[^"' ]*' html/assets/index-DVqWSRq-.js | head -20
```

- **무엇을 하는가**: 실제 배포된 JS 번들 파일 안에 `http://hexsera.com` 절대 URL이 포함되어 있는지 확인
- 결과에 `http://hexsera.com/api/...`가 나오면, 프론트엔드 소스코드 어딘가에 절대 URL이 하드코딩된 것임
- 결과가 없으면, 빌드 환경변수 문제일 수 있음

### 2. 프론트엔드 전체에서 절대 HTTP URL 검색

```bash
grep -rn "http://hexsera\|http://localhost\|VITE_API" \
  frontend/src/
```

- **무엇을 하는가**: 소스코드 전체에서 절대 URL 또는 환경변수 참조를 찾음
- `axios.create({ baseURL: 'http://...' })` 또는 개별 컴포넌트의 하드코딩된 URL을 발견하기 위함
- 발견된 파일과 라인을 기록해 수정 대상 파일 확정

### 3. 절대 URL을 상대 경로로 수정

```javascript
// 수정 전 (예시 - 발견된 코드)
axios.get('http://hexsera.com/api/v1/monthly-scores')

// 수정 후
axios.get('/api/v1/monthly-scores')
```

- **무엇을 하는가**: 절대 URL을 상대 경로로 변경하여 브라우저가 현재 페이지의 프로토콜(HTTPS)을 그대로 사용하게 만듦
- 상대 경로 `/api/...`는 HTTPS 환경에서는 자동으로 `https://hexsera.com/api/...`로 해석됨
- axios 인스턴스를 공통으로 사용 중이라면 `baseURL` 제거 또는 빈 문자열로 설정

### 4. 환경변수 파일 확인 및 정리

```bash
# frontend/.env, frontend/.env.production 확인
cat frontend/.env 2>/dev/null
cat frontend/.env.production 2>/dev/null
```

- **무엇을 하는가**: Vite 빌드 시 `VITE_` 접두사 환경변수가 번들에 직접 삽입되므로, `VITE_API_BASE_URL=http://...` 같은 잘못된 값이 없는지 확인
- 프로덕션 빌드용 `.env.production`에 HTTP URL이 설정되어 있으면 삭제 또는 HTTPS로 변경

### 5. 프론트엔드 재빌드 및 재배포

```bash
# 프론트엔드 빌드
cd frontend && npm run build

# dist/ 파일을 html/ 폴더로 복사
cp -r dist/* ../html/

# html-data-volume에 배포
docker run --rm \
  -v html-data-volume:/data \
  -v $(pwd)/../html:/source \
  alpine sh -c "cp -r /source/. /data/"
```

- **무엇을 하는가**: 수정된 소스코드를 프로덕션 빌드하여 실제 서비스에 반영
- `dist/`에 새 번들 파일이 생성되고, Docker 볼륨에 업로드하면 Nginx가 새 파일 서비스

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/` 내 해당 파일 | 수정 | 절대 HTTP URL → 상대 경로로 변경 |
| `frontend/.env.production` | 수정/삭제 | VITE_API_BASE_URL 등 HTTP 절대 URL 제거 (존재 시) |
| `html/assets/index-*.js` | 재생성 | 재빌드로 새 번들 파일 교체 |
| `html/assets/index-*.css` | 재생성 | 재빌드로 새 CSS 파일 교체 |
| `html/index.html` | 재생성 | 새 번들 파일명을 참조하도록 업데이트 |

## 완료 체크리스트

- [ ] `html/assets/index-*.js` 파일 안에 `http://hexsera.com` 문자열이 없음
- [ ] `https://hexsera.com/` 접속 시 브라우저 콘솔에 Mixed Content 오류가 없음
- [ ] `https://hexsera.com/` 홈 화면의 이번 달 랭킹 테이블에 데이터가 표시됨
- [ ] 브라우저 네트워크 탭에서 `monthly-scores` 요청이 HTTPS로 전송되고 200 응답 확인
- [ ] 다른 API 엔드포인트(로그인, 회원가입 등)도 정상 동작 확인
