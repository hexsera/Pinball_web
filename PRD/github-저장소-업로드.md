# GitHub 저장소 업로드 PRD

## 목표

nginx2 프로젝트를 GitHub 저장소(https://github.com/hexsera/Pinball_web.git)에 업로드하여 버전 관리 시작. 민감한 정보(비밀번호, 인증서, API 키)는 제외하고 소스 코드만 업로드.

## 현재상태 분석

- nginx2 프로젝트는 `/home/hexsera/long_time_test/nginx2/` 경로에 위치
- Git 저장소로 초기화되지 않음 (.git 디렉토리 없음)
- 민감 정보 파일: `acme.json` (SSL 인증서), `fastapi/.env` (DB 비밀번호, Admin 계정 정보)
- 빌드 결과물: `react/main/node_modules`, `react/main/dist`
- Docker 관련 파일: `docker-compose.yml`, `nginx.conf`, `traefik.yml` 포함
- 총 용량: node_modules 포함 시 수백 MB (제외 필요)

## 실행 방법 및 단계

1. **GitHub 저장소 클론** (로컬 작업 디렉토리에)
   ```bash
   cd /home/hexsera/long_time_test/
   git clone https://github.com/hexsera/Pinball_web.git
   ```

2. **.gitignore 파일 생성** (Pinball_web/ 디렉토리 내)
   ```bash
   cd Pinball_web
   cat > .gitignore << 'EOF'
   # 환경변수 및 민감한 정보
   .env
   *.pem
   *.key
   acme.json

   # Node.js
   node_modules/
   dist/
   build/
   .npm
   .eslintcache

   # Python
   __pycache__/
   *.py[cod]
   *$py.class
   *.so
   .Python
   env/
   venv/

   # Docker 볼륨 백업
   volume-backup/
   *.tar.gz

   # IDE
   .vscode/
   .idea/
   *.swp
   *.swo

   # OS
   .DS_Store
   Thumbs.db

   # Claude
   .claude/
   EOF
   ```

3. **nginx2 파일 복사** (Pinball_web/ 디렉토리로)
   ```bash
   # 필요한 파일만 선택적으로 복사
   cp -r /home/hexsera/long_time_test/nginx2/react ./
   cp -r /home/hexsera/long_time_test/nginx2/fastapi ./
   cp -r /home/hexsera/long_time_test/nginx2/nginx ./
   cp -r /home/hexsera/long_time_test/nginx2/html ./
   cp -r /home/hexsera/long_time_test/nginx2/PRD ./
   cp /home/hexsera/long_time_test/nginx2/CLAUDE.md ./
   cp /home/hexsera/long_time_test/nginx2/docker-compose.yml ./
   cp /home/hexsera/long_time_test/nginx2/nginx.conf ./
   cp /home/hexsera/long_time_test/nginx2/traefik.yml ./
   ```

4. **민감한 정보 제거 확인**
   ```bash
   # .gitignore가 제대로 작동하는지 확인
   git status
   # acme.json, .env 파일이 나타나지 않아야 함
   ```

5. **.env.example 파일 생성** (다른 개발자를 위한 템플릿)
   ```bash
   cat > fastapi/.env.example << 'EOF'
   MYSQL_HOST=mysql-server
   MYSQL_PORT=3306
   MYSQL_DATABASE=hexdb
   MYSQL_USER=your_mysql_user
   MYSQL_PASSWORD=your_mysql_password

   # Admin Account Seed Data
   ADMIN_EMAIL=admin@example.com
   ADMIN_NICKNAME=admin
   ADMIN_PASSWORD=your_admin_password
   ADMIN_BIRTH_DATE=2000-01-01
   EOF
   ```

6. **README.md 생성** (프로젝트 설명 파일)
   ```bash
   cat > README.md << 'EOF'
   # Pinball Web Platform

   Docker 기반의 핀볼 게임 웹 플랫폼. Traefik(리버스 프록시), Nginx(웹 서버), React(프론트엔드), FastAPI(백엔드 API), MySQL(데이터베이스)로 구성.

   ## 시작하기

   1. `.env` 파일 생성
      ```bash
      cp fastapi/.env.example fastapi/.env
      # .env 파일을 열어 실제 값으로 수정
      ```

   2. Docker Compose 실행
      ```bash
      docker compose up -d
      ```

   3. 웹사이트 접속
      - 로컬: http://localhost
      - 프로덕션: https://hexsera.com

   자세한 내용은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.
   EOF
   ```

7. **Git 커밋 및 푸시**
   ```bash
   git add .
   git commit -m "Initial commit: Pinball Web Platform

   - Docker 기반 웹 플랫폼 (Traefik, Nginx, React, FastAPI, MySQL)
   - 핀볼 게임 (Matter.js 물리 엔진)
   - 사용자 인증 및 회원 관리 API
   - Admin 페이지 구현

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

   git push origin main
   # 또는 git push origin master (기본 브랜치에 따라)
   ```

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|-------------|------|
| Git | 버전 관리 시스템 |
| GitHub | 원격 저장소 호스팅 |
| .gitignore | Git에서 추적하지 않을 파일 지정 |
| .env.example | 환경변수 템플릿 파일 (민감정보 제외) |

## 테스트 방법

1. **GitHub에서 저장소 확인**
   - 웹 브라우저에서 https://github.com/hexsera/Pinball_web 접속

2. **민감한 정보 유출 확인**
   - GitHub 저장소에서 `acme.json` 파일이 없는지 확인
   - GitHub 저장소에서 `.env` 파일이 없는지 확인
   - GitHub 저장소에서 비밀번호가 포함된 파일이 없는지 확인

3. **필수 파일 업로드 확인**
   - `CLAUDE.md`, `docker-compose.yml`, `README.md` 존재 확인
   - `react/`, `fastapi/`, `nginx/` 디렉토리 존재 확인
   - `.gitignore`, `fastapi/.env.example` 존재 확인

4. **다른 환경에서 클론 테스트**
   ```bash
   cd /tmp
   git clone https://github.com/hexsera/Pinball_web.git
   cd Pinball_web
   ls -la
   # 필요한 파일들이 모두 있는지 확인
   ```

## 체크리스트

- [ ] GitHub 저장소에 민감한 정보가 업로드되지 않음 (acme.json, .env 파일 없음)
- [ ] .gitignore 파일이 생성되어 node_modules, dist, __pycache__ 등이 제외됨
- [ ] fastapi/.env.example 파일이 생성되어 환경변수 템플릿 제공
- [ ] README.md 파일이 생성되어 프로젝트 설명 및 시작 가이드 제공
- [ ] CLAUDE.md, docker-compose.yml, PRD/ 디렉토리가 업로드됨
- [ ] react/, fastapi/, nginx/ 디렉토리가 업로드됨
- [ ] git push 명령이 성공적으로 완료됨
- [ ] GitHub 웹페이지에서 업로드된 파일 확인 완료
- [ ] 다른 환경에서 git clone 테스트 성공
