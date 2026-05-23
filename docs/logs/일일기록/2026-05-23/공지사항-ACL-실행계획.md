# 공지사항 ACL 실행계획

## 요구사항 요약

**요구사항**: 공지사항 리소스에 ACL을 적용하여 작성자는 수정/삭제 권한, 나머지 유저는 읽기 권한만 갖도록 제어한다.

**목적**: ACL 기초 학습 및 공지사항 API의 권한 체계 확립. 현재 누구나 공지사항을 삭제할 수 있는 보안 문제 해결.

## 현재상태 분석

- `Notice` 테이블에 `author_id` 컬럼 존재 (소유자 개념은 이미 있음)
- `create_notice`에 `author_id=1` 하드코딩 — 인증 없음
- `delete_notice`에 권한 체크 없음 — 누구나 삭제 가능
- `update_notice` API 자체가 없음
- ACL 테이블 없음

## 구현 방법

- 범용 ACL 테이블(`acl_entries`) 생성 — `resource_type`으로 리소스 종류 구분
- 다른 리소스(점수, 친구 관계 등)에도 재사용 가능
- `permission` 값은 DB CheckConstraint + Python Enum으로 이중 강제
- FK 없이 `resource_type` + `resource_id` 조합으로 리소스 참조 (ON DELETE CASCADE 불가 — 코드에서 직접 삭제 처리)
- 공지사항 정책: 작성자는 `manage`, 모든 사람은 `read` (`*` 특수값 사용)

---

## Phase 1: DB

### 구현 단계

#### 1. AclPermission Enum 추가 (models.py)

```python
from enum import Enum

class AclPermission(str, Enum):
    read   = "read"
    manage = "manage"  # 수정 + 삭제를 하나로 묶음
```

- **무엇을 하는가**: 코드 레벨에서 permission 값 불일치 방지
- `str` 상속으로 DB 저장 시 문자열로 자동 변환

#### 2. AclEntry 모델 추가 (models.py)

```python
class AclEntry(Base):
    __tablename__ = "acl_entries"

    id            = Column(Integer, primary_key=True, index=True)
    actor_id      = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id   = Column(Integer, nullable=False, index=True)
    permission    = Column(String(20), nullable=False)

    __table_args__ = (
        UniqueConstraint('actor_id', 'resource_type', 'resource_id', 'permission', name='uq_acl_entry'),
        CheckConstraint("permission IN ('read', 'manage')", name='ck_acl_permission'),
    )
```

- **무엇을 하는가**: 범용 ACL 테이블 정의 — `resource_type`으로 리소스 종류 구분
- FK 없이 `resource_type` + `resource_id` 조합으로 여러 리소스 참조 가능
- `actor_id`를 String으로 선언해 `"*"` 특수값 저장 가능
- UniqueConstraint로 중복 레코드 방지
- CheckConstraint로 DB 레벨에서 permission 값 강제

#### 3. Alembic 마이그레이션 생성 및 적용

```bash
docker compose exec fastapi alembic revision --autogenerate -m "add notice_acl_entries table"
docker compose exec fastapi alembic upgrade head
```

- **무엇을 하는가**: `notice_acl_entries` 테이블을 DB에 실제로 생성

### 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/models.py` | 수정 | `AclPermission` Enum, `AclEntry` 모델 추가 |
| `backend/alembic/versions/` | 생성 | acl_entries 테이블 마이그레이션 |

### 완료 체크리스트

- [x] `acl_entries` 테이블이 DB에 생성되었는지 확인
- [x] `permission` 컬럼에 `'read'`, `'manage'` 외 값 삽입 시 오류 발생하는지 확인
- [x] `actor_id`에 `"*"` 값이 정상 저장되는지 확인

---

## Phase 2: API 연동

### 구현 단계

#### 1. can_notice() 함수 추가 (app/api/deps.py)

```python
def can_notice(actor_id: int, permission: str, notice_id: int, db: Session) -> bool:
    # 본인 레코드 먼저 확인 — 명시적 규칙이 * 보다 우선
    entry = db.query(AclEntry).filter(
        AclEntry.actor_id == str(actor_id),
        AclEntry.resource_type == "notice",
        AclEntry.resource_id == notice_id,
        AclEntry.permission == permission,
    ).first()
    if entry:
        return True

    # * 레코드 확인
    return db.query(AclEntry).filter(
        AclEntry.actor_id == "*",
        AclEntry.resource_type == "notice",
        AclEntry.resource_id == notice_id,
        AclEntry.permission == permission,
    ).exists()
```

- **무엇을 하는가**: 특정 유저가 특정 공지사항에 대해 권한이 있는지 확인
- 명시적 유저 레코드를 먼저 확인하고, 없으면 `*` 레코드 확인

#### 2. create_notice 수정 (app/api/v1/notices.py)

```python
@router.post("", response_model=NoticeResponse)
def create_notice(
    body: NoticeCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notice = Notice(title=body.title, content=body.content, author_id=int(current_user["sub"]))
    db.add(notice)
    db.flush()  # notice.id 확보 (커밋 전)

    # 모든 사람 읽기 허용
    db.add(AclEntry(actor_id="*", resource_type="notice", resource_id=notice.id, permission="read"))
    # 작성자 수정/삭제 허용
    db.add(AclEntry(actor_id=str(current_user["sub"]), resource_type="notice", resource_id=notice.id, permission="manage"))

    db.commit()
    db.refresh(notice)
    return notice
```

- **무엇을 하는가**: 공지사항 생성과 ACL 레코드 2개를 하나의 트랜잭션으로 처리
- `db.flush()`로 커밋 없이 `notice.id`를 먼저 확보한 뒤 ACL 레코드에 사용
- `author_id=1` 하드코딩 제거, JWT에서 실제 유저 id 사용

#### 3. delete_notice 수정 (app/api/v1/notices.py)

```python
@router.delete("/{notice_id}")
def delete_notice(
    notice_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    if not can_notice(int(current_user["sub"]), "manage", notice_id, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    db.delete(notice)  # ON DELETE CASCADE로 acl_entries도 자동 삭제
    db.commit()
    return {"message": "deleted", "id": notice_id}
```

- **무엇을 하는가**: ACL 체크 후 삭제. `ON DELETE CASCADE`로 acl_entries는 자동 삭제됨

#### 4. update_notice 추가 (app/api/v1/notices.py)

```python
@router.put("/{notice_id}", response_model=NoticeResponse)
def update_notice(
    notice_id: int,
    body: NoticeCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    if not can_notice(int(current_user["sub"]), "manage", notice_id, db):
        raise HTTPException(status_code=403, detail="Forbidden")

    notice.title   = body.title
    notice.content = body.content
    db.commit()
    db.refresh(notice)
    return notice
```

- **무엇을 하는가**: ACL manage 권한 확인 후 공지사항 수정

### 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/deps.py` | 수정 | `can_notice()` 함수 추가 |
| `backend/app/api/v1/notices.py` | 수정 | create/delete 수정, update 추가, 인증 의존성 추가 |

### 완료 체크리스트

- [ ] 공지사항 생성 시 acl_entries 레코드 2개(`*`/read, 작성자/manage)가 함께 생성되는지 확인
- [ ] 작성자 본인만 공지사항 수정/삭제가 가능한지 확인
- [ ] 다른 유저가 수정/삭제 시도 시 403 응답이 반환되는지 확인
- [ ] 공지사항 삭제 시 acl_entries 레코드도 함께 삭제되는지 확인
- [ ] 비로그인 유저도 공지사항 목록/상세 조회가 가능한지 확인
