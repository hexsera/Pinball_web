# 게임 일일 접속수 POST 엔드포인트 실행계획

## 요구사항 요약

**요구사항**: FastAPI에 게임 일일 접속자 기록용 POST 엔드포인트 생성

**목적**: 클라이언트 IP와 user_id를 받아 오늘 날짜 기준으로 접속 기록을 생성하거나 업데이트하여 일일 접속자 통계를 수집한다.

## 현재상태 분석

- `backend/models.py`에 `GameVisit` 모델이 이미 정의되어 있음 (id, user_id, ip_address, is_visits, created_at, updated_at)
- `backend/main.py`에 PUT /api/v1/game_visits 엔드포인트가 존재 (IP 주소로 레코드 조회 후 업데이트)
- 현재는 오늘 날짜 필터링 없이 IP 주소만으로 조회
- POST 엔드포인트는 아직 구현되지 않음
- 클라이언트 IP 추출 기능이 필요함

## 구현 방법

FastAPI의 Request 객체를 사용하여 클라이언트 IP 주소를 추출한다. SQLAlchemy로 오늘 날짜(created_at)와 IP 주소를 기준으로 레코드를 조회한다. 레코드가 존재하면 user_id가 null인 경우에만 업데이트하고, 존재하지 않으면 새 레코드를 생성한다. 날짜 비교는 `func.date()`를 사용하여 시간을 제외한 날짜만 비교한다.

## 구현 단계

### 1. Pydantic 스키마 생성

```python
class GameVisitCreateRequest(BaseModel):
    """게임 접속 기록 생성 요청"""
    user_id: Optional[int] = None  # 비회원은 None

class GameVisitCreateResponse(BaseModel):
    """게임 접속 기록 생성 응답"""
    message: str
    user_id: Optional[int]
    ip_address: str
    created_at: datetime
    is_new_record: bool  # 새로 생성되었는지 여부
```

- **무엇을 하는가**: POST 요청/응답 데이터 구조를 정의
- GameVisitCreateRequest는 user_id만 받음 (IP는 서버에서 추출)
- GameVisitCreateResponse는 생성/업데이트 결과를 반환
- is_new_record로 새 레코드인지 기존 레코드 업데이트인지 구분

### 2. 클라이언트 IP 추출 함수 생성

```python
from fastapi import Request

def get_client_ip(request: Request) -> str:
    """클라이언트 IP 주소 추출 (프록시 고려)"""
    # X-Forwarded-For 헤더 확인 (프록시/로드밸런서 뒤에 있는 경우)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # 첫 번째 IP가 실제 클라이언트 IP
        return forwarded_for.split(",")[0].strip()

    # X-Real-IP 헤더 확인 (Nginx 등에서 사용)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # 직접 연결된 클라이언트 IP
    return request.client.host
```

- **무엇을 하는가**: HTTP 요청에서 실제 클라이언트 IP 주소를 추출
- X-Forwarded-For 헤더를 우선 확인 (프록시 환경 대응)
- X-Real-IP 헤더를 차순위로 확인 (Nginx 등)
- 둘 다 없으면 request.client.host 사용 (직접 연결)
- 프록시 체인에서 첫 번째 IP만 추출 (실제 클라이언트)

### 3. POST 엔드포인트 구현

```python
from sqlalchemy import func, and_

@app.post("/api/v1/game_visits", response_model=GameVisitCreateResponse, status_code=201)
def create_game_visit(
    visit_data: GameVisitCreateRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """게임 접속 기록 생성 (오늘 날짜 + IP 기준 중복 방지)"""
    # 클라이언트 IP 추출
    client_ip = get_client_ip(request)

    # 오늘 날짜와 IP로 레코드 조회
    today = func.date(func.now())
    existing_visit = db.query(GameVisit).filter(
        and_(
            func.date(GameVisit.created_at) == today,
            GameVisit.ip_address == client_ip
        )
    ).first()

    if existing_visit:
        # 레코드가 존재하면 user_id가 null인 경우에만 업데이트
        if existing_visit.user_id is None and visit_data.user_id is not None:
            existing_visit.user_id = visit_data.user_id
            db.commit()
            db.refresh(existing_visit)

        return GameVisitCreateResponse(
            message="Game visit record updated",
            user_id=existing_visit.user_id,
            ip_address=existing_visit.ip_address,
            created_at=existing_visit.created_at,
            is_new_record=False
        )
    else:
        # 레코드가 없으면 새로 생성
        new_visit = GameVisit(
            user_id=visit_data.user_id,
            ip_address=client_ip,
            is_visits=True
        )
        db.add(new_visit)
        db.commit()
        db.refresh(new_visit)

        return GameVisitCreateResponse(
            message="Game visit record created",
            user_id=new_visit.user_id,
            ip_address=new_visit.ip_address,
            created_at=new_visit.created_at,
            is_new_record=True
        )
```

- **무엇을 하는가**: user_id와 클라이언트 IP를 받아 오늘 날짜 기준 접속 기록 생성/업데이트
- `get_client_ip()`로 실제 클라이언트 IP 추출
- `func.date()`로 시간을 제외한 날짜만 비교하여 오늘 접속 기록 조회
- `and_()`로 날짜와 IP 조건을 동시에 적용
- 기존 레코드가 있고 user_id가 null이면 POST의 user_id로 업데이트
- 기존 레코드가 없으면 새 레코드 생성 (is_visits=True)
- is_new_record로 생성/업데이트 구분하여 반환
- 201 Created 상태 코드 반환

### 4. main.py에 Request import 추가

```python
from fastapi import FastAPI, Depends, HTTPException, status, Request
```

- **무엇을 하는가**: Request 객체를 사용하기 위해 import 추가
- Request는 HTTP 요청 정보(헤더, IP 등)를 담고 있음

### 5. main.py에 sqlalchemy and_ import 추가

```python
from sqlalchemy import or_, and_
```

- **무엇을 하는가**: 여러 조건을 AND로 결합하기 위해 and_ import
- 날짜와 IP 조건을 동시에 적용하는 데 사용

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/main.py | 수정 | Request, and_ import 추가 |
| backend/main.py | 수정 | get_client_ip 함수 추가 |
| backend/main.py | 수정 | GameVisitCreateRequest, GameVisitCreateResponse 스키마 추가 |
| backend/main.py | 수정 | POST /api/v1/game_visits 엔드포인트 구현 |

## 완료 체크리스트

- [o] backend/main.py에 Request와 and_ import가 추가되었는지 확인
- [o] get_client_ip 함수가 정의되었는지 확인
- [o] POST /api/v1/game_visits 엔드포인트가 생성되었는지 확인
- [o] Swagger UI (http://localhost:8000/docs)에서 POST /api/v1/game_visits 엔드포인트가 표시되는지 확인
- [o] 동일 IP로 오늘 첫 요청 시 새 레코드가 생성되는지 확인 (is_new_record=true)
- [o] 동일 IP로 오늘 두 번째 요청 시 기존 레코드가 반환되는지 확인 (is_new_record=false)
- [o] 비회원(user_id=null) 접속 후 회원 로그인 시 user_id가 업데이트되는지 확인
- [o] 이미 user_id가 있는 레코드는 업데이트되지 않는지 확인
