# Redis RDB Persistence 실행계획

## 요구사항 요약

**요구사항**: Redis에 RDB Persistence를 적용하여 컨테이너 재시작 후에도 데이터를 복원한다.

**목적**: 현재 Redis는 인메모리 모드로만 동작해 재시작 시 게임 세션 데이터가 전부 사라진다. RDB 스냅샷으로 `/data/dump.rdb`에 주기적으로 저장해 재시작 후 자동 복원되도록 한다.

---

## 현재상태 분석

- `docker-compose.yml` redis 서비스에 `command` 미설정 → Redis 기본 실행(persistence 비활성)
- `redis-data:/data` named volume은 이미 선언 및 마운트되어 있음
- 수정할 파일은 `docker-compose.yml` 1개, 변경 내용은 `command` 한 줄 추가가 전부

---

## 구현 방법

- `docker-compose.yml`의 redis 서비스에 `command` 옵션으로 `redis-server`에 `--save` 조건을 전달한다.
- 볼륨은 이미 `/data`에 마운트되어 있으므로 Redis가 해당 경로에 `dump.rdb`를 자동 저장한다.
- Redis 공식 기본 권장값 3개 조건을 그대로 사용한다.

---

## 구현 단계

### 1. redis 서비스에 `command` 추가

```yaml
redis:
  image: redis:8.6.2
  container_name: redis-server
  restart: always
  command: redis-server --save 3600 1 --save 300 100 --save 60 10000 --loglevel warning
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  networks:
    - web
```

- **무엇을 하는가**: Redis 서버 시작 시 RDB 스냅샷 조건 3개를 활성화
- `--save 3600 1`: 1시간 동안 1번 이상 변경 시 저장
- `--save 300 100`: 5분 동안 100번 이상 변경 시 저장
- `--save 60 10000`: 1분 동안 10000번 이상 변경 시 저장 (세 조건은 OR 관계)
- `--loglevel warning`: 불필요한 info 로그 억제
- `/data`는 이미 `redis-data` named volume에 마운트되어 있어 `dump.rdb`가 컨테이너 외부에 유지됨

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `docker-compose.yml` | 수정 | redis 서비스에 `command` 한 줄 추가 |

---

## 완료 체크리스트

- [ ] `docker compose up -d redis` 후 컨테이너 정상 실행 확인
- [ ] `docker compose exec redis redis-cli CONFIG GET save` 출력값에 `3600 1 300 100 60 10000` 포함 확인
- [ ] `PUT /api/v1/game-sessions/{user_id}` 요청 후 `docker compose restart redis`, `GET` 요청 시 동일한 세션 반환 확인
- [ ] `docker compose exec redis ls /data` 에서 `dump.rdb` 파일 생성 확인
