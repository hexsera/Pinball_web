# 공지사항 DB 테이블 생성 실행계획

## 요구사항 요약

**요구사항**: `notices` 테이블을 PostgreSQL DB에 생성하고 SQLAlchemy ORM 모델로 정의한다.

**목적**: 공지사항 게시판 기능의 데이터를 저장하기 위한 DB 스키마를 구축한다.

## 현재상태 분석

- `backend/models.py`에 User, Friendship, MonthlyScore, GameVisit 모델 존재. Notice 모델 없음.
- 기존 모델은 `Column(Integer, ForeignKey(...))` 방식의 SQLAlchemy Core 스타일 사용.
- `DateTime` 컬럼은 `server_default=func.now()`, `onupdate=func.now()` 패턴으로 일관되게 작성됨.
- Alembic 마이그레이션 환경이 이미 구성되어 있으며, Docker 컨테이너 내부에서 실행한다.

## 구현 방법

- 기존 모델과 동일한 SQLAlchemy Core 스타일로 `Notice` 클래스를 작성한다.
- `content` 컬럼은 Base64 이미지 포함 HTML을 저장하므로 `Text` 타입을 사용한다.
- `author_id`는 `users.id`를 참조하는 외래키로 설정한다.
- Alembic `--autogenerate` 옵션으로 모델 변경사항을 자동 감지하여 마이그레이션 파일을 생성한다.

## 구현 단계

### 1. models.py에 Text 임포트 추가 및 Notice 모델 추가

```python
# backend/models.py 상단 임포트 수정
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, UniqueConstraint, CheckConstraint, ForeignKey, Text

# 파일 하단에 추가
class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
```
- **무엇을 하는가**: `notices` 테이블 스키마를 ORM 클래스로 정의한다.
- `Text` 타입: Base64 이미지가 포함된 대용량 HTML 콘텐츠 저장에 적합. `String`은 길이 제한이 있어 부적합.
- `server_default=func.now()`: DB 서버 시간으로 자동 설정. `onupdate=func.now()`는 수정 시 자동 갱신.
- `author_id`의 `ForeignKey('users.id')`: users 테이블 id를 참조. ON DELETE 설정 없음 (프로젝트 정책 일치).

### 2. Alembic 마이그레이션 파일 자동 생성

```bash
docker compose exec fastapi alembic revision --autogenerate -m "add_notices_table"
```
- **무엇을 하는가**: 현재 DB 스키마와 models.py의 차이를 감지하여 마이그레이션 파일을 생성한다.
- 생성된 파일은 `backend/alembic/versions/` 디렉토리에 저장된다.
- 생성 후 파일을 열어 `op.create_table('notices', ...)` 구문이 올바르게 생성되었는지 확인한다.

### 3. 마이그레이션 적용

```bash
docker compose exec fastapi alembic upgrade head
```
- **무엇을 하는가**: 생성된 마이그레이션 파일을 실행하여 실제 DB에 `notices` 테이블을 생성한다.
- `head`는 현재 존재하는 가장 최신 마이그레이션까지 순서대로 적용한다.
- 적용 후 `alembic current` 명령으로 현재 적용된 버전을 확인할 수 있다.

### 4. 테이블 생성 확인

```bash
docker compose exec fastapi alembic current
```
- **무엇을 하는가**: 현재 DB에 적용된 마이그레이션 버전을 출력하여 정상 적용 여부를 확인한다.
- `(head)` 표시가 있으면 최신 마이그레이션까지 정상 적용된 것이다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/models.py` | 수정 | `Text` 임포트 추가, `Notice` 클래스 추가 |
| `backend/alembic/versions/xxxx_add_notices_table.py` | 생성 | Alembic autogenerate로 자동 생성되는 마이그레이션 파일 |

## 완료 체크리스트

- [ ] `backend/models.py`에 `Notice` 클래스가 추가되어 있다.
- [ ] `alembic revision --autogenerate` 실행 후 `alembic/versions/`에 새 파일이 생성된다.
- [ ] 생성된 마이그레이션 파일에 `op.create_table('notices', ...)` 구문이 존재한다.
- [ ] `alembic upgrade head` 실행 후 에러가 없다.
- [ ] `alembic current` 실행 시 `(head)` 표시가 출력된다.
