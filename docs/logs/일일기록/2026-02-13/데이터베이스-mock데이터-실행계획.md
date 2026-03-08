# 데이터베이스 Mock 데이터 실행계획

## 요구사항 요약

**요구사항**: `users` 테이블과 `monthly_scores` 테이블에 mock 데이터를 삽입하는 스크립트를 작성한다.

**목적**: 실제 서비스 환경과 유사한 데이터 상태를 만들어 기능 테스트 및 UI 확인을 가능하게 한다.

## 현재상태 분석

- `backend/seed.py`가 존재하지만 Admin 계정 1개만 생성하는 단순 시딩 파일
- mock 데이터 전용 디렉토리 구조 없음
- `requirements.txt`에 mock 데이터 생성 라이브러리 미포함
- User 모델: `id, user_id(UUID), email, nickname, password, birth_date, role`
- MonthlyScore 모델: `id, user_id(FK→users.id), nickname, score, created_at`
- password는 평문 그대로 저장, user_id는 UUID 자동 생성

## 구현 방법

Python 생태계 표준 mock 데이터 라이브러리인 **Faker**를 사용한다. SQLAlchemy 세션을 직접 사용해 데이터를 삽입하며, Docker 컨테이너 내부에서 실행한다. 디렉토리 구조는 `backend/scripts/` 하위에 배치하는 업계 표준 방식을 따른다.

## 구현 단계

### 1. 디렉토리 구조 생성

```
backend/
└── scripts/
    └── mock/
        ├── __init__.py
        └── seed_mock_data.py
```

- `scripts/`: 일회성 실행 스크립트 모음 (업계 표준 명칭)
- `scripts/mock/`: mock 데이터 전용 하위 디렉토리
- `__init__.py`: Python 패키지로 인식시키기 위한 빈 파일

### 2. requirements.txt에 Faker 추가

```text
Faker==24.0.0
```

- Faker: 이름, 이메일, 날짜 등 현실적인 가짜 데이터를 생성하는 Python 표준 라이브러리
- 버전 24.x는 Python 3.8+ 호환, 국제화(locale) 지원

### 3. seed_mock_data.py 작성 - User 생성

```python
from faker import Faker
import sys, os
sys.path.insert(0, '/code')

from app.db.session import SessionLocal
from models import User

fake = Faker('ko_KR')

def create_mock_users(db, count=50):
    users = []
    for _ in range(count):
        user = User(
            email=fake.unique.email(),
            nickname=fake.unique.user_name()[:20],
            password="password123!",
            birth_date=fake.date_of_birth(minimum_age=15, maximum_age=60),
            role='user'
        )
        db.add(user)
    db.commit()
    return users
```

- `Faker('ko_KR')`: 한국어 로케일로 현실적인 데이터 생성
- `fake.unique`: 중복 방지 (email, nickname은 UNIQUE 제약)
- `password="password123!"`: 평문 비밀번호를 그대로 저장 (mock 데이터 전용)
- `birth_date`: 15~60세 범위로 현실적인 나이 분포

### 4. seed_mock_data.py 작성 - MonthlyScore 생성

```python
from models import MonthlyScore
from datetime import datetime, timedelta
import random

def create_mock_monthly_scores(db, users):
    for user in users:
        days_ago = random.randint(0, 30)
        score = MonthlyScore(
            user_id=user.id,
            nickname=user.nickname,
            score=random.randint(1000, 59999),
            created_at=datetime.utcnow() - timedelta(days=days_ago)
        )
        db.add(score)
    db.commit()
```

- API의 upsert 로직과 동일하게 user_id당 MonthlyScore 레코드를 **정확히 1개**만 삽입
- `days_ago`: 최근 30일 이내로 제한 (이번 달 데이터로 리더보드 테스트 가능)
- `score`: 1,000~59,999 범위로 핀볼 게임 현실적인 점수 분포
- `nickname=user.nickname`: CLAUDE.md의 비정규화 설계 원칙 준수

### 5. main() 함수 및 실행 진입점 작성

```python
def main():
    db = SessionLocal()
    try:
        print("Mock 사용자 50명 생성 중...")
        users = create_mock_users(db, count=50)
        db.refresh를 통해 users 재조회 후
        print("Mock 월간 점수 생성 중...")
        create_mock_monthly_scores(db, users)
        print("완료!")
    except Exception as e:
        db.rollback()
        print(f"오류: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
```

- `try/except/finally`: DB 세션 안전하게 종료
- `db.rollback()`: 오류 발생 시 부분 삽입 방지
- `if __name__ == "__main__"`: 모듈 import 시 자동 실행 방지

### 6. Docker 컨테이너에서 실행

```bash
# requirements.txt 반영 후 컨테이너 재빌드
docker-compose build fastapi

# 컨테이너 시작
docker-compose up -d fastapi

# mock 데이터 스크립트 실행
docker-compose exec fastapi python scripts/mock/seed_mock_data.py
```

- `docker-compose build`: Faker 패키지 설치 반영
- `docker-compose exec fastapi`: 실행 중인 컨테이너 내부에서 실행 (DB 연결 환경변수 자동 적용)

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/requirements.txt` | 수정 | `Faker==24.0.0` 추가 (passlib 추가 불필요) |
| `backend/scripts/__init__.py` | 생성 | 빈 파일 (패키지 인식용) |
| `backend/scripts/mock/__init__.py` | 생성 | 빈 파일 (패키지 인식용) |
| `backend/scripts/mock/seed_mock_data.py` | 생성 | mock 데이터 생성 스크립트 |

## 완료 체크리스트

- [ ] `docker-compose exec fastapi python scripts/mock/seed_mock_data.py` 실행 시 오류 없이 완료 출력
- [ ] `SELECT COUNT(*) FROM users WHERE role='user';` 결과가 50 이상
- [ ] `SELECT COUNT(*) FROM monthly_scores;` 결과가 50 이상
- [ ] `SELECT * FROM monthly_scores LIMIT 5;`에서 nickname이 해당 user의 nickname과 일치
- [ ] 브라우저에서 월간 리더보드 페이지 접속 시 데이터가 표시됨
- [ ] 스크립트를 두 번 실행해도 UNIQUE 제약 위반 오류 없이 처리됨 (또는 명확한 오류 메시지 출력)
