# MySQL → PostgreSQL 데이터 마이그레이션 실행계획

## 요구사항 요약

**요구사항**: MySQL 데이터베이스의 모든 테이블 데이터를 PostgreSQL로 이동

**목적**:
- 데이터베이스를 MySQL에서 PostgreSQL로 전환하여 운영 환경 통일
- 기존 사용자 데이터(31명), 점수 데이터(4건) 및 기타 테이블 데이터 보존
- PostgreSQL의 향상된 성능과 기능 활용

## 현재상태 분석

**MySQL 상태**:
- 컨테이너: mysql-server (포트 3306)
- 데이터베이스: hexdb (사용자: hexsera)
- 테이블: users(31건), scores(4건), friendships, game_visits, monthly_scores, visits, alembic_version

**PostgreSQL 상태**:
- 컨테이너: postgres-server (포트 5432)
- 데이터베이스: hexdb (사용자: hexsera)
- 테이블: 스키마만 존재 (데이터 없음)
- 현재 FastAPI는 PostgreSQL 연결로 설정됨 (DATABASE_URL)

**주요 차이점**:
- MySQL의 visits 테이블이 PostgreSQL에는 없음 (마이그레이션 필요 여부 확인)
- 나머지 테이블은 양쪽 모두 존재

## 구현 방법

**마이그레이션 전략**:
1. **SQLAlchemy ORM 방식**: models.py의 Model 클래스를 사용하여 MySQL → PostgreSQL 데이터 복사
2. **장점**: 타입 자동 변환, 컬럼 정보 자동 추출, 테이블 구조 변경 시 스크립트 수정 불필요
3. **단계**: 양쪽 DB 세션 생성 → Model 기반 데이터 조회 → 데이터 복사 → 검증

**사용 도구**:
- SQLAlchemy ORM (models.py의 User, Score 등)
- pymysql (MySQL 드라이버)
- psycopg2 (PostgreSQL 드라이버)
- SessionLocal (세션 팩토리)

## 구현 단계

### 1. 마이그레이션 스크립트 생성

```python
# backend/migrate_data.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from models import User, Score, Friendship, MonthlyScore, GameVisit

load_dotenv()

# MySQL 연결
MYSQL_URL = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DATABASE')}"
mysql_engine = create_engine(MYSQL_URL)
MySQLSession = sessionmaker(bind=mysql_engine)

# PostgreSQL 연결
POSTGRES_URL = os.getenv("DATABASE_URL")
postgres_engine = create_engine(POSTGRES_URL)
PostgresSession = sessionmaker(bind=postgres_engine)

def migrate_model(model_class):
    """Model 기반으로 데이터를 MySQL에서 PostgreSQL로 복사"""
    table_name = model_class.__tablename__
    print(f"\n[{table_name}] 마이그레이션 시작...")

    # MySQL에서 데이터 읽기
    mysql_session = MySQLSession()
    try:
        rows = mysql_session.query(model_class).all()
        print(f"  - MySQL에서 {len(rows)}건 읽기 완료")

        if len(rows) == 0:
            print(f"  - {table_name} 테이블에 데이터가 없습니다.")
            return

        # 객체를 딕셔너리로 변환 (새 세션에서 사용하기 위해)
        row_dicts = []
        for row in rows:
            row_dict = {col.name: getattr(row, col.name) for col in model_class.__table__.columns}
            row_dicts.append(row_dict)
    finally:
        mysql_session.close()

    # PostgreSQL에 데이터 삽입
    postgres_session = PostgresSession()
    try:
        # 기존 데이터 삭제
        postgres_session.query(model_class).delete()
        print(f"  - PostgreSQL 기존 데이터 삭제 완료")

        # 새 데이터 삽입
        for row_dict in row_dicts:
            new_obj = model_class(**row_dict)
            postgres_session.add(new_obj)

        postgres_session.commit()
        print(f"  - PostgreSQL에 {len(row_dicts)}건 삽입 완료")
    except Exception as e:
        postgres_session.rollback()
        raise e
    finally:
        postgres_session.close()

def main():
    print("=== MySQL → PostgreSQL 데이터 마이그레이션 시작 ===")

    # 마이그레이션할 Model 목록
    models_to_migrate = [
        User,
        Score,
        Friendship,
        MonthlyScore,
        GameVisit,
    ]

    # 각 Model 마이그레이션 실행
    for model in models_to_migrate:
        try:
            migrate_model(model)
        except Exception as e:
            print(f"  - 오류 발생: {e}")

    print("\n=== 마이그레이션 완료 ===")

if __name__ == "__main__":
    main()
```

- **무엇을 하는가**: models.py의 Model 클래스를 사용하여 MySQL 데이터를 PostgreSQL로 복사
- 각 Model마다 컬럼 정보를 자동으로 추출 (`model_class.__table__.columns`)
- ORM의 `query().all()`로 데이터 조회, `add()`로 삽입
- 객체를 딕셔너리로 변환하여 세션 간 데이터 전달 (detached 문제 방지)
- 트랜잭션 단위로 커밋, 오류 시 자동 롤백

### 2. 스크립트 실행 및 데이터 검증

```bash
# 스크립트 실행 (Docker 컨테이너 내부)
docker exec fastapi-server python /code/migrate_data.py

# 데이터 검증 - PostgreSQL
docker exec postgres-server psql -U hexsera -d hexdb -c "SELECT COUNT(*) FROM users;"
docker exec postgres-server psql -U hexsera -d hexdb -c "SELECT COUNT(*) FROM scores;"
docker exec postgres-server psql -U hexsera -d hexdb -c "SELECT * FROM users LIMIT 5;"

# MySQL과 PostgreSQL 데이터 개수 비교
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "SELECT COUNT(*) as user_count FROM users;"
docker exec postgres-server psql -U hexsera -d hexdb -c "SELECT COUNT(*) as user_count FROM users;"
```

- **무엇을 하는가**: 마이그레이션 스크립트를 실행하고 데이터가 정상적으로 이동되었는지 검증
- Docker exec를 통해 컨테이너 내부에서 Python 스크립트 실행
- PostgreSQL에서 데이터 개수 및 샘플 데이터 확인
- MySQL과 PostgreSQL의 데이터 개수를 비교하여 누락 여부 확인

### 3. 시퀀스 초기화 (PostgreSQL AUTO_INCREMENT 동기화)

```bash
# PostgreSQL 시퀀스 확인 및 초기화
docker exec postgres-server psql -U hexsera -d hexdb -c "
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('scores_id_seq', (SELECT MAX(id) FROM scores));
SELECT setval('friendships_id_seq', (SELECT MAX(id) FROM friendships));
SELECT setval('monthly_scores_id_seq', (SELECT MAX(id) FROM monthly_scores));
SELECT setval('game_visits_id_seq', (SELECT MAX(id) FROM game_visits));
"
```

- **무엇을 하는가**: PostgreSQL의 시퀀스(AUTO_INCREMENT)를 현재 최대값으로 초기화
- 마이그레이션 후 새 데이터 삽입 시 ID 중복을 방지하기 위해 필수
- `setval()`로 각 테이블의 시퀀스를 현재 최대 ID + 1로 설정
- 이 단계를 생략하면 새 레코드 삽입 시 PRIMARY KEY 충돌 발생 가능



## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/migrate_data.py | 생성 | 데이터 마이그레이션 스크립트 (MySQL → PostgreSQL) |
| docker-compose.yml | 수정 (선택) | mysql 서비스 주석 처리 또는 제거 |

## 완료 체크리스트

- [ ] migrate_data.py 스크립트 생성 완료 (Model 기반)
- [ ] 스크립트 실행하여 데이터 마이그레이션 완료
- [ ] PostgreSQL의 users 테이블에 31건 데이터 확인
- [ ] PostgreSQL의 scores 테이블에 4건 데이터 확인
- [ ] 나머지 테이블(friendships, monthly_scores, game_visits) 데이터 확인
- [ ] PostgreSQL 시퀀스 초기화 완료 (setval 실행)
- [ ] alembic_version 테이블 동기화 완료
- [ ] FastAPI 애플리케이션이 PostgreSQL로 정상 작동하는지 확인
- [ ] 새 사용자 추가 시 ID 중복 없이 정상 동작하는지 확인
- [ ] MySQL 컨테이너 중지 (선택 사항)
