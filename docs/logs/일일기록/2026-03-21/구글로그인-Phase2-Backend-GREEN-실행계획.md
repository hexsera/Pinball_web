# 구글 로그인 Phase 2 Backend GREEN 실행계획

## 요구사항 요약

**요구사항**: `test_google_auth.py`의 11개 RED 테스트를 통과하는 최소한의 백엔드 코드를 작성한다.

**목적**: Google OAuth 2.0 Authorization Code Flow 백엔드 구현 — `POST /api/v1/auth/google` 엔드포인트로 구글 계정 로그인/자동 가입 처리.

## 현재상태 분석

- `app/schemas/user.py`: `GoogleLoginRequest` 스키마 없음
- `app/api/v1/auth.py`: `/auth/google` 엔드포인트 없음, `AsyncOAuth2Client` import 없음
- `models.py`: `User.password`, `User.birth_date` 모두 `nullable=False`
- `app/core/config.py`: Google OAuth 설정 변수 없음
- `requirements.txt`: `httpx==0.27.0` 이미 있음, `Authlib` 없음

## 구현 방법

- `Authlib`의 `AsyncOAuth2Client`로 Authorization Code → Access Token 교환, userinfo 조회
- DB에서 이메일 조회 후 없으면 자동 생성, 있으면 기존 유저 반환
- 기존 `LoginResponse` 스키마 재사용으로 프론트엔드 응답 형태 통일

## 구현 단계

### 1. Authlib 패키지 추가 (`backend/requirements.txt`)
```txt
Authlib==1.6.9
```
- **무엇을 하는가**: OAuth 2.0 Token 교환 및 userinfo 조회를 처리하는 라이브러리 추가
- `httpx==0.27.0`은 이미 있으므로 Authlib만 추가

### 2. Google 설정 변수 추가 (`backend/app/core/config.py`)
```python
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "postmessage")
```
- **무엇을 하는가**: Token 교환 시 구글에 전달할 클라이언트 자격증명을 환경변수로 관리
- `GOOGLE_REDIRECT_URI=postmessage`는 팝업 방식 로그인의 고정값

### 3. GoogleLoginRequest 스키마 추가 (`backend/app/schemas/user.py`)
```python
class GoogleLoginRequest(BaseModel):
    code: str  # Authorization Code
```
- **무엇을 하는가**: 프론트엔드가 전송하는 Authorization Code를 받는 요청 스키마
- `code` 필드만 있음 — Access Token이 아니라 Code를 받음

### 4. User 모델 nullable 변경 (`backend/models.py`)
```python
password = Column(String(255), nullable=True)
birth_date = Column(Date, nullable=True)
```
- **무엇을 하는가**: 구글 로그인 사용자는 비밀번호/생년월일이 없으므로 NULL 허용으로 변경
- 기존 이메일/비밀번호 로그인 사용자에게 영향 없음

### 5. POST /auth/google 엔드포인트 추가 (`backend/app/api/v1/auth.py`)
```python
from authlib.integrations.httpx_client import AsyncOAuth2Client
from app.schemas.user import GoogleLoginRequest

@router.post("/auth/google")
async def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    async with AsyncOAuth2Client(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    ) as client:
        token = await client.fetch_token(
            "https://oauth2.googleapis.com/token",
            code=data.code,
            redirect_uri=settings.GOOGLE_REDIRECT_URI,
            grant_type="authorization_code",
        )
    async with AsyncOAuth2Client(token=token) as client:
        resp = await client.get("https://www.googleapis.com/oauth2/v3/userinfo")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to get Google user info")
    google_user = resp.json()
    user = db.query(User).filter(User.email == google_user["email"]).first()
    if not user:
        user = User(
            email=google_user["email"],
            nickname=google_user.get("name", google_user["email"].split("@")[0]),
            password=None,
            birth_date=None,
            role="user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return LoginResponse(
        message="Login successful",
        user_id=user.id,
        email=user.email,
        nickname=user.nickname,
        role=user.role
    )
```
- **무엇을 하는가**: Authorization Code를 받아 Token 교환 → userinfo 조회 → DB 자동 생성/조회 → LoginResponse 반환
- `fetch_token()`이 client_id, client_secret, code를 조합해 구글에 POST 전송
- `google_user.get("name", ...)`: name 없을 경우 email @ 앞부분을 nickname으로 사용

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/requirements.txt` | 수정 | Authlib==1.6.9 추가 |
| `backend/app/core/config.py` | 수정 | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI 추가 |
| `backend/app/schemas/user.py` | 수정 | GoogleLoginRequest 스키마 추가 |
| `backend/models.py` | 수정 | password, birth_date nullable=True 변경 |
| `backend/app/api/v1/auth.py` | 수정 | POST /auth/google 엔드포인트 추가 |

## 완료 체크리스트

- [ ] `docker exec fastapi-server pytest tests/test_google_auth.py -v` 11개 모두 통과
- [ ] `docker exec fastapi-server pytest tests/` 기존 테스트 회귀 없음
- [ ] `POST /api/v1/auth/google` 엔드포인트가 Swagger(`/docs`)에서 확인된다
- [ ] DB에서 구글 로그인 신규 유저의 password 컬럼이 NULL로 저장된다
