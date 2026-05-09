# user 접근 권한 JWT 검증 실행계획

## 요구사항 요약

**요구사항**: users 라우터 5개 엔드포인트에 JWT 기반 접근 권한 검증을 추가한다.

**목적**: 현재 `PUT`, `DELETE`는 인증만 하고 "본인인가?"를 묻지 않아 타인 정보를 수정·삭제할 수 있는 수평 권한 상승 취약점이 존재한다. `GET` 엔드포인트는 비로그인 접근이 가능하다. 회원가입 시 `role` 임의 지정도 가능하다. 이 세 가지를 한 번에 해소한다.

## 현재상태 분석

- `deps.py`: `get_current_user`만 존재. JWT 서명 검증 후 payload(dict) 반환. `require_admin`, `require_self_or_admin` 없음.
- `schemas/user.py`: `UserCreateRequest`에 `role: str` 필드 존재 → 외부에서 admin 가입 가능.
- `users.py`: `GET /users`, `GET /users/{id}` — 인증 없음. `PUT`, `DELETE` — `get_current_user`만 달려 있고 본인/admin 체크 없음. `POST /users` — 요청의 `role`을 그대로 DB에 저장.

## 구현 방법

FastAPI의 `Depends()` 의존성 체인을 활용한다. 권한 로직을 `deps.py`의 별도 함수로 분리하고, 라우터는 `Depends(함수명)` 한 줄만 추가한다. 라우터 본문 자체는 변경하지 않는다(비즈니스 로직 유지).

## 구현 단계

### 1. `deps.py` — 권한 의존성 함수 2개 추가

```python
def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return current_user


def require_self_or_admin(
    user_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    is_self = int(current_user.get("sub", 0)) == user_id
    is_admin = current_user.get("role") == "admin"
    if not (is_self or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return current_user
```

- **무엇을 하는가**: 인증(401)과 권한(403)을 분리하는 함수 2개를 추가한다.
- `require_admin`: `role`이 `"admin"`이 아니면 403 반환.
- `require_self_or_admin`: payload의 `sub`(문자열)을 `int`로 변환해 경로 `user_id`와 비교. 본인이거나 admin이면 통과, 아니면 403.
- `Depends`, `HTTPException`, `status`는 파일 상단에 이미 import되어 있어 추가 import 불필요.

### 2. `schemas/user.py` — `UserCreateRequest`에서 `role` 필드 제거

```python
class UserCreateRequest(BaseModel):
    """회원가입 요청"""
    email: str
    nickname: str
    password: str
    birth_date: date
    # role 필드 제거
```

- **무엇을 하는가**: Pydantic이 요청 body의 `role` 필드를 아예 받지 않도록 스키마에서 제거한다.
- 클라이언트가 `"role": "admin"`을 보내도 Pydantic이 무시(또는 오류)해 DB에 전달되지 않는다.
- `UserUpdateRequest`의 `role: Optional[str]`은 이번 작업에서 건드리지 않는다(후속 작업).

### 3. `users.py` — import 변경

```python
from app.api.deps import get_db, get_current_user, require_self_or_admin
```

- **무엇을 하는가**: 신설한 `require_self_or_admin`을 라우터에서 사용할 수 있도록 import에 추가한다.
- `require_admin`은 이번 users.py에서 사용하지 않으므로 import하지 않는다(lint 경고 회피).

### 4. `users.py` — `POST /users` role 고정 대입

```python
@router.post("", response_model=UserResponse)
def create_user(user: UserCreateRequest, db: Session = Depends(get_db)):
    """회원가입"""
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    db_user = User(
        email=user.email,
        nickname=user.nickname,
        password=hash_password(user.password),
        birth_date=user.birth_date,
        role="user",   # 서버가 강제 대입
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
```

- **무엇을 하는가**: `user.role` 대신 리터럴 `"user"`를 직접 대입해 회원가입으로 admin 생성이 불가능하게 만든다.
- 스키마에서 `role`을 제거했으므로 `user.role` 참조 자체가 사라진다.

### 5. `users.py` — `GET /users`, `GET /users/{user_id}` 로그인 가드 추가

```python
@router.get("", response_model=List[UserResponse])
def get_all_users(
    nickname: Optional[str] = Query(None, description="검색할 닉네임"),
    db: Session = Depends(get_db),
    _auth: dict = Depends(get_current_user),   # 추가
):
    ...

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _auth: dict = Depends(get_current_user),   # 추가
):
    ...
```

- **무엇을 하는가**: 비로그인 접근 시 401을 반환하도록 각 함수 파라미터에 `Depends(get_current_user)`를 추가한다.
- 변수명을 `_auth`로 지정해 라우터 본문에서 사용하지 않음을 표시한다(lint 경고 회피).
- 본문 로직은 변경하지 않는다.

### 6. `users.py` — `PUT /users/{user_id}`, `DELETE /users/{user_id}` 의존성 교체

```python
@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdateRequest,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_self_or_admin),  # get_current_user → require_self_or_admin
):
    ...

@router.delete("/{user_id}", response_model=DeleteResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _auth: dict = Depends(require_self_or_admin),  # get_current_user → require_self_or_admin
):
    ...
```

- **무엇을 하는가**: 기존 `get_current_user`를 `require_self_or_admin`으로 교체해 "본인 또는 admin" 체크를 추가한다.
- `require_self_or_admin`이 내부적으로 `get_current_user`를 `Depends`로 호출하므로 401/403 모두 자동 처리된다.
- 변수명을 `current_user: User`에서 `_auth: dict`으로 정정한다(실제 반환값은 dict이므로 타입 오류 수정 포함).
- 본문 로직은 변경하지 않는다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/deps.py` | 수정 | `require_admin`, `require_self_or_admin` 함수 2개 추가 |
| `backend/app/schemas/user.py` | 수정 | `UserCreateRequest`에서 `role: str` 필드 제거, docstring 수정 |
| `backend/app/api/v1/users.py` | 수정 | import 추가, 라우터 5개 의존성 변경, role 고정 대입, 변수명 정정 |

## 완료 체크리스트

- [x] `POST /api/v1/users` 호출 시 `"role": "admin"`을 포함해도 DB의 role이 `'user'`로 저장된다.
- [x] 토큰 없이 `GET /api/v1/users` 호출 시 401 응답이 온다.
- [x] 토큰 없이 `GET /api/v1/users/1` 호출 시 401 응답이 온다.
- [x] 일반 user 토큰으로 `PUT /api/v1/users/{타인 id}` 호출 시 403 응답이 온다.
- [x] 일반 user 토큰으로 `PUT /api/v1/users/{본인 id}` 호출 시 200 응답이 온다.
- [x] 일반 user 토큰으로 `DELETE /api/v1/users/{타인 id}` 호출 시 403 응답이 온다.
- [x] admin 토큰으로 `PUT /api/v1/users/{타인 id}` 호출 시 200 응답이 온다.
- [x] admin 토큰으로 `DELETE /api/v1/users/{타인 id}` 호출 시 200 응답이 온다.
- [ ] 일반 user 토큰으로 친구 검색(`GET /api/v1/users?nickname=...`) 이 정상 동작한다.
- [x] `docker compose exec fastapi pytest` 실행 시 기존 테스트가 깨지지 않는다.
- [x] `docker compose logs -f fastapi`에서 500 에러 없이 서버가 정상 기동한다.



