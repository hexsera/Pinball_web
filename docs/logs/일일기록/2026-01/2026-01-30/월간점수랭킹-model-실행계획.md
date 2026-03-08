# 월간 점수 랭킹 Model 실행계획

## 요구사항 요약

**요구사항**: FastAPI에 월간 점수 랭킹용 SQLAlchemy Model을 생성한다.

**목적**: 월간 점수 랭킹 데이터를 저장하고 조회하기 위한 데이터베이스 테이블 구조 정의. API 생성과 DB 연결은 현재 고려하지 않음.

## 현재상태 분석

- `fastapi/models.py`에 SQLAlchemy 모델들이 정의되어 있음
- 기존 모델: `User`, `Score`, `Friendship`, `Visit`
- `Score` 모델: id, user_id, score, created_at 필드 보유
- 월간 집계 데이터를 저장하는 별도 테이블이 없음

## 구현 방법

SQLAlchemy ORM을 사용하여 월간 랭킹 전용 Model을 생성한다.
- 월별 최고 점수를 집계하여 저장하는 테이블 구조
- 기존 Score 테이블과 독립적으로 운영 (집계 테이블 패턴)
- 인덱스 설정으로 조회 성능 최적화

## 구현 단계

### 1. MonthlyScore Model 생성
```python
class MonthlyScore(Base):
    __tablename__ = "monthly_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
```
- **무엇을 하는가**: 사용자별 월간 점수를 저장하는 테이블
- `user_id`: 사용자 ID (User 테이블과 연관)
- `score`: 월간 점수
- `created_at`: 기록 생성 시각 (월 정보 추출용)
- 모든 필드에 인덱스 설정으로 조회 성능 최적화

### 2. models.py에 MonthlyScore 추가 위치 확인
```python
# fastapi/models.py 하단에 추가

class MonthlyScore(Base):
    __tablename__ = "monthly_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
```
- **무엇을 하는가**: 기존 Visit 모델 다음에 MonthlyScore 클래스 추가
- 기존 import 문은 그대로 유지 (이미 필요한 모든 import 존재)
- Base, Column, Integer, DateTime, func 모두 이미 import되어 있음

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/models.py | 수정 | MonthlyScore 클래스 추가 |

## 완료 체크리스트

- [ ] `MonthlyScore` 클래스가 models.py에 추가됨
- [ ] 필드 구조: id, user_id, score, created_at
- [ ] FastAPI 서버가 에러 없이 실행됨 (`docker compose logs fastapi`)
- [ ] Alembic 마이그레이션 파일 생성 가능 (`alembic revision --autogenerate -m "add monthly_scores"`)
