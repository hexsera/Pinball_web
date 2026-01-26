# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Docker 기반의 핀볼 게임 웹 플랫폼. Traefik(리버스 프록시), Nginx(웹 서버), React(프론트엔드), FastAPI(백엔드 API), MySQL(데이터베이스)로 구성.

도메인: hexsera.com (HTTPS, Let's Encrypt + Cloudflare DNS Challenge)

## 주요 명령어

### Docker 전체 실행
```bash
docker compose up -d
docker compose down
docker compose logs -f [service_name]
```

### React 개발 (./react/main/)
```bash
cd react/main
npm install
npm run start    # 개발 서버 (Vite)
npm run build    # 프로덕션 빌드 → dist/
```

### FastAPI 개발 (./fastapi/)
FastAPI는 Docker 내부에서 실행됨. 로컬 테스트:
```bash
cd fastapi
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API 문서 확인: `http://localhost:8000/docs` (Swagger UI)

### 볼륨 관리
```bash
# 볼륨 백업
docker run --rm -v html-data-volume:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .

# 볼륨 복원
docker run --rm -v html-data-volume:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /data
```

## 아키텍처

```
인터넷 → Traefik(:80/:443) → Nginx(:80) → React 정적 파일
                           → FastAPI(:8000) → /api/* 경로
                           → MySQL(:3306)
```

## React 구조 (./react/main/src/)

- **App.jsx**: 라우팅 설정 및 AuthProvider 래핑
- **AuthContext.jsx**: 전역 인증 상태 (login, logout, isLoggedIn)
- **Dashboard.jsx**: 메인 대시보드 (Material-UI 사이드바/상단바, 알람 아이콘 클릭 시 /admin 이동, '게임하기' 클릭 시 메인 영역에 Pinball 표시)
- **Login.jsx**: 로그인 페이지 (FastAPI 연동, axios 기반 인증)
- **Register.jsx**: 회원가입 페이지 (단계별 폼, FastAPI POST /api/v1/users)
- **Pinball.jsx**: Matter.js 물리 엔진 핀볼 게임 (플리퍼, 각도 제한, 배경음악, 모바일 터치 입력, Flexbox 중앙 정렬)
- **UserInfo.jsx**: 회원정보 페이지 (조회/수정/삭제)
- **admin/AdminPage.jsx**: Admin 메인 페이지 (사이드바, 헤더, 메인 조합)
- **admin/AdminSidebar.jsx**: Admin 사이드바 (270px, 임시 이미지)
- **admin/AdminHeader.jsx**: Admin 헤더 (상단 고정)
- **admin/AdminMain.jsx**: Admin 메인 콘텐츠 영역 (임시 이미지)

라우팅: `/` → Dashboard, `/login` → Login, `/Register` → Register, `/Pinball_test` → Pinball (독립 페이지), `/admin` → AdminPage

**Dashboard 내 UserInfo 통합**:
- 사이드바 '계정' 클릭 → Dashboard 메인 영역에 UserInfo 컴포넌트 표시 (URL 변경 없음)
- 로그인 상태가 아니면 /login으로 리다이렉트
- showUserInfo 상태로 조건부 렌더링

**Dashboard 내 Pinball 통합**:
- 사이드바 '게임하기' 클릭 → Dashboard 메인 영역에 Pinball 컴포넌트 표시 (URL 변경 없음)
- '메인페이지' 클릭 → 기존 Dashboard 콘텐츠로 복귀
- showPinball 상태로 조건부 렌더링

## Docker 서비스 구성

| 서비스 | 이미지 | 포트 | 볼륨 |
|--------|--------|------|------|
| traefik | traefik:latest | 80, 443 | docker.sock, traefik.yml, acme.json |
| nginx | nginx:latest | 내부 80 | nginx.conf, html-data-volume |
| fastapi | 빌드 (./fastapi) | 8000 | ./fastapi:/code (전체 폴더 마운트) |
| mysql | mysql:8.0 | 3306 | mysql-data |

## 배포 흐름

1. React 빌드: `npm run build` (dist/ 생성)
2. dist/ 내용을 html/ 폴더로 복사
3. html/ 내용을 html-data-volume에 전송
4. Nginx가 볼륨의 파일 서비스
5. Traefik이 HTTPS로 외부 노출

## 주요 설정 파일

- `docker-compose.yml`: 전체 서비스 정의
- `traefik.yml`: Traefik 설정 (SSL, 라우팅)
- `nginx.conf`: Nginx 서버 설정
- `fastapi/Dockerfile`: FastAPI 컨테이너 빌드
- `react/main/vite.config.js`: Vite 빌드 설정

## FastAPI 구조 (./fastapi/)

- **main.py**: FastAPI 애플리케이션 엔트리포인트, User CRUD, Login API, Score API 엔드포인트, Pydantic 스키마, Base.metadata.create_all()로 테이블 자동 생성, Data Seeding 실행
- **database.py**: SQLAlchemy 엔진 및 세션 설정, get_db() 의존성, wait_for_db() 재시도 로직, SessionLocal 세션 팩토리
- **models.py**: SQLAlchemy ORM 모델 (User, Score 테이블 정의)
- **auth.py**: API Key 인증 의존성 (verify_api_key 함수, APIKeyHeader 사용)
- **seed.py**: Data Seeding 함수 (seed_admin - Admin 계정 자동 생성)
- **schemas.py**: Pydantic 스키마 (요청/응답 검증) - 미구현 (현재 main.py에 포함)
- **alembic/**: 데이터베이스 마이그레이션 디렉토리
  - **env.py**: Alembic 환경 설정 (Base.metadata 연결, 환경변수 로드)
  - **versions/**: 마이그레이션 파일 저장 디렉토리
- **alembic.ini**: Alembic 설정 파일
- **.env**: 환경변수 파일 (DB 연결 정보, Admin 계정 정보)

### FastAPI 의존성 (requirements.txt)
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
pymysql==1.1.0
cryptography
python-dotenv
alembic==1.13.1
```

## FastAPI 엔드포인트

| 메서드 | 경로 | 설명 | 인증 | 상태 코드 |
|--------|------|------|------|----------|
| GET | /api/ | 헬스 체크 | 불필요 | 200 |
| GET | /api/test | API 상태 확인 | 불필요 | 200 |
| POST | /api/v1/users | 범용 사용자 생성 (role 지정 가능, DB 저장) | API Key 필요 | 200 |
| GET | /api/v1/users | 전체 회원 조회 (배열 반환) | API Key 필요 | 200 |
| GET | /api/v1/users/{user_id} | 특정 회원 조회 | API Key 필요 | 200, 404 |
| PUT | /api/v1/users/{user_id} | 회원 정보 수정 (부분 수정 지원) | API Key 필요 | 200, 400, 404 |
| DELETE | /api/v1/users/{user_id} | 회원 삭제 | API Key 필요 | 200, 404 |
| POST | /api/v1/login | 로그인 (이메일/비밀번호 검증) | 불필요 | 200, 401 |
| POST | /api/v1/register | 일반 회원가입 (role='user' 고정, DB 저장) | 불필요 | 201, 400 |
| POST | /api/v1/scores | 점수 기록 생성 (user_id를 id로 사용) | 불필요 | 201, 500 |

### API Key 인증
- 헤더: `X-API-Key: hexsera-secret-api-key-2026`
- 인증 없음 → 401 Unauthorized
- 잘못된 키 → 403 Forbidden
- 구현 파일: `fastapi/auth.py` (APIKeyHeader 사용)
- 적용 엔드포인트: POST/GET/PUT/DELETE /api/v1/users
- 미적용 엔드포인트: POST /api/v1/login, POST /api/v1/register, POST /api/v1/scores

## MySQL 테이블

### users 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | int (AUTO_INCREMENT) | 고유 번호 (PRIMARY KEY, INDEX) |
| email | varchar(255) | 이메일 (UNIQUE INDEX) |
| nickname | varchar(100) | 닉네임 |
| password | varchar(255) | 비밀번호 (해싱 예정) |
| birth_date | date | 생년월일 |
| role | varchar(20) | 역할 (user, admin 등, 기본값: user) |

### scores 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | int (PRIMARY KEY) | 점수 기록 고유 번호 (user_id 값 사용, INDEX) |
| user_id | int | 사용자 ID (INDEX) |
| score | int | 획득 점수 (INDEX) |
| created_at | datetime | 기록 생성 시각 (DEFAULT: CURRENT_TIMESTAMP, INDEX) |

**특징**:
- user_id를 id(PRIMARY KEY)로 사용하여 한 사용자당 하나의 점수만 저장
- User 테이블과 독립적 (외래키 없음, 비회원도 점수 저장 가능)
- 동일 user_id로 재저장 시 PRIMARY KEY 충돌 (IntegrityError)
- func.now()로 DB 서버 시간 자동 기록

### alembic_version 테이블
Alembic이 자동으로 생성하는 마이그레이션 버전 관리 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| version_num | varchar(32) | 현재 적용된 마이그레이션 버전 ID (PRIMARY KEY) |

## MySQL 연결 정보

| 항목 | 값 |
|------|-----|
| 호스트 | localhost (외부) / mysql-server (Docker 내부) |
| 포트 | 3306 |
| 데이터베이스 | hexdb |
| 사용자 | hexsera |
| 비밀번호 | hexpoint |
| 루트 비밀번호 | hexrootpoint |

### MySQL 관리
```bash
# MySQL 컨테이너만 실행
docker compose up -d mysql

# MySQL 접속 (CLI)
docker exec -it mysql-server mysql -u hexsera -phexpoint hexdb

# 테이블 구조 확인
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "DESCRIBE users;"

# 인덱스 확인
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "SHOW INDEX FROM users;"
```

### Alembic 마이그레이션 관리
```bash
# 마이그레이션 파일 생성 (autogenerate)
docker exec fastapi-server alembic revision --autogenerate -m "설명"

# 마이그레이션 적용 (최신 버전으로)
docker exec fastapi-server alembic upgrade head

# 현재 마이그레이션 버전 확인
docker exec fastapi-server alembic current

# 이전 버전으로 롤백 (1단계)
docker exec fastapi-server alembic downgrade -1

# 마이그레이션 히스토리 확인
docker exec fastapi-server alembic history
```

## SQLAlchemy 사용 패턴

### database.py 설정
```python
import os
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DATABASE')}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def wait_for_db(max_retries=10, delay=2):
    """DB 연결 대기 함수 (재시도 로직)"""
    retries = 0
    while retries < max_retries:
        try:
            engine.connect()
            print("Database connected successfully")
            return True
        except Exception as e:
            retries += 1
            print(f"Database connection failed (attempt {retries}/{max_retries}): {e}")
            if retries < max_retries:
                time.sleep(delay)
    return False
```

### models.py 설정
```python
from sqlalchemy import Column, Integer, String, Date
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nickname = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    birth_date = Column(Date, nullable=False)
    role = Column(String(20), nullable=False, default='user')
```

### 엔드포인트에서 사용
```python
from sqlalchemy.orm import Session
from fastapi import Depends

@app.post("/api/v1/users")
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
```

## 주요 개발 패턴

### FastAPI User CRUD 및 Login API

**Pydantic 스키마** (main.py에 정의):
```python
class UserCreateRequest(BaseModel):
    """범용 사용자 생성 요청 (role 포함)"""
    email: str
    nickname: str
    password: str
    birth_date: date
    role: str

class UserRegisterRequest(BaseModel):
    """일반 회원가입 요청 (role 제외)"""
    email: str
    nickname: str
    password: str
    birth_date: date

class UserUpdateRequest(BaseModel):
    """사용자 수정 요청 (모든 필드 선택적)"""
    email: Optional[str] = None
    nickname: Optional[str] = None
    password: Optional[str] = None
    birth_date: Optional[date] = None
    role: Optional[str] = None

class UserResponse(BaseModel):
    """사용자 응답 (password 제외)"""
    id: int
    email: str
    nickname: str
    birth_date: date
    role: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    """로그인 요청"""
    email: str
    password: str

class LoginResponse(BaseModel):
    """로그인 응답"""
    message: str
    user_id: int
    email: str
    nickname: str

class DeleteResponse(BaseModel):
    """삭제 응답"""
    message: str
    deleted_user_id: int
```

**주요 엔드포인트 구현**:

1. **사용자 생성** (POST /api/v1/users):
```python
@app.post("/api/v1/users", response_model=UserResponse)
def create_user(
    user: UserCreateRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    # 이메일 중복 검증
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # DB에 사용자 저장
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
```

2. **회원가입** (POST /api/v1/register):
```python
@app.post("/api/v1/register", response_model=UserResponse, status_code=201)
def register_user(user: UserRegisterRequest, db: Session = Depends(get_db)):
    # 이메일 중복 검증 + DB 저장 (role='user' 고정)
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_user = User(**user.dict(), role="user")
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
```

3. **로그인** (POST /api/v1/login):
```python
@app.post("/api/v1/login", response_model=LoginResponse)
def login(login_request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_request.email).first()
    if not user or user.password != login_request.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return LoginResponse(
        message="Login successful",
        user_id=user.id,
        email=user.email,
        nickname=user.nickname
    )
```

4. **사용자 수정** (PUT /api/v1/users/{user_id}):
```python
@app.put("/api/v1/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdateRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User with id {user_id} not found")

    # 이메일 변경 시 중복 검증
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    # 수정할 필드만 업데이트
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
```

**특징**:
- 이메일 중복 검증 (400 Bad Request)
- SQLAlchemy Session을 사용한 DB CRUD 작업
- API Key 인증 (POST/GET/PUT/DELETE /api/v1/users)
- 응답에서 password 제외하여 보안 강화
- 부분 수정 지원 (UserUpdateRequest의 Optional 필드)
- 회원가입 성공 시 201 Created 반환
- 로그인 실패 시 401 Unauthorized 반환

### FastAPI Score API

**Pydantic 스키마** (main.py에 정의):
```python
from datetime import datetime
from models import Score

class ScoreCreateRequest(BaseModel):
    """점수 기록 생성 요청"""
    user_id: int
    score: int

class ScoreResponse(BaseModel):
    """점수 기록 응답"""
    id: int
    user_id: int
    score: int
    created_at: datetime

    class Config:
        from_attributes = True

class ScoreListResponse(BaseModel):
    """점수 기록 목록 응답"""
    scores: List[ScoreResponse]
    total: int
```

**주요 엔드포인트 구현**:

1. **점수 기록 생성** (POST /api/v1/scores):
```python
@app.post("/api/v1/scores", response_model=ScoreResponse, status_code=201)
def create_score(score_data: ScoreCreateRequest, db: Session = Depends(get_db)):
    """점수 기록 생성 (user_id를 id로 사용)"""
    # user_id를 id로 설정하여 점수 기록 생성
    db_score = Score(
        id=score_data.user_id,
        user_id=score_data.user_id,
        score=score_data.score
    )
    db.add(db_score)
    db.commit()
    db.refresh(db_score)
    return db_score
```

**API 사용 예시**:
```bash
# 점수 기록 생성
curl -X POST "http://localhost:8000/api/v1/scores" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 15000}'

# 응답 (201 Created)
{
  "id": 1,
  "user_id": 1,
  "score": 15000,
  "created_at": "2026-01-26T09:37:01"
}
```

**특징**:
- user_id를 Score.id(PRIMARY KEY)로 명시적 설정
- 한 사용자당 하나의 점수만 저장 가능 (PRIMARY KEY 제약)
- 동일 user_id로 재저장 시 IntegrityError (Duplicate entry for key 'scores.PRIMARY')
- User 테이블과 독립적 (외래키 없음, 비회원도 점수 저장 가능)
- func.now()로 DB 서버 시간 자동 기록
- 인증 불필요 (게임 플레이 중 원활한 저장)
- 201 Created 상태 코드 반환

**데이터베이스 구조**:
```sql
CREATE TABLE scores (
  id INT PRIMARY KEY,                    -- user_id 값이 여기에 저장됨
  user_id INT NOT NULL,                  -- 동일한 값 저장
  score INT NOT NULL,                    -- 획득 점수
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 기록 시각
  INDEX ix_scores_id (id),
  INDEX ix_scores_user_id (user_id),
  INDEX ix_scores_score (score),
  INDEX ix_scores_created_at (created_at)
);
```

**설계 결정**:
- **최고 점수 갱신 구조**: user_id를 id로 사용하여 한 사용자당 하나의 점수만 유지
- **확장 가능성**: UPDATE 쿼리로 최고 점수 갱신 기능 추가 가능
- **인덱스 최적화**: user_id, score, created_at 모두 인덱스 설정 (조회 성능 향상)

### React 회원가입 (Register.jsx)
- 3단계 폼: 이메일/닉네임 → 비밀번호 → 생년월일
- 날짜 형식: `padStart(2, '0')`로 YYYY-MM-DD 형식 보장
- axios POST /api/v1/register 사용 예정 (현재는 /api/v1/users)

### React 로그인 (Login.jsx)
- axios POST /api/v1/login
- 성공: AuthContext의 login() 호출, 메인페이지 이동
- 실패: loginError 상태로 Alert 표시
- **중요**: FastAPI LoginResponse는 `user_id` 필드를 반환하므로 `response.data.user_id` 사용
- localStorage에 `{ id: user_id, name: nickname }` 형식으로 저장

### React 회원정보 (UserInfo.jsx)
- 3개 섹션: 회원 정보 영역, 회원 수정 영역, 회원 탈퇴 영역
- useEffect로 FastAPI GET /api/v1/users/{user_id} 호출하여 회원 정보 조회
- axios 헤더에 X-API-Key: "hexsera-secret-api-key-2026" 포함
- console.log로 API 호출 상태 디버깅 (시작/성공/실패)
- user.id가 undefined이면 fetchUserInfo() 호출 안 됨 (`if (user && user.id)` 조건)
- 표시 항목: 이메일, 닉네임, 생년월일
- 색상 체계: Dashboard와 동일 (#F9FAFB 배경, #ffffff 카드, #e5e7eb 보더)

### Admin 페이지 (admin/)

**구조**:
- AdminPage.jsx: 전체 레이아웃 (`display: 'flex'`로 3개 컴포넌트 조합)
- AdminSidebar.jsx: 좌측 사이드바 (Drawer, 270px 너비)
- AdminHeader.jsx: 상단 헤더 (AppBar, position="fixed")
- AdminMain.jsx: 메인 콘텐츠 (flexGrow: 1, 배경색 #F9FAFB)

**색상 체계**:
- 배경: #ffffff (흰색)
- 텍스트: #1f2937 (진회색)
- 보더: #e5e7eb (연한 회색)
- 메인 배경: #F9FAFB (라이트 그레이)

**시맨틱 HTML**:
- AdminMain: `component="main"` (주요 콘텐츠 영역)
- AdminSidebar: `component="nav"` (네비게이션 영역)

**이미지 표시**:
- CardMedia 컴포넌트 사용
- AdminMain: `objectFit: 'contain'` (비율 유지, 전체 표시)
- AdminSidebar: `objectFit: 'contain'`, `width: 100%`, `height: auto` (가로 기준 비율 조절)

**접근**:
- Dashboard.jsx의 알람(Notifications) 아이콘 클릭 시 `/admin`으로 이동
- 라우트: `/admin` → AdminPage

### Pinball 게임 (Pinball.jsx)

**게임 설정**:
- 중력: gravity.y = 1 (지구 중력과 유사)
- 공 초기 위치: (350, 100)
- 플리퍼 위치: 화면 하단 (y: 1150)

**플리퍼 제어**:
- 키보드: 좌/우 화살표키로 플리퍼 조작
- 모바일: 화면 좌/우 터치로 플리퍼 조작
- 각도 제한: 왼쪽(-35도~-15도), 오른쪽(15도~35도)
- 키 누름 상태 변수 (`isLeftKeyPressed`, `isRightKeyPressed`)
- beforeUpdate 이벤트로 매 프레임 속도 제어 및 각도 제한

**플리퍼 각속도 제어 방식** (중요):
```javascript
// 왼쪽 플리퍼
if (isLeftKeyPressed) {
  Body.setAngularVelocity(leftFlipper, -FLIPPER_SPEED);  // 반시계방향
} else {
  Body.setAngularVelocity(leftFlipper, FLIPPER_SPEED);   // 시계방향 복귀
}

// 각도 제한 (별도 처리)
if (leftFlipper.angle < LEFT_FLIPPER_MIN_ANGLE) {
  Body.setAngle(leftFlipper, LEFT_FLIPPER_MIN_ANGLE);
}
if (leftFlipper.angle > LEFT_FLIPPER_MAX_ANGLE) {
  Body.setAngle(leftFlipper, LEFT_FLIPPER_MAX_ANGLE);
}
```

**주의사항**:
- 각속도는 항상 일정한 값으로 설정 (조건부 0 설정 금지)
- 각도 제한은 `Body.setAngle()`만으로 처리
- 각속도를 조건부로 0으로 설정하면 각도 제한 경계에서 진동 발생
- `setAngle()`과 `setAngularVelocity()`는 독립적으로 작동

**Matter.js Bodies**:
- leftFlipper, rightFlipper: 플리퍼 (Constraint로 회전축 고정, density: 0.001, isSleeping: false, sleepThreshold: Infinity)
- ball: 핀볼 공 (restitution: 0.8, friction: 0, frictionAir: 0)
- obstacle1, obstacle2: 장애물
- ground, leftWall, rightWall, upWall: 게임 경계

**Constraint 설정**:
- stiffness: 1 (단단한 회전축)
- damping: 0 (각속도 감쇠 없음)
- length: 0 (회전축으로 작동)
- pointA: 플리퍼의 회전축 위치 (왼쪽: {x: -40, y: 0}, 오른쪽: {x: 40, y: 0})

**주요 상수**:
- FLIPPER_SPEED: 0.3 (플리퍼 회전 속도)
- LEFT_FLIPPER_MIN_ANGLE: -35° (-35 * Math.PI / 180)
- LEFT_FLIPPER_MAX_ANGLE: -15° (-15 * Math.PI / 180)
- RIGHT_FLIPPER_MIN_ANGLE: 15° (15 * Math.PI / 180)
- RIGHT_FLIPPER_MAX_ANGLE: 35° (35 * Math.PI / 180)

**레이아웃 및 스타일**:
- 캔버스 크기: 700px × 1200px
- transform scale: xs/sm (0.5배), md (0.8배)
- transformOrigin: 'top center' (중앙 기준 스케일 조정)
- 최상위 Box: Flexbox 중앙 정렬 (display: flex, flexDirection: column, alignItems: center)
- 음악 시작 버튼과 게임 캔버스 모두 수평 중앙 정렬

**배경이미지 처리**:
- Matter.js Render 옵션의 background: 'transparent'로 설정
- 캔버스를 감싸는 Box에 MUI sx prop으로 배경이미지 적용
- backgroundImage: 'url(/images/pinball_back.png)'
- backgroundSize: '100% 100%' (캔버스 크기에 정확히 맞춤)
- backgroundPosition: 'center', backgroundRepeat: 'no-repeat'
- Box 크기를 캔버스 크기(700×1200)와 동일하게 지정
- 결과: 배경이미지 위에 투명한 Matter.js 캔버스가 렌더링되어 게임 오브젝트 표시

**알려진 이슈**:
- CSS transform scale은 시각적으로만 축소하고 DOM 레이아웃 공간은 원본 크기 유지
- 불필요한 스크롤 방지를 위해 Box에 height 명시 필요 (예: height: { xs: '600px', md: '960px' })

## 상세 문서

### ./READMD/
각 스택별 상세 문서:
- docker.md
- traefik.md
- nginx.md
- react.md
- postgres.md

### ./PRD/
기능 명세 및 실행 계획 문서:

**FastAPI 관련**:
- SQLAlchemy-사용방법과-작동과정.md
- SQLAlchemy-주요개념-질문답변.md
- login-api-연동.md
- user-crud-mysql.md
- fastapi-apikey-인증.md
- api-key-인증-테스트.md
- API-Key-인증방식-설명.md
- Security-APIKeyHeader-설명.md
- 일반회원-회원가입-엔드포인트.md: 회원가입 엔드포인트 구현 (POST /api/v1/users, POST /api/v1/register)
- fastapi-bootstrapping.md: FastAPI 부트스트랩 구현 (Docker, MySQL 연결, 재시도 로직)
- FastAPI-부트스트랩-과정-설명.md: 일반적인 부트스트랩 10단계 설명
- fastapi-데이터베이스-마이그레이션.md: Alembic 마이그레이션 PRD
- data-seeding-구현.md: Data Seeding 구현 PRD (Admin 계정 자동 생성)

**Alembic 학습 문서**:
- Alembic이란-무엇인가.md: Alembic 개념 및 역할 설명 (초보자용)
- Alembic-초기-구축-과정.md: Alembic 초기 구축 단계별 가이드
- Alembic-context-config와-target-metadata-설명.md: context.config와 target_metadata 상세 설명
- SQLAlchemy-Alembic-MySQL-최초실행-동작과정.md: 최초 실행 시 전체 동작 흐름
- 부트스트랩-자동-마이그레이션과-create-all-설명.md: Base.metadata.create_all vs Alembic 비교
- Base-metadata-create-all-테스트-방법.md: create_all 테스트 가이드

**Pinball 게임 관련**:
- pinball-중력적용.md: 중력 설정 및 공 물리 구현
- pinball-모바일터치입력.md: 모바일 터치 입력 구현
- pinball-플리퍼추가.md: 플리퍼 추가 및 Constraint 설정
- pinball-플리퍼각도제한.md: 플리퍼 각도 제한 구현
- pinball-플리퍼-sleeping-문제해결.md: 플리퍼 sleeping 모드 문제 해결 (실패)
- 플리퍼-진동문제-해결-분석.md: 플리퍼 진동 문제 원인 분석 및 해결 방법
- dashboard-pinball-통합.md: Dashboard 내 Pinball 게임 통합 (URL 변경 없이 메인 영역에 표시)
- dashboard-pinball-가운데정렬.md: Pinball 게임 가운데 정렬 (Flexbox, transformOrigin)
- pinball-배경이미지-크기조정.md: 배경이미지를 캔버스 크기에 맞춰 늘리기 (MUI Box sx 방식)

**Matter.js 학습 문서**:
- Matter.js-Engine.create-설정.md: Engine.create 속성 설명 (gravity, enableSleeping 등)
- Matter.js-Bodies-속성.md: Bodies 생성 함수 및 속성 설명
- Matter.js-Constraint-속성.md: Constraint 속성 상세 설명 (stiffness, damping 등)

**Admin 페이지 관련**:
- admin-메인페이지.md: Admin 메인 페이지 구현 (사이드바, 헤더, 메인)
- admin-임시이미지-추가.md: Admin 페이지 임시 이미지 추가

**회원정보 페이지 관련**:
- 회원정보-페이지.md: 회원정보 페이지 PRD (조회/수정/삭제)
- 회원정보-페이지-실행계획.md: 회원정보 페이지 실행 계획
- 회원정보-표시항목-확장.md: 이메일, 닉네임, 생년월일 표시 PRD
- 회원정보-API-연동.md: FastAPI GET /api/v1/users/{user_id} 연동 PRD
- undefined-user-id-문제.md: user.id가 undefined일 때 문제 분석

**학습 문서**:
- env-파일-보안-관리.md: .env 파일에 민감한 정보를 저장하는 이유와 관리 방법
- env-파일이란.md: .env 파일의 일반적인 개념과 역할 설명

**업무일지**:
- 2026-01-20_업무일지.md: 중력 적용 작업 일지
- 2026-01-20_업무일지2.md: 플리퍼 진동 문제 해결 작업 일지
- 2026-01-21_업무일지.md: Admin 메인 페이지 구현 작업 일지
- 2026-01-21_업무일지2.md: FastAPI 부트스트랩 구현 작업 일지
- 2026-01-22_업무일지.md: 회원가입 엔드포인트 구현 작업 일지
- 2026-01-22_업무일지3.md: 데이터베이스 마이그레이션 및 Base.metadata.create_all 구현 작업 일지
- 2026-01-23_업무일지.md: Data Seeding 구현 작업 일지 (Admin 계정 자동 생성)
- 2026-01-23_업무일지2.md: Dashboard 내 Pinball 통합 및 가운데 정렬 작업 일지
- 2026-01-24_업무일지.md: Pinball 배경이미지 크기 조정 작업 일지 (MUI Box sx 방식)
- 2026-01-25_업무일지.md: UserInfo.jsx API 연동 및 Login.jsx 버그 수정 작업 일지

## 알려진 이슈

### 플리퍼 진동 문제 (해결됨)
**문제**: 플리퍼가 각도 제한에 도달한 후 비틀림 진동 발생

**원인**: 각도 제한 도달 시 조건부 각속도 설정
```javascript
// 잘못된 코드
if (leftFlipper.angle < LEFT_FLIPPER_MAX_ANGLE) {
  Body.setAngularVelocity(leftFlipper, FLIPPER_SPEED);
} else {
  Body.setAngularVelocity(leftFlipper, 0);  // ← 진동 원인
}
```

**해결**: 조건 없이 항상 일정한 각속도 설정
```javascript
// 올바른 코드
Body.setAngularVelocity(leftFlipper, FLIPPER_SPEED);
```

**원리**:
- `Body.setAngle()`과 `Body.setAngularVelocity()`는 독립적으로 작동
- 각도 제한은 `setAngle()`만으로 충분
- 조건부 각속도 설정은 경계에서 진동 유발

**참고**: PRD/플리퍼-진동문제-해결-분석.md

### Pinball.jsx 스크롤 및 레이아웃 문제
**문제**:
- Pinball 게임에 불필요한 세로 공간이 생김
- 모바일 환경에서 모바일 크기보다 오른쪽 공백 생김
- 모바일 환경에서 사이드바가 화면을 많이 가림

**원인**:
- CSS `transform: scale()`은 시각적으로만 축소
- DOM의 레이아웃 공간은 원본 크기(700×1200) 유지
- scale(0.8) 적용 시 표시는 560×960이지만 DOM은 700×1200 공간 차지

**해결 방안**:
```javascript
<Box sx={{
  transform: { xs: 'scale(0.5)', sm: 'scale(0.5)', md: 'scale(0.8)' },
  transformOrigin: 'top center',
  height: { xs: '600px', sm: '600px', md: '960px' }  // 1200 * scale
}}>
```

### 현재 남은 문제
1. **공 과도한 반발**: 플리퍼가 계속 회전하려 하는 상태에서 공이 닿으면 과도하게 튕김
   - 원인: 각도 제한 + 지속적 회전력 = 고무줄 효과
   - 해결 필요
2. **사이드바 접기 기능**: 모바일 환경에서 사이드바가 화면을 많이 가림
3. **핀볼 충돌 효과음**: 핀볼이 벽/장애물에 튕길 때 소리 추가 필요
4. **음악 시작 버튼 디자인**: 현재 기본 Material-UI 버튼, 개선 필요

## Matter.js 작동 원리 (중요)

### Bodies와 Constraint의 관계
1. Bodies는 기본적으로 자기 중심축 기준으로 회전
2. Constraint는 Bodies의 특정 위치(pointA)를 고정점(pointB)에 고정
3. Bodies는 중심 기준 회전하려 하지만 Constraint로 인해 방해받음
4. 결과적으로 Bodies는 Constraint의 고정점을 중심으로 회전

### setAngle()과 Constraint의 충돌
1. `Body.setAngle()`은 Bodies를 중심축 기준으로 회전시킴
2. 회전 시 Constraint의 pointA 위치가 변경됨
3. Constraint가 pointA를 다시 pointB에 맞추려고 보정력 적용
4. 보정 과정에서 예상치 못한 힘이 발생할 수 있음

### 디버깅 팁
- console.log로 angle, angularVelocity, position 확인
- Matter.js는 물리 시뮬레이션이므로 정확한 예측이 어려움
- 웹 디버깅 MCP 설치 권장

## 데이터베이스 마이그레이션

### Alembic 사용

프로젝트에서는 Alembic을 사용하여 데이터베이스 스키마를 버전 관리합니다.

**마이그레이션 파일 생성**:
```bash
docker exec fastapi-server alembic revision --autogenerate -m "설명"
```

models.py의 변경사항을 자동으로 감지하여 마이그레이션 파일을 생성합니다.

**마이그레이션 적용**:
```bash
docker exec fastapi-server alembic upgrade head
```

생성된 마이그레이션 파일을 실제 데이터베이스에 적용합니다.

### Base.metadata.create_all()

FastAPI 시작 시 자동으로 테이블을 생성하는 기능도 구현되어 있습니다 (main.py).

```python
from database import wait_for_db, engine, Base
from models import User

if not wait_for_db():
    raise Exception("Database connection failed after retries")

# 모든 테이블 생성 (존재하지 않는 경우에만)
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully")
```

**특징**:
- 테이블이 없으면 자동 생성
- 테이블이 이미 존재하면 무시 (스키마 변경 불가)
- 개발 환경에서 편의성 제공
- 프로덕션에서는 Alembic 사용 권장

**Alembic vs create_all**:
| 항목 | Alembic | create_all |
|------|---------|-----------|
| 변경 이력 | 파일로 관리 | 없음 |
| 스키마 변경 | 가능 | 불가능 |
| 롤백 | 가능 | 불가능 |
| 사용 시점 | 프로덕션 | 개발/테스트 |

## Data Seeding

### 개요

FastAPI 애플리케이션 시작 시 초기 데이터를 자동으로 생성합니다. 현재는 Admin 계정만 자동 생성됩니다.

### 실행 흐름

```python
from database import SessionLocal
from seed import seed_admin

# Data Seeding
print("Starting data seeding...")
db = SessionLocal()
try:
    seed_admin(db)
finally:
    db.close()
print("Data seeding completed")
```

### seed_admin 함수 (seed.py)

```python
import os
from datetime import datetime
from sqlalchemy.orm import Session
from models import User
from dotenv import load_dotenv

load_dotenv()

def seed_admin(db: Session) -> bool:
    """Admin 계정 시딩. 생성 시 True, 이미 존재 시 False 반환"""
    admin_email = os.getenv("ADMIN_EMAIL")

    # Admin 계정 존재 여부 확인
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    if existing_admin:
        print(f"Admin account already exists: {admin_email}")
        return False

    # Admin 계정 생성
    admin_user = User(
        email=admin_email,
        nickname=os.getenv("ADMIN_NICKNAME"),
        password=os.getenv("ADMIN_PASSWORD"),
        birth_date=datetime.strptime(os.getenv("ADMIN_BIRTH_DATE"), "%Y-%m-%d").date(),
        role="admin"
    )
    db.add(admin_user)
    db.commit()
    print(f"Admin account created: {admin_email}")
    return True
```

### 환경변수 설정 (.env)

```
# Admin Account Seed Data
ADMIN_EMAIL=admin@hexsera.com
ADMIN_NICKNAME=admin
ADMIN_PASSWORD=admin_secure_password_2026
ADMIN_BIRTH_DATE=2000-01-01
```

### 특징

- 중복 생성 방지: Admin 계정이 이미 존재하면 스킵
- 환경변수 기반: .env 파일에서 Admin 계정 정보 로드
- 안전한 세션 관리: try-finally로 DB 세션 보장
- 명확한 로그: 생성/존재 여부를 콘솔에 출력

### 테스트

```bash
# 컨테이너 재시작하여 Data Seeding 실행
docker compose restart fastapi

# 로그 확인
docker compose logs fastapi

# DB에서 Admin 계정 확인
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "SELECT id, email, nickname, role FROM users WHERE role='admin';"
```

## 현재 남은 문제점 (FastAPI)

### 1. 코드 중복
- POST /api/v1/users와 POST /api/v1/register가 거의 동일한 로직 반복
- 이메일 중복 검증 로직 중복
- DB 저장 로직 중복
- 향후 비밀번호 해싱 추가 시 두 곳 모두 수정 필요
- 해결: 서비스 레이어 도입 (SRP 적용) - 사용자 요청으로 롤백됨

### 2. 비밀번호 평문 저장
- 현재: password를 그대로 DB에 저장
- 보안 취약: DB 유출 시 모든 비밀번호 노출
- 해결 필요: bcrypt 또는 passlib로 해싱

### 3. API Key 하드코딩
- auth.py에 API Key가 하드코딩됨
- 환경변수로 이동 필요 (.env 파일)

## 완료된 작업

### FastAPI
- ✅ Data Seeding 구현 (Admin 계정 자동 생성)
- ✅ .env 파일에 Admin 계정 정보 환경변수 추가
- ✅ seed.py 파일 생성 및 seed_admin 함수 구현
- ✅ 중복 생성 방지 로직 구현
- ✅ Score 모델 구현 (models.py에 Score 클래스 추가)
- ✅ Score API 구현 (POST /api/v1/scores)
- ✅ user_id를 PRIMARY KEY(id)로 사용하여 한 사용자당 하나의 점수만 저장
- ✅ scores 테이블 생성 (id, user_id, score, created_at)

### React / Dashboard
- ✅ Dashboard 내 Pinball 게임 통합 (URL 변경 없이 메인 영역에 표시)
- ✅ Pinball 게임 가운데 정렬 (Flexbox 중앙 정렬)
- ✅ transformOrigin을 'top center'로 변경하여 중앙 기준 스케일 조정
- ✅ '게임하기' 클릭 시 Dashboard 메인 영역에 Pinball 표시
- ✅ '메인페이지' 클릭 시 기존 Dashboard 콘텐츠로 복귀
- ✅ Dashboard 내 UserInfo 통합 (URL 변경 없이 메인 영역에 표시)
- ✅ '계정' 클릭 시 Dashboard 메인 영역에 UserInfo 표시

### React / Pinball
- ✅ Pinball 배경이미지 크기 조정 (MUI Box sx 방식)
- ✅ Matter.js Render background를 'transparent'로 변경
- ✅ Box 컴포넌트에 backgroundImage, backgroundSize: '100% 100%' 적용
- ✅ 배경이미지가 캔버스 전체(700×1200)를 채우도록 구현

### React / UserInfo
- ✅ UserInfo.jsx 생성 (회원 정보 조회/수정/삭제)
- ✅ FastAPI GET /api/v1/users/{user_id} API 연동
- ✅ X-API-Key 헤더 인증 구현
- ✅ console.log 디버깅 구현
- ✅ Login.jsx 버그 수정 (response.data.id → response.data.user_id)
- ✅ undefined user.id 문제 분석 문서 작성

## 다음 작업 (예정)

### FastAPI
- 점수 조회 API 구현 (GET /api/v1/scores/user/{user_id})
- 랭킹 조회 API 구현 (GET /api/v1/scores/ranking)
- 점수 갱신 기능 구현 (기존 점수보다 높을 때만 UPDATE)
- fastapi 실행시 로그 미출력 문제 해결
- schemas.py 생성: Pydantic 스키마 분리 (main.py에서 이동) - 선택 사항
- 비밀번호 해싱 구현 (passlib[bcrypt])
- API Key 환경변수화 (.env)

### React
- Pinball.jsx: Score API 연동 (게임 종료 시 점수 저장)
- 점수 조회 화면 구현 (사용자별 점수 확인)
- 랭킹 화면 구현 (전체 랭킹 Top 10)
- UserInfo.jsx: 회원 정보 수정 기능 구현 (PUT /api/v1/users/{user_id})
- UserInfo.jsx: 회원 탈퇴 기능 구현 (DELETE /api/v1/users/{user_id})
- API Key를 프론트엔드에서 제거하고 백엔드 전용 API로 변경
- 회원 정보 CRUD용 별도 엔드포인트 생성 (인증 토큰 기반)
- Register.jsx: POST /api/v1/register 연동 (상태 코드 201 확인)
- Pinball.jsx 스크롤 문제 해결 (Box에 height 명시)
- Dashboard 사이드바 접기 기능 구현 (모바일 대응)
- Pinball 충돌 효과음 추가
- 음악 시작 버튼 디자인 개선
