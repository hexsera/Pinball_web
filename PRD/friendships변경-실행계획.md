# Friendships 테이블 외래키 관계 설정 실행계획

## 요구사항 요약

**요구사항**: friendships 테이블의 requester_id와 receiver_id가 users 테이블의 id를 참조하도록 외래키 제약 조건 추가

**목적**: 데이터 무결성 보장 및 존재하지 않는 사용자 ID로 친구 관계가 생성되는 것을 방지

## 현재상태 분석

현재 friendships 테이블은 다음과 같은 구조를 가지고 있음:
- requester_id와 receiver_id는 Integer 타입
- 인덱스는 존재하지만 외래키 제약 조건은 없음
- users 테이블의 id와 논리적으로 연결되어야 하지만 데이터베이스 수준에서 강제되지 않음
- 이로 인해 존재하지 않는 user_id로 친구 관계가 생성될 수 있는 위험 존재

## 구현 방법

SQLAlchemy의 ForeignKey 제약 조건을 사용하여 외래키 관계를 설정:
- models.py에서 Friendship 모델에 ForeignKey 추가
- Alembic을 사용하여 마이그레이션 파일 자동 생성
- 생성된 마이그레이션 파일을 데이터베이스에 적용
- PostgreSQL 수준에서 외래키 제약 조건이 추가됨

## 구현 단계

### 1. Friendship 모델에 ForeignKey 추가

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    status = Column(String(20), nullable=False, default='pending')
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint('requester_id', 'receiver_id', name='uq_friendship_pair'),
        CheckConstraint('requester_id != receiver_id', name='ck_no_self_friend'),
    )
```
- **무엇을 하는가**: requester_id와 receiver_id가 users.id를 참조하도록 외래키 제약 조건 추가
- `ForeignKey('users.id')`는 해당 컬럼이 users 테이블의 id 컬럼을 참조함을 명시
- 데이터 삽입 시 참조된 user_id가 users 테이블에 존재하는지 자동으로 검증
- 삭제 시 옵션을 지정하지 않으면 기본적으로 RESTRICT (참조된 레코드 삭제 방지)

### 2. Alembic 마이그레이션 파일 생성

```bash
docker exec backend-server alembic revision --autogenerate -m "Add foreign key constraints to friendships table"
```
- **무엇을 하는가**: models.py의 변경사항을 감지하여 마이그레이션 파일 자동 생성
- `--autogenerate` 옵션으로 현재 모델과 DB 스키마를 비교
- ForeignKey 추가 사항이 마이그레이션 파일에 자동으로 반영됨
- 파일명: `backend/alembic/versions/[revision_id]_add_foreign_key_constraints_to_friendships_table.py`

### 3. 생성된 마이그레이션 파일 확인

```bash
cat backend/alembic/versions/[최신파일명].py
```
- **무엇을 하는가**: 자동 생성된 마이그레이션 SQL이 올바른지 확인
- `op.create_foreign_key()` 호출이 포함되어 있는지 확인
- upgrade 함수에 2개의 외래키 생성 작업이 있어야 함 (requester_id, receiver_id)
- downgrade 함수에 외래키 삭제 작업이 있어야 함

### 4. 마이그레이션 적용

```bash
docker exec backend-server alembic upgrade head
```
- **무엇을 하는가**: 생성된 마이그레이션을 데이터베이스에 적용
- PostgreSQL에 ALTER TABLE 명령으로 외래키 제약 조건 추가
- 기존 데이터가 외래키 제약을 위반하면 에러 발생 (데이터 정합성 확인 필요)
- 성공 시 alembic_version 테이블에 새로운 버전 기록

### 5. 데이터베이스 제약 조건 확인

```bash
docker exec postgres-server psql -U hexsera -d hexdb -c "\d friendships"
```
- **무엇을 하는가**: 외래키 제약 조건이 올바르게 추가되었는지 확인
- Foreign-key constraints 섹션에 2개의 제약 조건이 표시되어야 함
- `friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES users(id)`
- `friendships_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id)`

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/models.py | 수정 | Friendship 모델의 requester_id, receiver_id에 ForeignKey 추가 |
| backend/alembic/versions/[새파일].py | 생성 | Alembic이 자동 생성하는 마이그레이션 파일 |

## 완료 체크리스트

- [ ] models.py에 ForeignKey 제약 조건이 추가되었는지 확인
- [ ] Alembic 마이그레이션 파일이 생성되었는지 확인
- [ ] 마이그레이션이 에러 없이 적용되었는지 확인
- [ ] `\d friendships` 명령으로 Foreign-key constraints가 표시되는지 확인
- [ ] 존재하지 않는 user_id로 친구 관계 생성 시도 시 에러가 발생하는지 테스트
- [ ] 기존 친구 관계 데이터가 정상적으로 조회되는지 확인
