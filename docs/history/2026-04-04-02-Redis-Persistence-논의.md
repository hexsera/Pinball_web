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

- RDB 방식으로 시작하는 것이 적합하다. 게임 세션은 임시 데이터이므로 일부 유실은 허용 가능하고, 설정이 단순하다.
- docker-compose.yml의 redis 서비스에 `--save` 옵션과 volume 마운트를 추가하여 적용한다.
- AOF는 추후 필요 시 추가 검토한다.

---

## 구현 방향 (다음 단계)

`docker-compose.yml` redis 서비스에 아래 내용 적용:

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --save 60 1 --loglevel warning
  volumes:
    - redis_data:/data
  # ...

volumes:
  redis_data:
```

- `--save 60 1`: 60초 동안 1번 이상 변경 시 스냅샷 저장
- `/data` 볼륨 마운트: 컨테이너 재시작 후에도 `dump.rdb` 유지
