# Google 로그인 개선 실행계획

## 요구사항 요약

**요구사항**:
1. Google 로그인 시 DB에 유저 추가할 때 `birth_date`를 오늘 날짜로 설정
2. Google 로그인 버튼을 Google 공식 디자인 가이드라인에 맞게 꾸미기
3. User 테이블에 `auth_provider` 필드 추가 — google 계정 vs 일반 계정 구분
4. 프론트엔드 localStorage 유저 정보 기능 동작 여부 확인

**목적**: Google 계정과 일반 계정을 명확히 구분하고, 사용자 경험을 개선하며, 데이터 무결성을 확보한다.

---

## 현재상태 분석

- `User` 모델: `birth_date = Column(Date, nullable=True)` — OAuth 사용자는 NULL로 저장 중, NOT NULL로 변경 필요
- `User` 모델: `auth_provider` 필드 없음 — google/local 계정 구분 불가
- Google 로그인 버튼: 일반 `<button>` 태그, 스타일 없음
- localStorage: `AuthContext.jsx`에서 `{ id, name, role, email }` 구조로 저장/복원 구현됨
- Google OAuth 신규 유저 생성 코드: `birth_date=None`으로 생성 중

---

## 구현 방법

- **백엔드**: Alembic 마이그레이션으로 `auth_provider` 컬럼 추가 + `birth_date` NOT NULL 변경, Google 유저 생성 시 `birth_date=date.today()` 및 `auth_provider='google'` 설정
- **프론트엔드**: Google 공식 브랜드 가이드라인 CSS 적용 (Google SVG 로고 + 흰 배경 + 그림자)
- **localStorage 확인**: `AuthContext.jsx` 코드 검토 및 동작 확인

---

## 구현 단계

### 1. [백엔드] `auth_provider` 컬럼 추가 + `birth_date` NOT NULL 마이그레이션

```python
# alembic/versions/xxxx_add_auth_provider_notnull_birth_date.py
def upgrade():
    # 1) NULL인 birth_date를 오늘 날짜로 채운 후 NOT NULL로 변경
    op.execute("UPDATE users SET birth_date = CURRENT_DATE WHERE birth_date IS NULL")
    op.alter_column('users', 'birth_date', nullable=False)

    # 2) auth_provider 컬럼 추가
    op.add_column('users', sa.Column(
        'auth_provider',
        sa.String(20),
        nullable=False,
        server_default='local'
    ))

def downgrade():
    op.drop_column('users', 'auth_provider')
    op.alter_column('users', 'birth_date', nullable=True)
```
- **무엇을 하는가**: 기존 NULL `birth_date`를 오늘 날짜로 채운 뒤 NOT NULL 제약 적용, `auth_provider` 컬럼 추가
- NOT NULL 변경 전에 반드시 UPDATE로 NULL 제거 — 순서 바뀌면 마이그레이션 실패
- 값: `'local'` (일반 로그인) | `'google'` (Google OAuth)

### 2. [백엔드] User 모델에 `auth_provider` 필드 추가

```python
# backend/models.py
class User(Base):
    # ... 기존 필드들 ...
    birth_date = Column(Date, nullable=False)               # nullable=True → False 변경
    auth_provider = Column(String(20), nullable=False, default='local')
```
- **무엇을 하는가**: `birth_date`를 NOT NULL로 변경, ORM 모델에 `auth_provider` 필드 선언
- `default='local'`로 일반 회원가입 시 자동 설정

### 3. [백엔드] Google 유저 생성 코드 수정

```python
# backend/app/api/v1/auth.py
from datetime import date

if not user:
    user = User(
        email=google_user["email"],
        nickname=google_user.get("name", google_user["email"].split("@")[0]),
        password=None,
        birth_date=date.today(),   # 오늘 날짜로 설정
        auth_provider='google',    # google 계정 표시
        role="user"
    )
```
- **무엇을 하는가**: 신규 Google 유저 생성 시 `birth_date`를 NULL 대신 오늘 날짜로, `auth_provider`를 `'google'`로 설정
- `from datetime import date` import 추가 필요
- 기존 Google 유저 재로그인 시에는 이 코드가 실행되지 않음 (기존 유저는 별도 마이그레이션 필요)

### 4. [백엔드] 회원가입 엔드포인트에 `auth_provider='local'` 명시

```python
# backend/app/api/v1/users.py (또는 auth.py 회원가입 부분)
new_user = User(
    email=user_data.email,
    nickname=user_data.nickname,
    password=hashed_password,
    birth_date=user_data.birth_date,
    auth_provider='local',    # 일반 계정 명시
    role="user"
)
```
- **무엇을 하는가**: 일반 회원가입 시 `auth_provider='local'`을 명시적으로 설정
- DB `server_default`가 있으므로 필수는 아니지만 코드 명확성을 위해 추가

### 5. [백엔드] LoginResponse에 `auth_provider` 포함

```python
# backend/app/api/v1/auth.py 또는 schemas.py
class LoginResponse(BaseModel):
    message: str
    user_id: int
    email: str
    nickname: str
    role: str
    auth_provider: str    # 추가
```
- **무엇을 하는가**: 로그인 응답에 `auth_provider` 포함 — 프론트에서 계정 유형 확인 가능

### 6. [프론트] localStorage에 `auth_provider` 저장

```jsx
// frontend/src/pages/Login/Login.jsx
login({
  id: res.data.user_id,
  name: res.data.nickname,
  role: res.data.role,
  email: res.data.email,
  authProvider: res.data.auth_provider,  // 추가
});
```
- **무엇을 하는가**: 로그인 후 localStorage에 저장되는 유저 정보에 `authProvider` 필드 추가
- 일반 로그인과 Google 로그인 모두 동일하게 저장

### 7. [프론트] Google 로그인 버튼 디자인 적용

```jsx
// frontend/src/pages/Login/Login.jsx
<button
  onClick={() => googleLogin()}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    padding: '10px 24px',
    cursor: 'pointer',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    color: '#3c4043',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
  }}
>
  <img
    src="https://developers.google.com/identity/images/g-logo.png"
    alt="Google logo"
    style={{ width: '18px', height: '18px' }}
  />
  Google로 로그인
</button>
```
- **무엇을 하는가**: Google 공식 Sign-In 버튼 디자인 가이드라인 적용 (흰 배경, Google 로고, Roboto 폰트)
- Google 로고는 CDN에서 로드 (또는 로컬 SVG 파일로 저장 가능)
- hover 시 배경색 `#f8f9fa`로 변경하는 `:hover` 스타일 추가 권장

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/models.py` | 수정 | `birth_date` nullable=False 변경, `auth_provider` 컬럼 추가 |
| `backend/alembic/versions/xxxx_add_auth_provider_notnull_birth_date.py` | 생성 | birth_date NOT NULL 변환 + auth_provider 컬럼 추가 마이그레이션 |
| `backend/app/api/v1/auth.py` | 수정 | Google 유저 생성 시 birth_date=today(), auth_provider='google' 추가; LoginResponse에 auth_provider 포함 |
| `backend/app/api/v1/users.py` | 수정 | 일반 회원가입 시 auth_provider='local' 명시 |
| `frontend/src/pages/Login/Login.jsx` | 수정 | Google 버튼 디자인 적용, localStorage에 authProvider 저장 |

---

## 완료 체크리스트

- [ ] `docker compose exec fastapi alembic upgrade head` 실행 후 에러 없이 완료되는지 확인
- [ ] DB에서 `SELECT auth_provider FROM users;` 실행 시 기존 유저는 `'local'`, 신규 Google 유저는 `'google'`으로 표시
- [ ] Google 로그인 후 신규 유저의 `birth_date`가 오늘 날짜(2026-03-21)로 저장되는지 확인
- [ ] 브라우저 개발자 도구 → Application → localStorage에 `user` 키에 `authProvider: "google"` 포함 여부 확인
- [ ] Google 로그인 버튼에 Google 로고와 흰 배경이 표시되는지 화면에서 확인
- [ ] 일반 회원가입 후 `auth_provider = 'local'`로 저장되는지 확인
- [ ] 페이지 새로고침 후 로그인 상태가 유지되는지 확인 (localStorage 복원 기능)
- [ ] 로그아웃 후 localStorage에서 `user` 키가 삭제되는지 브라우저 개발자 도구에서 확인
