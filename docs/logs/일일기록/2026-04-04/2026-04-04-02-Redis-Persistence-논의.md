# Redis Persistence 논의

**날짜**: 2026-04-04  
**주제**: Redis 데이터를 디스크에 저장하는 Persistence 기능 도입

---

## 배경

게임 세션 API(`/api/v1/game-sessions/{user_id}`)가 Redis를 저장소로 사용 중이다.  
현재 Redis는 인메모리 모드로만 동작하므로, 컨테이너 재시작 또는 장애 시 세션 데이터가 전부 사라진다.  
이를 방지하기 위해 Redis Persistence 기능 도입을 논의한다.

---

## Redis Persistence 옵션

Redis는 두 가지 디스크 저장 방식을 제공한다.

### 1. RDB (Redis Database Snapshot)

- 설정된 조건(예: N초 동안 M번 이상 변경)이 충족될 때 전체 데이터를 스냅샷으로 저장
- 파일: `dump.rdb`
- 장점: 파일 크기 작음, 재시작 시 빠른 복구
- 단점: 스냅샷 간격 사이의 데이터는 유실될 수 있음

### 2. AOF (Append Only File)

- 모든 쓰기 명령을 순서대로 파일에 기록
- 파일: `appendonly.aof`
- 장점: 유실 데이터 최소화 (fsync 설정에 따라 1초 이내)
- 단점: RDB보다 파일 크기 크고, 재시작 시 복구 시간이 더 걸림

### 3. RDB + AOF 혼합 (권장)

- Redis 4.0+에서 지원 (`aof-use-rdb-preamble yes`)
- AOF 파일에 RDB 스냅샷 + 이후 변경분 AOF를 결합
- 빠른 복구 속도 + 낮은 데이터 유실량의 장점 취함

---

## 현재 프로젝트 상황

- 게임 세션 TTL: 7200초(2시간) — 임시 데이터 성격
- 세션 유실 시 영향: 게임 중 이탈 후 재진입 시 진행 상황 복원 불가 (UX 저하, 데이터 손실 없음)
- 랭킹 데이터(Redis Sorted Set)는 별도로 PostgreSQL에 영구 저장됨

---

## 결정 사항

- **Persistence 방식: RDB** 채택
  - 게임 세션은 TTL 2시간의 임시 데이터이므로 스냅샷 간격 유실은 허용 가능
  - 설정이 단순하고 복구 속도가 빠름
  - AOF, RDB+AOF는 사용하지 않음

---

## 추가 결정 사항

- **스냅샷 주기**: Redis 기본 권장값 사용
  - `save 3600 1` — 1시간 동안 1번 이상 변경 시
  - `save 300 100` — 5분 동안 100번 이상 변경 시
  - `save 60 10000` — 1분 동안 10000번 이상 변경 시
- **볼륨**: named volume 방식 (`redis-data:/data`)
  - 이미 `docker-compose.yml`에 `redis-data` named volume 선언되어 있음
- **랭킹 Sorted Set**: RDB에 함께 저장됨 (특정 키 제외 불가)
  - PostgreSQL이 원본이므로 복원 여부와 무관하게 데이터 정합성 유지
  - 오히려 재시작 직후 캐시 히트 가능 → PostgreSQL 부하 감소 이점

---

## 구현 방향 (다음 단계)

`docker-compose.yml` redis 서비스에 `command` 추가:

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

- `command` 한 줄 추가가 전부 (볼륨은 이미 설정되어 있음)
- `/data`에 `dump.rdb` 저장 → 컨테이너 재시작 후 자동 복원
