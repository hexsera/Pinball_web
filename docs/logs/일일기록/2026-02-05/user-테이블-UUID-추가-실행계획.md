# user 테이블 UUID 컬럼 추가 실행계획

## 요구사항 요약

**요구사항**: users 테이블에 UUID용 user_id 컬럼을 추가하고 모든 레코드에 UUID 값을 채운다.

**목적**: 향후 user_id를 PRIMARY KEY로 전환하기 위한 사전 작업. 현재 AUTO_INCREMENT인 id 컬럼 대신 UUID 기반 식별자를 사용하여 분산 시스템 환경에서도 고유성을 보장하기 위함.

## 현재상태 분석

**데이터베이스**: PostgreSQL (postgres-server 컨테이너)

**users 테이블 구조**:
- id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)
- email (VARCHAR(255), UNIQUE, NOT NULL)
- nickname (VARCHAR(100), NOT NULL)
- password (VARCHAR(255), NOT NULL)
- birth_date (DATE, NOT NULL)
- role (VARCHAR(20), NOT NULL, DEFAULT='user')

**마이그레이션 도구**: Alembic (backend/alembic/)

**제약사항**: 현재 API가 id 컬럼을 사용 중이므로 id 컬럼은 삭제하지 않음 (나중에 API 변경 후 삭제 예정)

## 구현 방법

**기술 스택**:
- Alembic 마이그레이션으로 스키마 변경
- PostgreSQL 네이티브 UUID 타입 사용 (16 bytes, 저장공간 효율적)
- SQLAlchemy의 `sqlalchemy.dialects.postgresql.UUID` 타입
- Python uuid 라이브러리로 자동 UUID 생성 (default=uuid.uuid4)
- PostgreSQL의 uuid-ossp 확장 모듈 (기존 레코드 UUID 채우기용)

**단계**:
1. SQLAlchemy 모델에 user_id 컬럼 추가 (UUID 타입, default=uuid.uuid4, nullable=True)
2. Alembic 마이그레이션 파일 생성 (autogenerate)
3. 마이그레이션 파일 수정 (uuid-ossp 확장 설치, 기존 레코드 UUID 채우기, NOT NULL 제약 추가)
4. 마이그레이션 적용 (upgrade head)
5. 검증 (user_id 컬럼 생성 및 데이터 확인)

## 구현 단계

### 1. SQLAlchemy 모델에 user_id 컬럼 추가

```python
# backend/models.py

from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=True,
                    default=uuid.uuid4, index=True)  # 추가
    email = Column(String(255), unique=True, index=True, nullable=False)
    nickname = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    birth_date = Column(Date, nullable=False)
    role = Column(String(20), nullable=False, default='user')
```

- **무엇을 하는가**: User 모델에 PostgreSQL UUID 타입 user_id 컬럼 추가
- `UUID(as_uuid=True)`: PostgreSQL 네이티브 UUID 타입 사용 (16 bytes, 저장공간 효율적)
- `as_uuid=True`: Python uuid 객체로 자동 변환 (타입 안정성)
- `default=uuid.uuid4`: 새 레코드 생성 시 자동으로 UUID v4 생성 (Python 레벨)
- nullable=True: 기존 레코드가 NULL 값을 가지므로 초기에는 NULL 허용 (마이그레이션 후 NOT NULL로 변경)
- unique=True, index=True: 고유성 제약 및 조회 성능 향상

### 2. Alembic 마이그레이션 파일 생성

```bash
docker exec fastapi-server alembic revision --autogenerate -m "add user_id column to users table"
```

- **무엇을 하는가**: models.py 변경사항을 감지하여 마이그레이션 파일 자동 생성
- autogenerate: SQLAlchemy 모델과 DB 스키마를 비교하여 차이점 감지
- 생성 위치: backend/alembic/versions/[revision_id]_add_user_id_column_to_users_table.py

### 3. 마이그레이션 파일 수정

```python
# backend/alembic/versions/[revision_id]_add_user_id_column_to_users_table.py

"""add user_id column to users table

Revision ID: [revision_id]
Revises: [previous_revision_id]
Create Date: [timestamp]

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '[revision_id]'
down_revision = '[previous_revision_id]'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. uuid-ossp 확장 설치 (PostgreSQL에서 UUID 생성 함수 사용)
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # 2. user_id 컬럼 추가 (UUID 타입, NULL 허용)
    op.add_column('users', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))

    # 3. 기존 레코드에 UUID 채우기
    op.execute('''
        UPDATE users
        SET user_id = uuid_generate_v4()
        WHERE user_id IS NULL
    ''')

    # 4. user_id 컬럼에 NOT NULL 제약 추가
    op.alter_column('users', 'user_id', nullable=False)

    # 5. user_id 컬럼에 UNIQUE 제약 추가
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=True)


def downgrade() -> None:
    # UNIQUE 인덱스 삭제
    op.drop_index(op.f('ix_users_user_id'), table_name='users')

    # user_id 컬럼 삭제
    op.drop_column('users', 'user_id')

    # uuid-ossp 확장 삭제 (주의: 다른 테이블에서 사용 중일 수 있음)
    # op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
```

- **무엇을 하는가**: 마이그레이션 파일에 PostgreSQL UUID 타입 컬럼 추가 및 데이터 채우기
- CREATE EXTENSION: PostgreSQL의 uuid-ossp 모듈 설치 (uuid_generate_v4() 함수 제공)
- `postgresql.UUID(as_uuid=True)`: PostgreSQL 네이티브 UUID 타입 (16 bytes)
- `uuid_generate_v4()`: UUID 버전 4 생성 (랜덤 기반, PostgreSQL 함수)
- ::text 변환 불필요: UUID 타입이므로 그대로 저장
- UPDATE WHERE user_id IS NULL: 기존 레코드만 UUID 채우기 (멱등성 보장)
- `alter_column nullable=False`: 모든 레코드에 UUID 채운 후 NOT NULL 제약 추가
- create_index: UNIQUE 제약이 있는 인덱스 생성 (조회 성능 향상)

### 4. 마이그레이션 적용

```bash
docker exec fastapi-server alembic upgrade head
```

- **무엇을 하는가**: 생성한 마이그레이션 파일을 데이터베이스에 적용
- upgrade head: 최신 버전으로 마이그레이션
- 결과: users 테이블에 user_id 컬럼 추가 및 UUID 값 채워짐

### 5. 검증

```bash
# 테이블 구조 확인 (user_id 컬럼이 uuid 타입인지 확인)
docker exec postgres-server psql -U hexsera -d hexdb -c "\d users"

# user_id 데이터 확인
docker exec postgres-server psql -U hexsera -d hexdb -c "SELECT id, user_id, email FROM users LIMIT 5;"

# NULL 값 확인 (0개여야 함)
docker exec postgres-server psql -U hexsera -d hexdb -c "SELECT COUNT(*) FROM users WHERE user_id IS NULL;"

# UNIQUE 제약 확인
docker exec postgres-server psql -U hexsera -d hexdb -c "SELECT COUNT(DISTINCT user_id) = COUNT(*) AS is_unique FROM users;"

# UUID 타입 확인
docker exec postgres-server psql -U hexsera -d hexdb -c "SELECT pg_typeof(user_id) FROM users LIMIT 1;"
```

- **무엇을 하는가**: 마이그레이션이 올바르게 적용되었는지 확인
- \d users: 테이블 구조 출력 (user_id 컬럼이 uuid 타입인지 확인)
- SELECT id, user_id, email: UUID 값이 제대로 생성되었는지 확인
- COUNT(*) WHERE user_id IS NULL: NULL 값이 없는지 확인 (0개여야 정상)
- COUNT(DISTINCT user_id) = COUNT(*): 모든 user_id가 고유한지 확인 (TRUE여야 정상)
- pg_typeof(user_id): 컬럼 타입이 'uuid'인지 확인 (String이 아닌 uuid 타입이어야 함)

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/models.py | 수정 | User 모델에 user_id 컬럼 추가 (PostgreSQL UUID 타입, default=uuid.uuid4, unique=True, nullable=True, index=True) |
| backend/alembic/versions/[revision_id]_add_user_id_column_to_users_table.py | 생성 | Alembic 마이그레이션 파일 생성 및 수정 (uuid-ossp 설치, UUID 타입 컬럼 추가, 기존 레코드 UUID 채우기, NOT NULL 제약, UNIQUE 제약) |

## 완료 체크리스트

- [ ] backend/models.py에 `UUID(as_uuid=True)` 타입 user_id 컬럼이 추가되었는가?
- [ ] User 모델에 `import uuid`와 `from sqlalchemy.dialects.postgresql import UUID` 임포트가 추가되었는가?
- [ ] Alembic 마이그레이션 파일이 생성되었는가?
- [ ] 마이그레이션 파일에 uuid-ossp 확장 설치 로직이 포함되어 있는가?
- [ ] 마이그레이션 파일에 `postgresql.UUID(as_uuid=True)` 타입이 사용되었는가?
- [ ] 마이그레이션 파일에 기존 레코드 UUID 채우기 로직이 포함되어 있는가?
- [ ] 마이그레이션 파일에 NOT NULL 제약 추가 로직이 포함되어 있는가?
- [ ] `docker exec fastapi-server alembic upgrade head` 명령이 에러 없이 실행되는가?
- [ ] `\d users` 명령으로 user_id 컬럼이 uuid 타입으로 확인되는가? (character varying이 아닌 uuid)
- [ ] 모든 users 레코드에 user_id 값이 채워져 있는가? (NULL 값 0개)
- [ ] user_id 값이 모두 고유한가? (UNIQUE 제약 작동)
- [ ] `pg_typeof(user_id)` 쿼리 결과가 'uuid'인가? (타입 검증)
- [ ] user_id 값이 UUID v4 형식인가? (예: 550e8400-e29b-41d4-a716-446655440000)
