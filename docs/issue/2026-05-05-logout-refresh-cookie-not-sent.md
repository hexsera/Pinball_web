# 로그아웃 시 refresh_token 쿠키가 서버에 전달되지 않는 문제

- 작성일: 2026-05-05
- 관련 작업: JWT 2단계 — Refresh Token 도입

## 증상

- 로그아웃 후 브라우저 쿠키에서 `refresh_token`은 삭제됨
- 그러나 Redis에 `refresh:*` 키가 그대로 남아 있음
- 서버 로그: `[logout] refresh_token received: None`
- 즉, `POST /api/v1/auth/logout` 요청이 200을 반환하지만 쿠키 없이 도달해 Redis 삭제가 실행되지 않음

## 원인 분석

로그인 시 쿠키를 발급할 때 `path="/api/v1/auth"`로 설정했다.

```python
response.set_cookie(
    key="refresh_token",
    ...
    path="/api/v1/auth",
)
```

브라우저는 쿠키의 `path`와 요청 URL의 경로가 일치할 때만 쿠키를 전송한다. 현재 구조에서 실제 요청 경로가 브라우저 기준으로 `/api/v1/auth/logout`이어야 쿠키가 전송되는데, 이 부분이 예상대로 동작하지 않는 것으로 보인다.

Traefik → FastAPI 경유 시 경로 처리 방식 또는 프론트엔드 axios 요청의 `withCredentials` 설정 문제일 가능성이 있다.

## 확인이 필요한 항목

1. **`withCredentials` 설정**: `AuthContext.jsx`의 logout 호출이 `withCredentials: true`를 포함하는지 확인
2. **쿠키 path 범위 확대**: `path="/api/v1/auth"` 대신 `path="/"` 로 변경해 브라우저가 모든 경로에서 쿠키를 전송하도록 설정하는 방안 검토
3. **브라우저 DevTools 확인**: 로그아웃 요청의 Request Headers에 `Cookie: refresh_token=...` 이 포함되어 있는지 직접 확인

## 임시 상태

- 로그아웃 시 브라우저 쿠키는 삭제되므로 사용자 입장에서는 로그아웃된 것처럼 보임
- 단, Redis의 Refresh Token이 TTL(30일) 만료 전까지 유효한 상태로 남아 있어 탈취 시 재사용 가능한 보안 취약점 존재

## 디버그 코드

현재 `auth.py`의 `/auth/logout`에 아래 임시 로그가 추가된 상태 — 이슈 해결 후 제거 필요:

```python
import logging
logging.warning(f"[logout] refresh_token received: {refresh_token}")
```
