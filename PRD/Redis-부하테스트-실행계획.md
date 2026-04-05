# Redis 부하 테스트 실행계획

## 요구사항 요약

**요구사항**: `GET /api/v1/monthly-scores` 엔드포인트에서 Redis 캐시 유무에 따른 성능 차이를 k6로 측정한다.

**목적**: Redis Sorted Set 캐시가 실제 응답 속도와 처리량에 얼마나 기여하는지 수치로 검증한다.

---

## 현재상태 분석

- `GET /api/v1/monthly-scores`: Redis Sorted Set(`zrevrangebyscore`) 조회 → 캐시 미스 시 DB 폴백
- Redis 장애 시 `except Exception: pass` 블록을 통해 DB 직접 조회로 자동 전환
- mock 데이터: `backend/scripts/mock/seed_mock_data.py`로 사용자 50명 + 월간 점수 50개 생성 가능
- Redis 컨테이너명: `redis-server` / 서비스명: `redis` (docker-compose.yml 기준)
- 실제 도메인: `https://hexsera.com`

---

## 구현 방법

1. mock 데이터 확인 및 보충
2. k6 설치
3. k6 스크립트 작성 (`tests/load/monthly_scores_load_test.js`)
4. **시나리오 A**: Redis 컨테이너 다운 → k6 실행 → 결과 기록
5. **시나리오 B**: Redis 컨테이너 재기동 → warm-up 확인 → k6 실행 → 결과 기록
6. 결과 비교 분석

---

## 구현 단계

### 1. mock 데이터 확인

```bash
docker compose exec fastapi python -c "
from app.db.session import SessionLocal
from models import MonthlyScore
from datetime import datetime
db = SessionLocal()
from calendar import monthrange
now = datetime.now()
_, last = monthrange(now.year, now.month)
from datetime import datetime as dt
start = dt(now.year, now.month, 1)
end = dt(now.year, now.month, last, 23, 59, 59)
count = db.query(MonthlyScore).filter(MonthlyScore.created_at >= start, MonthlyScore.created_at <= end).count()
print(f'이번 달 monthly_scores 레코드 수: {count}')
db.close()
"
```

- 이번 달 기준 monthly_scores 레코드 수를 출력한다.
- 레코드가 0개이면 아래 seed 명령으로 데이터를 생성한다.

```bash
# 데이터가 없을 때만 실행
docker compose exec fastapi python scripts/mock/seed_mock_data.py
```

---

### 2. k6 설치

```bash
# Linux (Ubuntu/Debian)
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] \
  https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list

sudo apt-get update && sudo apt-get install k6
```

- 설치 확인: `k6 version`

---

### 3. k6 스크립트 작성

```javascript
// tests/load/monthly_scores_load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://hexsera.com';

export const options = {
  stages: [
    { duration: '30s', target: 5   },  // 워밍업
    { duration: '60s', target: 20  },  // 경량 부하
    { duration: '60s', target: 50  },  // 중간 부하
    { duration: '60s', target: 100 },  // 고부하
    { duration: '60s', target: 200 },  // 최고 부하
    { duration: '10s', target: 0   },  // 종료
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // p95 2초 이하 목표
    http_req_failed:   ['rate<0.05'],   // 에러율 5% 이하 목표
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/monthly-scores`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

- `stages`: 동시 사용자를 5→20→50→100→200 순으로 단계적으로 증가시킨다.
- `thresholds`: 테스트 통과/실패 기준. p95 응답 2초 초과 또는 에러율 5% 초과 시 테스트 실패로 표시.
- `sleep(1)`: VU(가상 사용자)당 요청 간 1초 대기 — 실제 사용자 행동 모사.

---

### 4. 시나리오 A 실행 (Redis 없음)

```bash
# Redis 다운
docker compose stop redis-server

# k6 실행 및 결과 저장
k6 run tests/load/monthly_scores_load_test.js \
  --summary-export tests/load/results/scenario_a_no_redis.json

# 결과 확인
cat tests/load/results/scenario_a_no_redis.json
```

- `--summary-export`: 테스트 완료 후 p50/p95/p99/RPS/에러율 등을 JSON으로 저장.
- Redis 다운 상태에서 FastAPI는 `except Exception` 블록을 통해 자동으로 DB 직접 조회로 동작한다.

---

### 5. 시나리오 B 실행 (Redis 있음)

```bash
# Redis 재기동
docker compose start redis-server

# warm-up 확인 (캐시가 비어 있으면 첫 요청 시 자동 warm-up)
curl -s https://hexsera.com/api/v1/monthly-scores | python3 -m json.tool | head -5

# k6 실행 및 결과 저장
k6 run tests/load/monthly_scores_load_test.js \
  --summary-export tests/load/results/scenario_b_with_redis.json

# 결과 확인
cat tests/load/results/scenario_b_with_redis.json
```

- warm-up용 `curl` 1회로 Redis Sorted Set을 채운 뒤 k6를 실행한다.
- 이후 요청은 전부 Redis 캐시에서 응답하므로 DB 조회가 발생하지 않는다.

---

### 6. 결과 비교

```bash
# 두 결과 파일에서 핵심 지표 추출
python3 - <<'EOF'
import json

def extract(path, label):
    with open(path) as f:
        d = json.load(f)
    dur = d['metrics']['http_req_duration']
    rps = d['metrics']['http_reqs']
    err = d['metrics']['http_req_failed']
    print(f"\n=== {label} ===")
    print(f"p50:    {dur['values']['p(50)']:.1f} ms")
    print(f"p95:    {dur['values']['p(95)']:.1f} ms")
    print(f"p99:    {dur['values']['p(99)']:.1f} ms")
    print(f"RPS:    {rps['values']['rate']:.2f} req/s")
    print(f"에러율: {err['values']['rate']*100:.2f} %")

extract('tests/load/results/scenario_a_no_redis.json',  'A: Redis 없음')
extract('tests/load/results/scenario_b_with_redis.json', 'B: Redis 있음')
EOF
```

- 두 JSON 결과 파일에서 p50/p95/p99/RPS/에러율을 나란히 출력한다.
- 이 수치를 설계 문서의 결과 기록 양식 표에 채운다.

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `tests/load/monthly_scores_load_test.js` | 생성 | k6 부하 테스트 스크립트 |
| `tests/load/results/scenario_a_no_redis.json` | 생성 (실행 시 자동) | 시나리오 A 결과 |
| `tests/load/results/scenario_b_with_redis.json` | 생성 (실행 시 자동) | 시나리오 B 결과 |
| `docs/history/2026-04-04-04-Redis-부하테스트-설계.md` | 수정 | 결과 기록 양식 표에 수치 기입, 미결 사항 체크 |

---

## 완료 체크리스트

- [ ] `k6 version` 명령이 정상 출력된다
- [ ] 이번 달 monthly_scores 레코드가 1개 이상 존재한다
- [ ] 시나리오 A: Redis 다운 상태에서 k6 실행 완료, `scenario_a_no_redis.json` 생성됨
- [ ] 시나리오 B: Redis 기동 및 warm-up 확인 후 k6 실행 완료, `scenario_b_with_redis.json` 생성됨
- [ ] 비교 스크립트 실행 시 p50/p95/p99/RPS/에러율이 두 시나리오 모두 출력된다
- [ ] 설계 문서의 결과 기록 양식 표가 실제 수치로 채워진다
- [ ] 시나리오 B의 p95가 시나리오 A보다 낮다 (Redis 효과 확인)
