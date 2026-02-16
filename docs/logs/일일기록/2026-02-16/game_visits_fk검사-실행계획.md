# GameVisit FK 검사 실행계획

## 요구사항 요약

**요구사항**: `POST /api/v1/game_visits` 요청 시 `user_id`가 전달되면, 해당 ID가 `users` 테이블에 실제로 존재하는지 확인한다.

**목적**: 존재하지 않는 `user_id`로 INSERT를 시도할 경우 DB 레벨 FK 오류(IntegrityError)가 발생한다. 이를 사전에 검증하여 500 에러 대신 의미 있는 400 에러를 반환하고, 데이터 정합성을 보장한다.

## 현재상태 분석

- `GameVisit.user_id`는 `ForeignKey('users.id')`로 선언되어 있고 `nullable=True`
- `POST /api/v1/game_visits`의 `create_game_visit`에서 `user_id`를 받아 바로 INSERT/UPDATE
- `user_id`가 `users` 테이블에 존재하는지 확인하는 로직이 없음
- `PUT /api/v1/game_visits`의 `update_game_visit`도 동일하게 검증 없이 `user_id`를 업데이트

## 구현 방법

- POST/PUT 엔드포인트에서 `user_id`가 `None`이 아닐 경우 `users` 테이블에 해당 ID가 존재하는지 DB 조회로 확인
- 존재하지 않으면 `HTTP 404`를 반환하고 INSERT/UPDATE를 차단
- SQLAlchemy의 `db.query(User).filter(User.id == user_id).first()`로 단건 조회

## 구현 단계

### 1. User 모델 import 추가

```python
# backend/app/api/v1/game_visits.py 상단
from models import GameVisit, User
```
- **무엇을 하는가**: User 존재 여부 조회를 위해 User 모델을 import
- 기존 `from models import GameVisit` 한 줄을 위와 같이 수정

### 2. POST 엔드포인트에 user_id 존재 검증 추가

```python
@router.post("", response_model=GameVisitCreateResponse, status_code=201)
def create_game_visit(
    visit_data: GameVisitCreateRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    # user_id가 전달된 경우 users 테이블에서 존재 여부 확인
    if visit_data.user_id is not None:
        user = db.query(User).filter(User.id == visit_data.user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with id {visit_data.user_id} not found"
            )
    # 이하 기존 로직 유지...
```
- **무엇을 하는가**: user_id가 있을 때만 users 테이블을 조회해 존재를 확인
- 존재하지 않으면 404 반환, 이후 INSERT 로직은 실행되지 않음
- `user_id=None`(비로그인)이면 검증을 건너뜀

### 3. PUT 엔드포인트에 user_id 존재 검증 추가

```python
@router.put("", response_model=GameVisitUpdateResponse)
def update_game_visit(
    visit_data: GameVisitUpdateRequest,
    db: Session = Depends(get_db)
):
    # user_id가 전달된 경우 users 테이블에서 존재 여부 확인
    if visit_data.user_id is not None:
        user = db.query(User).filter(User.id == visit_data.user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with id {visit_data.user_id} not found"
            )
    # 이하 기존 로직 유지...
```
- **무엇을 하는가**: PUT에서도 동일하게 user_id 유효성을 검증
- IP 조회(404) 전에 먼저 배치하거나, IP 조회 후에 배치해도 무관하나 IP 조회 후에 두는 것이 더 자연스러움

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/game_visits.py` | 수정 | User import 추가, POST/PUT에 user_id 존재 검증 로직 추가 |

## 완료 체크리스트

- [ ] 존재하지 않는 `user_id`로 POST 요청 시 HTTP 404 반환 확인
- [ ] 존재하지 않는 `user_id`로 PUT 요청 시 HTTP 404 반환 확인
- [ ] `user_id=null`(비로그인)로 POST 요청 시 정상적으로 201 반환 확인
- [ ] 유효한 `user_id`로 POST/PUT 요청 시 기존과 동일하게 동작 확인
- [ ] DB에 잘못된 FK 레코드가 INSERT되지 않는지 확인
