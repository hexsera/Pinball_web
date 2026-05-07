# refresh_token 쿠키가 새로고침 시 사라지는 문제

- 작성일: 2026-05-07
- 주제 ID: 3fa4df
- 상태: 해결 완료

## 증상

- `hexsera.com`(HTTPS) 환경에서 로그인 시 `refresh_token` 쿠키가 정상 발급됨
- 새로고침하면 브라우저 Application 탭에서 `refresh_token` 쿠키가 사라짐
- `/auth/logout` 호출 없음, 만료 기간도 한 달 남음, 네트워크 요청 어디에도 쿠키 삭제 흔적 없음

## 원인 분석

로그인 응답 헤더:
```
set-cookie: refresh_token=...; Max-Age=2592000; Path=/; SameSite=none
```

`SameSite=None`인데 `Secure` 속성이 빠져 있었다.

브라우저 규칙상 **`SameSite=None` 쿠키는 반드시 `Secure`와 함께 설정해야 저장된다.** `Secure`가 없으면 브라우저가 쿠키를 거부하여 저장 자체가 안 된다.

트러블슈팅 과정에서 쿠키 설정을 느슨하게 바꾸면서 `secure=False`로 설정했는데, `samesite="none"`과 조합되어 브라우저가 쿠키를 아예 거부하게 된 것이 원인이었다.

## 트러블슈팅 과정

1. `/auth/logout` 호출 여부 확인 → 호출 없음
2. 네트워크 요청들의 Response Headers에서 `Set-Cookie` 확인 → 없음
3. 쿠키 설정 전체를 느슨하게 변경하여 원인 좁히기 시도
   - `path="/api/v1/auth"` → `path="/"`
   - `samesite="lax"` → `samesite="none"`
   - `secure=True` → `secure=False` ← 이 조합이 문제
4. 로그인 응답 헤더에서 `Secure` 속성 누락 확인
5. `secure=True`로 복원 → 해결

## 해결

`auth.py`의 `set_cookie`에서 `secure=True` 복원:

```python
response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=False,
    secure=True,        # SameSite=None 사용 시 필수
    samesite="none",
    max_age=REFRESH_TTL,
    path="/",
)
```

## 이상한 점 → 검증 완료

트러블슈팅 중 `secure=False`가 원인이라고 판단했으나, 원상복귀 후 재검증한 결과 실제 원인은 달랐다.

**검증 방법:**
1. 원상복귀(`httponly=True`, `secure=True`, `samesite="lax"`, `path="/api/v1/auth"`) 후 로그인
2. Application 탭에서 `refresh_token` 쿠키 확인 → 있음
3. 새로고침 → Application 탭에서 사라짐
4. Access Token 만료 후 재발급 요청(`/api/v1/auth/refresh`) → 성공
5. 다시 Application 탭에서 `refresh_token` 쿠키 나타남

**결론:** 쿠키는 삭제된 게 아니었다. `path="/api/v1/auth"`로 설정된 쿠키는 현재 페이지 경로가 `/api/v1/auth`와 일치하지 않으면 Application 탭에서 숨겨질 뿐이다. `/api/v1/auth/refresh` 요청을 보내는 순간 해당 path와 일치하여 다시 탭에 나타난다. 실제 기능은 정상 동작하고 있었다.

## 교훈

- `SameSite=None`은 반드시 `Secure=True`와 함께 써야 한다. 브라우저가 강제하는 규칙이다.
- 쿠키 설정 트러블슈팅 시 `secure`와 `samesite`는 함께 고려해야 한다.
