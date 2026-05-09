# `UserUpdateRequest.role` 으로 일반 user의 자가 admin 승격 가능

- 발견일: 2026-05-09
- 관련 작업: [docs/history/2026-05-09-8a40a9-01-user접근권한JWT검증-토론.md](../history/2026-05-09-8a40a9-01-user접근권한JWT검증-토론.md) (D-1, D-2 결정에서 후속 작업으로 분리됨)

## 증상

`PUT /api/v1/users/{user_id}` 라우터가 받는 요청 스키마 [UserUpdateRequest](../../backend/app/schemas/user.py)에 `role: Optional[str] = None` 필드가 그대로 살아 있다. 일반 user가 **본인의** user_id를 대상으로 다음과 같이 호출하면 자기 role을 'admin'으로 바꿀 수 있다.

```bash
curl -X PUT http://localhost:8000/api/v1/users/10 \
  -H "Authorization: Bearer <user 10의 access token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

권한 검증(`require_self_or_admin`)은 "본인 자원이거나 admin"을 통과시키는 가드라, **본인이 자기 자원을 수정하는 요청**은 정상으로 본다. 그 안에 role 필드가 들어 있어도 라우터는 그대로 DB에 반영한다.

결과: **회원가입 한 번 + PUT 요청 한 번으로 admin 권한 획득 가능.**

## 재현 절차

1. 일반 user 계정으로 로그인 (또는 회원가입 후 로그인)
2. 본인 user_id로 `PUT /api/v1/users/{본인id}` 호출, body에 `{"role": "admin"}` 포함
3. → 200 응답, DB의 role이 'admin'으로 변경
4. 새 토큰 발급 시(재로그인 또는 refresh) payload에 admin role이 박혀 어드민 가드/권한 통과

## 원인

권한 검증 토론(주제 ID `8a40a9`)에서 **이번 작업 범위는 권한 가드 도입까지로 한정**하고, `UserUpdateRequest`의 필드 정리는 후속 작업으로 분리하기로 결정했다. 그 결과 `POST /users`의 role 강제 대입(D-2)은 처리되었으나, `PUT /users/{id}`로 들어오는 요청 본문의 role 필드는 그대로 통과한다.

권한 가드와 입력 스키마는 별개의 방어 계층이라, 둘 중 하나만 채워두면 우회 경로가 남는다. 이번 사례가 그 전형.

## 영향 범위

- 모든 일반 user — 회원가입만 하면 누구나 자가 승격 가능
- 백엔드: [backend/app/schemas/user.py:23-29](../../backend/app/schemas/user.py#L23-L29) `UserUpdateRequest`
- 백엔드: [backend/app/api/v1/users.py:87-123](../../backend/app/api/v1/users.py#L87-L123) `update_user` 라우터

권한 시스템(`require_admin`, `require_self_or_admin`) 도입의 효과를 사실상 무력화함 — 우회 경로가 한 줄짜리 PUT 요청.

## 해결 방향

크게 두 가지 접근, 하나만 골라도 닫힌다.

### (A) 스키마에서 role 제거 (간단·강력)

`UserUpdateRequest`에서 `role` 필드 자체를 삭제한다. 그 결과 일반 user든 admin이든 이 엔드포인트로는 role을 바꿀 수 없게 된다.

장점: 변경이 명확하고 한 곳에서 끝.
단점: admin이 다른 사용자의 role을 변경하는 정상적 운영 경로도 함께 막힌다 → 별도 엔드포인트(예: `PATCH /users/{id}/role` admin 전용) 필요.

### (B) 라우터에서 role 필드 차단 (조건부 허용)

스키마는 그대로 두되, 라우터 본문에서 호출자가 admin이 아니면 `update_data`에서 `role` 키를 강제로 제거한다.

```python
if _auth.get("role") != "admin":
    update_data.pop("role", None)
```

장점: admin의 정상적 role 변경 경로 유지.
단점: 스키마-라우터 양쪽에 권한 분기가 분산됨. 라우터 본문이 권한 로직을 일부 가지게 되어 D-3 결정의 정신("권한은 의존성으로 분리")과 어긋남. 표준 패턴(응답·요청 스키마를 권한별로 나누는 방식)으로 가는 것이 깔끔.

### (C) (A) + 별도 admin 전용 엔드포인트 신설

가장 표준에 가까움. `UserUpdateRequest`에서 role 제거 + admin이 다른 사용자 role을 바꾸는 `PATCH /users/{id}/role` 같은 엔드포인트를 `require_admin`으로 보호해 신설.

권장도 — **(C) > (A) > (B)**.

## 임시 회피책

코드 측 회피책은 도입하지 않는다. 근본 해결을 후속 세션에서 다룰 예정.

운영 측면에서 알아둘 것:
- 외부 노출 환경이라면 이 결함을 닫기 전까지 회원가입을 일시 차단하거나, 모니터링 강화 필요.
- 로컬·테스트 환경이라면 즉각적인 운영 위험은 낮으나 빠른 시일 내 처리 권장.
