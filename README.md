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
