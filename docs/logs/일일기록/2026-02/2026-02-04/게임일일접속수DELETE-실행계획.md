# 게임 일일 접속수 DELETE 엔드포인트 실행계획

## 요구사항 요약

**요구사항**: FastAPI에 게임 일일 접속자 수 삭제 엔드포인트 생성 (날짜 범위 기반 삭제)

**목적**: 관리자가 테스트 데이터나 잘못된 통계 데이터를 날짜 범위로 일괄 삭제할 수 있도록 함

## 현재상태 분석

- GameVisit 모델이 이미 존재 ([models.py:58-66](backend/models.py#L58-L66))
- GameVisit 테이블: id, user_id, ip_address, is_visits, created_at, updated_at 컬럼
- 게임 접속 기록 생성(POST), 수정(PUT), 조회(GET) 엔드포인트만 구현됨
- DELETE 엔드포인트는 아직 구현되지 않음
- 날짜 범위로 데이터를 삭제하는 기능 필요

## 구현 방법

SQLAlchemy의 `filter`와 `delete` 메서드를 사용하여 날짜 범위에 해당하는 GameVisit 레코드를 일괄 삭제합니다.
- Pydantic 스키마로 요청 검증 (start_date, end_date를 필수 입력)
- SQLAlchemy의 `func.date()`를 사용하여 created_at 컬럼의 날짜만 비교
- 삭제 완료 메시지와 날짜 범위를 응답으로 반환

## 구현 단계

### 1. Pydantic 스키마 추가 (main.py)

```python
class GameVisitDeleteRequest(BaseModel):
    """게임 접속 기록 삭제 요청 (날짜 범위)"""
    start_date: date
    end_date: date


class GameVisitDeleteResponse(BaseModel):
    """게임 접속 기록 삭제 응답"""
    message: str
    start_date: str
    end_date: str
```

- 시작날짜(start_date)와 끝날짜(end_date)를 필수 입력으로 받음
- Pydantic의 date 타입으로 자동 검증 (null 거부)
- 삭제 완료 메시지와 날짜 범위를 응답으로 반환

### 2. DELETE 엔드포인트 구현 (main.py)

```python
@app.delete("/api/v1/game_visits/", response_model=GameVisitDeleteResponse)
def delete_game_visits(
    delete_data: GameVisitDeleteRequest,
    db: Session = Depends(get_db)
):
    """게임 접속 기록 삭제 (날짜 범위 기반)"""
    from sqlalchemy import func

    # 날짜 유효성 검증
    if delete_data.start_date > delete_data.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be less than or equal to end_date"
        )

    # 날짜 범위에 해당하는 레코드 삭제
    deleted_count = db.query(GameVisit).filter(
        func.date(GameVisit.created_at) >= delete_data.start_date,
        func.date(GameVisit.created_at) <= delete_data.end_date
    ).delete(synchronize_session=False)

    db.commit()

    return GameVisitDeleteResponse(
        message="Game visit records deleted successfully",
        start_date=str(delete_data.start_date),
        end_date=str(delete_data.end_date)
    )
```

- start_date가 end_date보다 큰 경우 400 에러 반환
- `func.date()`로 created_at의 날짜 부분만 비교
- `delete(synchronize_session=False)`로 일괄 삭제 수행
- 삭제 완료 메시지와 날짜 범위를 반환

### 3. 엔드포인트 위치 배치 (main.py)

```python
# ==================== Game Visit API ====================

@app.post("/api/v1/game_visits", ...)  # 748번째 줄 (기존)
def create_game_visit(...): ...

@app.put("/api/v1/game_visits", ...)  # 803번째 줄 (기존)
def update_game_visit(...): ...

@app.get("/api/v1/game_visits/", ...)  # 836번째 줄 (기존)
def get_daily_visit_stats(...): ...

@app.delete("/api/v1/game_visits/", ...)  # 새로 추가 (885번째 줄 이후)
def delete_game_visits(...): ...
```

- Game Visit API 섹션의 마지막에 DELETE 엔드포인트 추가
- GET 엔드포인트(836번째 줄) 바로 다음에 배치
- CRUD 순서 유지 (POST → PUT → GET → DELETE)

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/main.py | 수정 | GameVisitDeleteRequest, GameVisitDeleteResponse 스키마 추가 |
| backend/main.py | 수정 | DELETE /api/v1/game_visits/ 엔드포인트 추가 (885번째 줄 이후) |

## 완료 체크리스트

- [ ] Pydantic 스키마(GameVisitDeleteRequest, GameVisitDeleteResponse)가 추가되었는지 확인
- [ ] DELETE /api/v1/game_visits/ 엔드포인트가 생성되었는지 확인
- [ ] start_date > end_date 검증이 동작하는지 확인
- [ ] 날짜 범위로 레코드가 정상적으로 삭제되는지 테스트
- [ ] 삭제 완료 메시지와 날짜 범위가 응답에 포함되는지 확인
- [ ] FastAPI 서버가 에러 없이 실행되는지 확인
