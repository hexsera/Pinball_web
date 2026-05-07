# 로그아웃 시 refresh_token 쿠키가 서버에 전달되지 않는 문제

- 작성일: 2026-05-05
- 관련 작업: JWT 2단계 — Refresh Token 도입

## 증상

- 로그아웃 후 브라우저 쿠키에서 `refresh_token`은 삭제됨
- 그러나 Redis에 `refresh:*` 키가 그대로 남아 있음
- 서버 로그: `[logout] refresh_token received: None`
- 즉, `POST /api/v1/auth/logout` 요청이 200을 반환하지만 쿠키 없이 도달해 Redis 삭제가 실행되지 않음

## 원인 분석

`refresh_token` 쿠키가 `Secure` 플래그로 발급되어 있어, 브라우저는 **HTTPS 연결에서만** 해당 쿠키를 전송한다.

프론트엔드 개발 서버(`http://`)에서 테스트했기 때문에 브라우저가 쿠키를 요청에 포함하지 않았고, 서버에서 `refresh_token`을 수신하지 못해 Redis 삭제가 실행되지 않은 것이었다.

## 해결

프론트엔드를 빌드해 HTTPS 환경에서 테스트한 결과, 로그아웃 시 Redis의 refresh token이 정상적으로 삭제됨을 확인.

- **원인**: HTTP 개발 서버에서 `Secure` 쿠키 미전송
- **결론**: 코드 수정 불필요. HTTPS 환경에서 정상 동작함

## 주의사항

- 로컬 개발 환경에서 refresh token 관련 기능을 테스트할 때는 반드시 빌드 후 HTTPS 환경에서 진행해야 한다.
- HTTP 환경에서는 `Secure` 쿠키가 전송되지 않으므로 테스트 결과가 실제 동작과 다를 수 있다.

## 디버그 코드

현재 `auth.py`의 `/auth/logout`에 아래 임시 로그가 추가된 상태 — 이슈 해결 후 제거 필요:

```python
import logging
logging.warning(f"[logout] refresh_token received: {refresh_token}")
```
