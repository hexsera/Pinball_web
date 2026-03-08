# friendships & game_visits Mock 데이터 추가 실행계획

## 요구사항 요약

**요구사항**: friendships 테이블과 game_visits 테이블에 mock 데이터를 삽입하는 스크립트를 작성한다.

**목적**: 개발 및 테스트 환경에서 친구 관계와 게임 방문 기록 데이터를 시뮬레이션하기 위해 현실적인 mock 데이터가 필요하다.

## 현재상태 분석

- `backend/scripts/mock/seed_mock_data.py`에 users(50명), monthly_scores mock 생성 스크립트가 이미 존재한다.
- friendships, game_visits 테이블은 비어 있다.
- Faker(`ko_KR`) 라이브러리와 SQLAlchemy SessionLocal이 기존 스크립트에서 사용 중이다.
- Docker 컨테이너 내 `/code` 경로에서 실행되며, `models.py`에서 Friendship, GameVisit 모델을 import할 수 있다.

## 구현 방법

- 기존 `seed_mock_data.py`와 동일한 패턴(SessionLocal, Faker, models import)을 사용해 신규 스크립트를 작성한다.
- friendships: DB에 존재하는 user id 목록에서 랜덤으로 requester/receiver 쌍을 선택, UNIQUE 제약과 자기참조 방지를 코드에서 처리한다.
- game_visits: 익명(user_id=None)과 로그인(user_id 있음)을 혼합하고, Faker로 ip_address를 생성한다.

## 구현 단계

### 1. 신규 스크립트 파일 생성 및 기본 설정

```python
import sys, os, random
from datetime import datetime, timedelta

sys.path.insert(0, '/code')

from faker import Faker
from app.db.session import SessionLocal
from models import User, Friendship, GameVisit

fake = Faker('ko_KR')
```

- **무엇을 하는가**: 기존 스크립트와 동일한 import 구조로 컨테이너 환경에서 실행되도록 경로를 설정한다.
- `sys.path.insert(0, '/code')`로 Docker 컨테이너 내 모듈 경로를 추가한다.

### 2. friendships mock 데이터 생성 함수

```python
def create_mock_friendships(db, count=80):
    users = db.query(User).all()
    user_ids = [u.id for u in users]
    existing_pairs = set()
    created = 0

    while created < count:
        a, b = random.sample(user_ids, 2)  # a != b 보장
        pair = (min(a, b), max(a, b))
        if pair in existing_pairs:
            continue
        existing_pairs.add(pair)
        days_ago = random.randint(0, 90)
        friendship = Friendship(
            requester_id=a,
            receiver_id=b,
            status=random.choice(['pending', 'accepted', 'rejected']),
            created_at=datetime.utcnow() - timedelta(days=days_ago)
        )
        db.add(friendship)
        created += 1
    db.commit()
```

- **무엇을 하는가**: 기존 users에서 2명을 뽑아 친구 요청 관계를 생성한다.
- `random.sample(user_ids, 2)`로 자기 자신과의 친구 요청(CHECK 제약 위반)을 원천 차단한다.
- `(min, max)` 정규화로 (A→B), (B→A) 중복 쌍을 메모리에서 필터링해 UNIQUE 제약 위반을 방지한다.
- status는 pending/accepted/rejected 중 랜덤 선택, created_at은 최근 90일 내 랜덤 날짜로 설정한다.

### 3. game_visits mock 데이터 생성 함수

```python
def create_mock_game_visits(db, count=200):
    users = db.query(User).all()
    user_ids = [u.id for u in users]

    for _ in range(count):
        # 30% 확률로 익명 방문
        uid = None if random.random() < 0.3 else random.choice(user_ids)
        days_ago = random.randint(0, 60)
        created = datetime.utcnow() - timedelta(days=days_ago)
        visit = GameVisit(
            user_id=uid,
            ip_address=fake.ipv4(),
            is_visits=True,
            created_at=created,
            updated_at=created
        )
        db.add(visit)
    db.commit()
```

- **무엇을 하는가**: 총 200건의 게임 방문 기록을 생성하며, 익명 방문(30%)과 로그인 방문(70%)을 혼합한다.
- `fake.ipv4()`로 현실적인 IP 주소를 생성한다 (String(45)는 IPv6도 수용하지만 IPv4로 통일).
- `is_visits`는 항상 True로 고정하여 모든 방문이 실제 게임 플레이로 기록된다.
- `created_at`과 `updated_at`을 동일 값으로 설정해 server_default 없이 명시적 삽입을 보장한다.

### 4. main 함수 작성 및 실행

```python
def main():
    db = SessionLocal()
    try:
        print("Mock friendships 80건 생성 중...")
        create_mock_friendships(db, count=80)
        print("friendships 생성 완료")

        print("Mock game_visits 200건 생성 중...")
        create_mock_game_visits(db, count=200)
        print("game_visits 생성 완료")

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

- **무엇을 하는가**: 두 함수를 순서대로 호출하고, 오류 시 rollback하여 데이터 일관성을 유지한다.
- 기존 `seed_mock_data.py`의 main 구조를 그대로 따른다.

### 5. 컨테이너에서 실행

```bash
docker-compose exec fastapi python scripts/mock/seed_friendships_gamevisits.py
```

- **무엇을 하는가**: Docker 컨테이너 내부에서 스크립트를 실행한다.
- users 데이터가 먼저 존재해야 하므로 `seed_mock_data.py` 실행 후 수행한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/scripts/mock/seed_friendships_gamevisits.py` | 생성 | friendships, game_visits mock 데이터 삽입 스크립트 |

## 완료 체크리스트

- [ ] `docker-compose exec fastapi python scripts/mock/seed_friendships_gamevisits.py` 실행 시 오류 없이 완료 메시지 출력
- [ ] DB에서 `SELECT COUNT(*) FROM friendships;` 결과가 80 이하 (중복 제거로 실제 수는 80 이하일 수 있음)
- [ ] DB에서 `SELECT COUNT(*) FROM game_visits;` 결과가 200
- [ ] `SELECT COUNT(*) FROM game_visits WHERE user_id IS NULL;` 결과가 0보다 큼 (익명 방문 존재)
- [ ] `SELECT DISTINCT status FROM friendships;` 결과에 pending, accepted, rejected 모두 포함
- [ ] friendships 테이블에서 `requester_id = receiver_id`인 행이 0건
