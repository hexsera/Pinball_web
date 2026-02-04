# API 마스터키 제거 실행계획

## 요구사항 요약

**요구사항**: `/api/v1/users` 엔드포인트의 CRUD 작업에서 API Key 인증 요구사항을 제거

**목적**: 프론트엔드에서 API Key 없이도 사용자 정보 조회, 수정, 삭제가 가능하도록 하여 클라이언트 측 인증 로직을 단순화

## 현재상태 분석

`/api/v1/users` 엔드포인트의 5개 함수 모두 `api_key: str = Depends(verify_api_key)` 파라미터를 사용하여 API Key 인증을 요구합니다:
- POST /api/v1/users (276-303번 줄)
- GET /api/v1/users (306-313번 줄)
- GET /api/v1/users/{user_id} (316-329번 줄)
- PUT /api/v1/users/{user_id} (332-364번 줄)
- DELETE /api/v1/users/{user_id} (367-387번 줄)

참고로 `/api/v1/login`(390-415번 줄)과 `/api/v1/register`(418-444번 줄)는 이미 API Key 인증이 없습니다.

## 구현 방법

각 엔드포인트 함수 시그니처에서 `api_key: str = Depends(verify_api_key)` 파라미터를 제거합니다. `auth.py`의 `verify_api_key` 함수와 `API_KEY` 상수는 다른 엔드포인트에서 사용될 수 있으므로 삭제하지 않습니다.

## 구현 단계

### 1. POST /api/v1/users 함수 수정
```python
@app.post("/api/v1/users", response_model=UserResponse)
def create_user(
    user: UserCreateRequest,
    db: Session = Depends(get_db)
):
    """범용 사용자 생성 엔드포인트 (role 지정 가능)"""
    # 이메일 중복 검증
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # DB에 사용자 저장
    db_user = User(
        email=user.email,
        nickname=user.nickname,
        password=user.password,
        birth_date=user.birth_date,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
```
- `api_key: str = Depends(verify_api_key)` 파라미터 제거
- 함수 docstring에서 "API Key 필요" 문구 제거

### 2. GET /api/v1/users 함수 수정
```python
@app.get("/api/v1/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db)
):
    """전체 사용자 조회"""
    users = db.query(User).all()
    return users
```
- `api_key: str = Depends(verify_api_key)` 파라미터 제거
- 함수 docstring에서 "API Key 필요" 문구 제거

### 3. GET /api/v1/users/{user_id} 함수 수정
```python
@app.get("/api/v1/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """특정 사용자 조회"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return user
```
- `api_key: str = Depends(verify_api_key)` 파라미터 제거
- 함수 docstring에서 "API Key 필요" 문구 제거

### 4. PUT /api/v1/users/{user_id} 함수 수정
```python
@app.put("/api/v1/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdateRequest,
    db: Session = Depends(get_db)
):
    """사용자 정보 수정"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    # 이메일 변경 시 중복 검증
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # 수정할 필드만 업데이트
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
```
- `api_key: str = Depends(verify_api_key)` 파라미터 제거
- 함수 docstring에서 "API Key 필요" 문구 제거

### 5. DELETE /api/v1/users/{user_id} 함수 수정
```python
@app.delete("/api/v1/users/{user_id}", response_model=DeleteResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """사용자 삭제"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    db.delete(user)
    db.commit()

    return DeleteResponse(
        message="User deleted successfully",
        deleted_user_id=user_id
    )
```
- `api_key: str = Depends(verify_api_key)` 파라미터 제거
- 함수 docstring에서 "API Key 필요" 문구 제거

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/main.py | 수정 | `/api/v1/users` 엔드포인트 5개 함수에서 `api_key` 파라미터 제거 및 docstring 수정 |

## 완료 체크리스트

- [o] POST /api/v1/users 엔드포인트가 API Key 없이 동작하는지 확인
- [o] GET /api/v1/users 엔드포인트가 API Key 없이 동작하는지 확인
- [o] GET /api/v1/users/{user_id} 엔드포인트가 API Key 없이 동작하는지 확인
- [o] PUT /api/v1/users/{user_id} 엔드포인트가 API Key 없이 동작하는지 확인
- [o] DELETE /api/v1/users/{user_id} 엔드포인트가 API Key 없이 동작하는지 확인
- [o] API Key를 전송하지 않아도 401/403 에러가 발생하지 않는지 확인
- [o] FastAPI가 에러 없이 실행되는지 확인
