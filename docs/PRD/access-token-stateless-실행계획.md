# Access Token Stateless 검증 전환 실행계획

## 요구사항 요약

**요구사항**: `get_current_user`의 DB 조회를 제거하고, JWT 서명 검증만으로 사용자 정보를 반환하도록 변경. Access Token payload에 `nickname`을 추가.

**목적**: JWT 본래 설계(서버 무상태)를 따른다. 포트폴리오에서 JWT를 올바르게 사용하는 예시를 보여준다.

## 현재상태 분석

- `deps.py` `get_current_user`: 서명 검증 후 DB에서 User 객체를 추가 조회하여 반환
- `auth.py` `_create_login_response`: payload에 `sub`, `email`, `role`만 담아 발급 — `nickname` 없음
- 라우터에서 `current_user` 속성 사용처: `notices.py`의 `current_user.id` 1곳뿐. 나머지는 인증 확인용.

## 구현 방법

1. 토큰 발급 시 payload에 `nickname` 추가
2. `get_current_user`에서 DB 조회 제거 — 서명 검증 후 payload dict를 그대로 반환
3. `notices.py`에서 `current_user.id` → `int(current_user["sub"])`로 수정

## 구현 단계

### 1. payload에 nickname 추가 (`auth.py`)

```python
# _create_login_response 함수 내
access_token = create_access_token({
    "sub": str(user.id),
    "email": user.email,
    "role": user.role,
    "nickname": user.nickname,   # 추가
})
```

- `nickname`을 payload에 포함하면 이후 라우터에서 DB 조회 없이 닉네임을 꺼낼 수 있다.
- refresh 엔드포인트(`refresh_access_token`)에도 동일하게 적용한다.

### 2. `get_current_user` DB 조회 제거 (`deps.py`)

```python
def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload  # {"sub": "1", "email": "...", "role": "...", "nickname": "...", "exp": ...}
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
```

- DB 의존성(`get_db`) 제거 — 함수 시그니처에서도 삭제한다.
- 반환 타입이 `User` → `dict`로 바뀐다.
- 기존 DB 조회 코드는 주석으로 남겨둔다.

### 3. `notices.py` 속성 접근 수정

```python
# 변경 전
current_user: User = Depends(get_current_user)
notice = Notice(..., author_id=current_user.id)

# 변경 후
current_user: dict = Depends(get_current_user)
notice = Notice(..., author_id=int(current_user["sub"]))
```

- `current_user`가 dict가 되었으므로 `.id` 대신 `["sub"]`으로 꺼낸다.
- `int()` 변환 필요 — payload의 `sub`은 문자열이다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/auth.py` | 수정 | `_create_login_response`, `refresh_access_token` payload에 `nickname` 추가 |
| `backend/app/api/deps.py` | 수정 | `get_current_user` DB 조회 제거, `dict` 반환으로 변경 |
| `backend/app/api/v1/notices.py` | 수정 | `current_user.id` → `int(current_user["sub"])` |

## 완료 체크리스트

- [ ] 로그인 후 발급된 Access Token을 jwt.io에서 디코딩했을 때 `nickname` 필드가 있다
- [ ] 로그인 상태에서 공지 작성(`POST /api/v1/notices`)이 정상 동작한다
- [ ] 로그인 상태에서 공지 삭제(`DELETE /api/v1/notices/{id}`)가 정상 동작한다
- [ ] 토큰 없이 보호 엔드포인트 호출 시 401이 반환된다
- [ ] 만료/위조된 토큰으로 호출 시 401이 반환된다
- [ ] Docker 로그에 DB 쿼리(`SELECT * FROM users`)가 인증 과정에서 발생하지 않는다
