# friendships 테이블 실행계획

## 요구사항 요약

**요구사항**: friendships 테이블을 생성하여 친구 관계를 관리한다.

**목적**: 사용자 간 친구 요청, 수락, 거절을 영구적으로 저장하고 관리하기 위함.

## 현재상태 분석

- `fastapi/models.py`에 User, Score 모델만 존재
- SQLAlchemy ORM을 사용하여 테이블 정의
- Base.metadata.create_all()로 테이블 자동 생성 방식 사용
- MySQL 데이터베이스 연결 환경 구축됨

## 구현 방법

SQLAlchemy ORM을 사용하여 Friendship 모델 클래스를 정의한다. status 컬럼은 ENUM 또는 String 타입으로 관리하며, requester_id와 addressee_id는 Integer 타입으로 저장한다. 중복 요청 방지를 위해 (requester_id, addressee_id) 복합 인덱스를 추가한다.

## 구현 단계

1. **Friendship 모델 클래스 작성**
   - `fastapi/models.py`에 Friendship 클래스 추가
   - 컬럼: id(PK), requester_id, addressee_id, status, created_at(선택)

2. **status 필드 정의**
   - 가능한 값: 'pending'(대기), 'accepted'(수락), 'rejected'(거절)
   - String(20) 타입 사용 (MySQL ENUM보다 유연함)

3. **인덱스 설정**
   - requester_id, addressee_id에 개별 인덱스 추가
   - 조회 성능 향상을 위한 복합 인덱스 고려

4. **테이블 생성**
   - FastAPI 재시작 시 Base.metadata.create_all()이 자동으로 테이블 생성
   - 또는 Alembic 마이그레이션 사용 가능

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/models.py | 수정 | Friendship 클래스 추가 (id, requester_id, addressee_id, status, created_at) |

## 구현 코드

### fastapi/models.py에 추가할 코드

```python
class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, nullable=False, index=True)
    addressee_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), nullable=False, default='pending')
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
```

### 테이블 생성 확인 명령어

```bash
# MySQL 접속하여 테이블 확인
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "SHOW TABLES;"

# 테이블 구조 확인
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "DESCRIBE friendships;"

# 인덱스 확인
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "SHOW INDEX FROM friendships;"
```

## 완료 체크리스트

- [ ] friendships 테이블이 MySQL에 생성되었는지 확인 (`SHOW TABLES;`)
- [ ] 테이블 구조가 올바른지 확인 (`DESCRIBE friendships;`)
- [ ] id, requester_id, addressee_id, status 컬럼이 모두 존재하는지 확인
- [ ] requester_id, addressee_id에 인덱스가 설정되었는지 확인 (`SHOW INDEX FROM friendships;`)
- [ ] FastAPI 서버가 에러 없이 시작되는지 확인
- [ ] 친구 요청 데이터를 영구적으로 저장할 수 있는 테이블 구조가 완성되었는지 확인
