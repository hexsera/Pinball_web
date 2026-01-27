# visits 테이블 실행계획

## 요구사항 요약

**요구사항**: visits 테이블을 생성하여 사이트 방문 기록을 저장

**목적**: 특정 기간에 몇 명이 사이트를 방문했는지 파악하기 위함

## 현재상태 분석

- FastAPI 프로젝트에 SQLAlchemy ORM을 사용 중
- `fastapi/models.py`에 User, Score, Friendship 모델이 정의되어 있음
- Base.metadata.create_all()로 테이블 자동 생성 기능 구현됨
- Alembic 마이그레이션도 사용 중
- 다른 테이블과의 관계는 현재 설정되어 있지 않음 (외래키 미사용)

## 구현 방법

SQLAlchemy ORM 모델을 사용하여 visits 테이블을 정의합니다. 방문 기록을 추적하기 위해 다음 컬럼을 포함합니다:

- `id`: 고유 식별자 (PRIMARY KEY, AUTO_INCREMENT)
- `user_id`: 방문한 사용자 ID (선택적, 비회원도 방문 가능)
- `visited_at`: 방문 시각 (자동 기록)

다른 테이블과의 외래키 관계는 설정하지 않습니다 (PRD 요구사항에 따라).

## 구현 단계

1. **models.py에 Visit 모델 추가**
   - Visit 클래스 생성
   - 컬럼 정의: id, user_id, visited_at
   - user_id는 nullable=True (비회원 방문 허용)
   - 인덱스 설정: id, user_id, visited_at (조회 성능 최적화)

2. **FastAPI 재시작으로 테이블 생성**
   - Base.metadata.create_all()이 자동으로 테이블 생성
   - docker compose restart fastapi 실행

3. **테이블 생성 확인**
   - MySQL CLI로 visits 테이블 구조 확인
   - DESCRIBE visits 명령어 실행

## 구현 코드

### fastapi/models.py

기존 Friendship 모델 아래에 Visit 모델을 추가합니다:

```python
class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    visited_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
```

**주요 특징**:
- `user_id`: nullable=True (비회원 방문도 기록)
- `visited_at`: server_default=func.now()로 DB 서버 시간 자동 기록
- 인덱스: id, user_id, visited_at (기간별/사용자별 조회 성능 최적화)

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/models.py | 수정 | Visit 모델 클래스 추가 (id, user_id, visited_at 컬럼) |

## 완료 체크리스트

- [o] models.py에 Visit 클래스가 추가되었는지 확인
- [o] FastAPI 재시작 후 에러 없이 실행되는지 확인
- [o] MySQL에서 visits 테이블이 생성되었는지 확인 (`SHOW TABLES;`)
- [o] visits 테이블 구조가 올바른지 확인 (`DESCRIBE visits;`)
- [o] id, user_id, visited_at 컬럼에 인덱스가 생성되었는지 확인 (`SHOW INDEX FROM visits;`)
