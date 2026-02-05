"""add user_id column to users table

Revision ID: 6fe36d8bc6a2
Revises: eccd28617903
Create Date: 2026-02-05 09:23:48.229574

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '6fe36d8bc6a2'
down_revision = 'eccd28617903'
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
