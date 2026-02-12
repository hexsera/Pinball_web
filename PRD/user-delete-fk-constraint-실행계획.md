# User DELETE FK 제약 해결 실행계획

## 요구사항 요약

**요구사항**: `DELETE /api/v1/users/{user_id}` 실행 시 FK 제약 오류 없이 사용자를 삭제한다.

**목적**: users 테이블의 PK(id)를 FK로 참조하는 테이블들이 존재하여 사용자 삭제가 실패한다. 연관 데이터를 함께 삭제하여 삭제가 정상 완료되도록 한다.

## 현재상태 분석

- `users.id`를 FK로 참조하는 테이블: `friendships.requester_id`, `friendships.receiver_id`, `monthly_scores.user_id`, `high_scores.user_id`
- `scores.user_id`, `game_visits.user_id`는 FK 미설정이므로 문제 없음
- `DELETE /api/v1/users/{user_id}` 실행 시 DB가 FK 제약 위반 오류를 발생시켜 삭제 불가
- `users.py`의 `delete_user()`는 연관 데이터 삭제 없이 바로 `db.delete(user)` 호출 중

## 구현 방법

사용자 삭제 전 FK를 참조하는 자식 테이블의 데이터를 먼저 삭제(Cascade Delete)한다.
SQLAlchemy ORM 레벨에서 명시적으로 자식 데이터를 삭제 후 부모(User)를 삭제한다.
DB 마이그레이션 없이 애플리케이션 코드만 수정하므로 기존 스키마에 영향을 주지 않는다.

## 구현 단계

### 1. delete_user() 함수에 자식 데이터 삭제 로직 추가
```python
@router.delete("/{user_id}", response_model=DeleteResponse)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail=f"User with id {user_id} not found")

    # FK 참조 테이블 데이터 먼저 삭제
    db.query(Friendship).filter(
        (Friendship.requester_id == user_id) | (Friendship.receiver_id == user_id)
    ).delete(synchronize_session=False)

    db.query(MonthlyScore).filter(MonthlyScore.user_id == user_id)\
      .delete(synchronize_session=False)

    db.query(HighScore).filter(HighScore.user_id == user_id)\
      .delete(synchronize_session=False)

    db.delete(user)
    db.commit()

    return DeleteResponse(message="User deleted successfully", deleted_user_id=user_id)
```
- **무엇을 하는가**: User 삭제 전 FK 제약이 걸린 자식 테이블 데이터를 먼저 삭제하여 FK 오류를 방지
- `Friendship`은 requester_id, receiver_id 두 컬럼 모두 FK이므로 OR 조건으로 양쪽 삭제
- `synchronize_session=False`: ORM 세션 캐시와 DB를 동기화하지 않고 bulk delete 수행 (성능 최적화)
- 삭제 순서: 자식(Friendship, MonthlyScore, HighScore) → 부모(User)

### 2. import 추가
```python
from models import User, MonthlyScore, Friendship, HighScore
```
- **무엇을 하는가**: delete_user()에서 사용할 Friendship, HighScore 모델을 import
- 기존 `from models import User, MonthlyScore`에서 두 모델 추가

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/users.py` | 수정 | import에 Friendship, HighScore 추가; delete_user()에 자식 데이터 삭제 로직 추가 |

## 완료 체크리스트

- [ ] `DELETE /api/v1/users/{user_id}` 호출 시 200 응답과 함께 삭제 완료
- [ ] 삭제된 user_id로 `GET /api/v1/users/{user_id}` 호출 시 404 반환
- [ ] DB에서 해당 user_id의 friendships 레코드가 모두 삭제됨
- [ ] DB에서 해당 user_id의 monthly_scores 레코드가 모두 삭제됨
- [ ] DB에서 해당 user_id의 high_scores 레코드가 모두 삭제됨
- [ ] FK가 없는 scores, game_visits 데이터는 그대로 남아있음
