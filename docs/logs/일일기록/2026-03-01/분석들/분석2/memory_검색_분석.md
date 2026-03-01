# OpenClaw Memory 검색 시스템 분석

> 분석 대상: `/openclaw_git/src/memory/` 디렉토리
> 분석 기준: 벡터 검색(Vector Search)과 네이밍 검색(Keyword Search)

---

## 1. 전체 흐름도

```
사용자 질문 입력
       │
       ▼
┌──────────────────────────────────┐
│        search() 함수 진입         │
│       (manager.ts)               │
└──────────────────────────────────┘
       │
       ├─── 임베딩 제공자 없음? ──────────────────┐
       │                                          │
       ▼                                          ▼
┌─────────────────┐                    ┌──────────────────────┐
│ 하이브리드 검색  │                    │  FTS 키워드 검색만    │
│ (벡터 + 텍스트) │                    │  (extractKeywords)   │
└─────────────────┘                    └──────────────────────┘
       │
       ├─── 벡터 검색 ──────────────────────────────────┐
       │    (searchVector)                              │
       │                                               │
       ├─── 키워드 검색 ─────────────────────────────── ┤
            (searchKeyword)                            │
                                                       ▼
                                           ┌───────────────────────┐
                                           │  mergeHybridResults() │
                                           │  벡터 0.7 + 텍스트 0.3│
                                           └───────────────────────┘
                                                       │
                                           ┌───────────┼───────────┐
                                           ▼           ▼           ▼
                                       시간 감쇠     MMR        점수 필터
                                    (temporal    (다양성    (minScore
                                      decay)    재순위화)    기본 0.35)
                                           │
                                           ▼
                                    최종 검색 결과 반환
```

---

## 2. 핵심 파일 구조

```
openclaw_git/src/memory/
├── manager.ts              ← 메인 진입점: search() 함수
├── manager-search.ts       ← 벡터/키워드 검색 핵심 로직
├── search-manager.ts       ← 외부/내장 DB 선택 관리
├── memory-schema.ts        ← SQLite 테이블 구조 정의
├── embeddings.ts           ← 임베딩 제공자 선택 공장
├── embeddings-openai.ts    ← OpenAI 임베딩
├── embeddings-gemini.ts    ← Gemini 임베딩
├── embeddings-voyage.ts    ← Voyage 임베딩
├── embeddings-mistral.ts   ← Mistral 임베딩
├── hybrid.ts               ← 검색 결과 병합 (벡터+키워드)
├── query-expansion.ts      ← 키워드 추출 (불용어 제거)
├── mmr.ts                  ← 결과 다양성 재순위화
├── temporal-decay.ts       ← 최신 파일 우선 점수 계산
├── sqlite.ts               ← SQLite 연결 래퍼
├── sqlite-vec.ts           ← 벡터 확장 로드
├── internal.ts             ← 유사도 계산, 텍스트 청킹
└── types.ts                ← TypeScript 인터페이스 정의
```

---

## 3. 벡터 검색 (Vector Search / Semantic Search)

### 3.1 개념 설명

벡터 검색이란 텍스트를 수백 개의 숫자 배열(벡터)로 변환한 뒤,
비슷한 의미의 벡터끼리 거리를 계산해 관련 문서를 찾는 방법입니다.

예: "강아지 먹이" 검색 → "반려동물 사료" 문서도 찾을 수 있음 (의미 유사)

### 3.2 벡터 검색 함수 (`manager-search.ts`)

```typescript
// 파일: manager-search.ts
export async function searchVector(params: {
  db: DatabaseSync;
  vectorTable: string;      // 벡터 저장 테이블명
  providerModel: string;    // 임베딩 모델명
  queryVec: number[];       // 검색어를 숫자 배열로 변환한 것
  limit: number;            // 최대 결과 수
  ...
}): Promise<SearchRowResult[]> {

  // SQLite-Vec 확장을 사용한 코사인 거리 계산 SQL
  const rows = params.db.prepare(`
    SELECT c.id, c.path, c.start_line, c.end_line, c.text,
           vec_distance_cosine(v.embedding, ?) AS dist
      FROM ${params.vectorTable} v
      JOIN chunks c ON c.id = v.id
     WHERE c.model = ?
     ORDER BY dist ASC   ← 거리가 작을수록 더 유사
     LIMIT ?
  `).all(vectorToBlob(params.queryVec), ...);

  // 거리(0~2)를 점수(0~1)로 변환: 1 - 거리
  return rows.map((row) => ({
    score: 1 - row.dist,  // 거리 0 = 완전 일치 → 점수 1.0
    ...
  }));
}
```

**핵심 포인트:**
- `vec_distance_cosine`: SQLite-Vec 확장에서 제공하는 코사인 거리 함수
- 결과를 `dist ASC`(거리 오름차순)으로 정렬 → 유사할수록 먼저 나옴
- `1 - dist`로 점수 변환 (거리 0.1 → 점수 0.9)

### 3.3 코사인 유사도 직접 계산 (`internal.ts`)

SQLite-Vec 확장이 없을 때 JavaScript에서 직접 계산하는 코드:

```typescript
// 파일: internal.ts
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;    // 내적
  let normA = 0;  // a의 크기
  let normB = 0;  // b의 크기

  for (let i = 0; i < len; i++) {
    dot  += a[i] * b[i];  // 같은 위치 숫자끼리 곱해서 더함
    normA += a[i] * a[i]; // a 각 숫자의 제곱 합
    normB += b[i] * b[i]; // b 각 숫자의 제곱 합
  }

  // 코사인 유사도 = 내적 / (a크기 × b크기)
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  // 결과: 1.0 = 완전 동일, 0.0 = 전혀 다름
}
```

**쉬운 비유:** 두 문서의 방향이 같으면 유사하다고 판단하는 방식
(나침반처럼, 방향이 같으면 코사인값 = 1)

### 3.4 벡터를 DB에 저장하는 방법 (`manager-search.ts`)

```typescript
// 숫자 배열을 바이너리(이진 데이터)로 변환해 DB에 저장
// Float32Array: 각 숫자를 4바이트 실수로 저장 → 압축 효율 좋음
const vectorToBlob = (embedding: number[]): Buffer =>
  Buffer.from(new Float32Array(embedding).buffer);
```

### 3.5 임베딩(숫자 변환) 제공자 (`embeddings.ts`)

```
질문 텍스트 → [임베딩 API 호출] → 숫자 배열 (예: 1536개 숫자)
```

지원 제공자:
| 제공자 | 기본 모델 | 특징 |
|--------|-----------|------|
| OpenAI | text-embedding-3-small | 가장 널리 사용 |
| Gemini | gemini-embedding-001 | Google 제공 |
| Voyage | voyage-4-large | 고성능 특화 |
| Mistral | mistral-embed | 유럽 AI |

임베딩 후 L2 정규화 (크기를 1로 맞춤):
```typescript
function sanitizeAndNormalizeEmbedding(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map((v) => v / magnitude); // 모든 벡터를 같은 크기로 맞춤
}
```

---

## 4. 네이밍/키워드 검색 (Naming / Keyword Search)

### 4.1 개념 설명

키워드 검색이란 단어 자체를 DB에서 직접 찾는 방법입니다.
SQLite의 FTS5(Full Text Search 5) 기능을 사용합니다.

예: "강아지 먹이" 검색 → 정확히 "강아지", "먹이" 단어가 있는 문서를 찾음

### 4.2 FTS 키워드 검색 함수 (`manager-search.ts`)

```typescript
// 파일: manager-search.ts
export async function searchKeyword(params: {
  db: DatabaseSync;
  ftsTable: string;   // FTS 가상 테이블명
  query: string;      // 검색어 문자열
  limit: number;
  ...
}): Promise<Array<SearchRowResult & { textScore: number }>> {

  // FTS 쿼리로 변환 (예: "강아지 먹이" → '"강아지" AND "먹이"')
  const ftsQuery = params.buildFtsQuery(params.query);

  // BM25 알고리즘으로 관련성 점수 계산하여 정렬
  const rows = params.db.prepare(`
    SELECT id, path, source, start_line, end_line, text,
           bm25(${params.ftsTable}) AS rank  ← BM25 점수
      FROM ${params.ftsTable}
     WHERE ${params.ftsTable} MATCH ?        ← FTS 검색
     ORDER BY rank ASC                       ← 관련성 높을수록 먼저
     LIMIT ?
  `).all(ftsQuery, ...);
}
```

**BM25란?** 검색 엔진에서 가장 많이 쓰이는 점수 계산 방법
- 단어가 문서에 많이 나올수록 점수 높음
- 단어가 전체 DB에 드물수록 점수 높음 (희귀한 단어 = 더 의미 있음)

### 4.3 FTS 쿼리 만들기 (`hybrid.ts`)

```typescript
// 파일: hybrid.ts
export function buildFtsQuery(raw: string): string | null {
  // 1단계: 단어 토큰화 (글자, 숫자, 언더스코어만 추출)
  const tokens = raw.match(/[\p{L}\p{N}_]+/gu) ?? [];
  // 예: "메모리 검색 어떻게?" → ["메모리", "검색", "어떻게"]

  // 2단계: 각 단어를 따옴표로 감싸고 AND로 연결
  const quoted = tokens.map((t) => `"${t}"`);
  return quoted.join(" AND ");
  // 결과: '"메모리" AND "검색" AND "어떻게"'
  // 의미: 세 단어가 모두 포함된 문서만 찾음
}
```

### 4.4 BM25 점수를 0~1로 변환 (`hybrid.ts`)

```typescript
// 파일: hybrid.ts
// SQLite의 bm25() 함수는 음수 반환 (작을수록 관련성 높음)
export function bm25RankToScore(rank: number): number {
  const normalized = Math.max(0, rank);
  return 1 / (1 + normalized); // 역수로 변환 → 클수록 관련성 높음
}
```

### 4.5 스마트 키워드 추출 (`query-expansion.ts`)

임베딩 제공자가 없을 때 질문에서 의미 있는 단어만 골라냄:

```typescript
// 파일: query-expansion.ts
// 불필요한 영어 단어 목록 (조사, 접속사 등)
const STOP_WORDS_EN = new Set([
  "a", "an", "the", "this", "that",
  "i", "me", "my", "we", "you",
  "is", "are", "was", "have", "had",
  // ... 60개 이상
]);

export function extractKeywords(query: string): string[] {
  const tokens = query.match(/[\p{L}\p{N}_]+/gu) ?? [];

  return tokens.filter((token) => {
    // 3글자 미만 영어 단어 제거 (단, 한자는 제외)
    if (!hasHanScript(token) && token.length < 3) return false;

    // 불용어 제거 (예: "the", "is" 등)
    return !STOP_WORDS_EN.has(token.toLowerCase());
  });
  // "how do I search memory?" → ["search", "memory"]
}
```

---

## 5. DB 구조 (SQLite 스키마)

### 5.1 DB 테이블 구조도

```
┌─────────────────┐       ┌───────────────────────┐
│     files       │       │       chunks           │
├─────────────────┤       ├───────────────────────┤
│ path (PK)       │──1:N──│ id (PK)               │
│ source          │       │ path (FK)             │
│ hash            │       │ source                │
│ mtime           │       │ start_line, end_line  │
│ size            │       │ text (실제 내용)       │
└─────────────────┘       │ embedding (벡터 JSON) │
                          │ model                 │
                          │ hash                  │
                          └───────────────────────┘
                                    │
                                    │ id 참조
                                    ▼
                          ┌───────────────────────┐
                          │    vector_table        │
                          ├───────────────────────┤
                          │ id (PK, FK)           │
                          │ embedding (BLOB)      │ ← 빠른 검색용 바이너리
                          └───────────────────────┘

┌──────────────────────────────────────┐
│          fts_chunks (FTS5)           │
├──────────────────────────────────────┤
│ text (검색 대상)                      │
│ id, path, source (검색 안 됨)        │
│ model, start_line, end_line          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│         embedding_cache              │
├──────────────────────────────────────┤
│ provider, model, provider_key, hash  │
│ embedding (캐시된 벡터)              │
│ dims, updated_at                     │
└──────────────────────────────────────┘
```

### 5.2 테이블 생성 코드 (`memory-schema.ts`)

```typescript
// 파일: memory-schema.ts

// 청크 테이블: 텍스트를 조각내어 저장
params.db.exec(`
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,       -- 고유 ID
    path TEXT NOT NULL,        -- 파일 경로
    start_line INTEGER NOT NULL, -- 시작 줄 번호
    end_line INTEGER NOT NULL,   -- 끝 줄 번호
    text TEXT NOT NULL,          -- 실제 텍스트 내용
    embedding TEXT NOT NULL,     -- 벡터를 JSON으로 저장
    model TEXT NOT NULL,         -- 사용한 임베딩 모델
    updated_at INTEGER NOT NULL  -- 마지막 업데이트 시간
  );
`);

// FTS5 가상 테이블: 전문 검색용
params.db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS ${params.ftsTable} USING fts5(
    text,           -- 이 컬럼만 검색 대상
    id UNINDEXED,   -- UNINDEXED: 검색 안 되고 데이터만 저장
    path UNINDEXED,
    source UNINDEXED,
    model UNINDEXED,
    start_line UNINDEXED,
    end_line UNINDEXED
  );
`);
```

**청킹(Chunking)이란?** 긴 문서를 작은 조각으로 나누는 것
- 기본: 400 토큰(약 300 단어) 단위로 자름
- 오버랩: 80 토큰 겹침 (앞뒤 문맥 유지)

---

## 6. 하이브리드 검색 (벡터 + 키워드 합산)

### 6.1 점수 합산 방법 (`hybrid.ts`)

```typescript
// 파일: hybrid.ts
// 두 검색 결과를 하나로 합침
for (const r of vectorResults) {
  map.set(r.id, { vectorScore: r.score, textScore: 0, ... });
}
for (const r of keywordResults) {
  const existing = map.get(r.id);
  if (existing) {
    existing.textScore = r.textScore; // 이미 있으면 텍스트 점수 추가
  } else {
    map.set(r.id, { vectorScore: 0, textScore: r.textScore, ... });
  }
}

// 최종 점수 = 벡터점수×0.7 + 텍스트점수×0.3
const finalScore = vectorWeight * vectorScore + textWeight * textScore;
//               = 벡터점수×0.7 + 텍스트점수×0.3
```

**왜 벡터에 더 높은 가중치?**
- 벡터: 의미적 유사성 파악 (더 지능적)
- 텍스트: 정확한 단어 매칭 (보조 역할)

### 6.2 전체 검색 흐름 상세도

```
[검색어: "프로젝트 마감 기한"]
         │
         ├─── 임베딩 API 호출 ──────────────────────────────────────────┐
         │    "프로젝트 마감 기한"                                       │
         │    → [0.23, -0.15, 0.87, ...]  (1536개 숫자)                 │
         │                                                              ▼
         │                                               ┌─────────────────────┐
         │                                               │   벡터 검색 (SQL)   │
         │                                               │ vec_distance_cosine │
         │                                               │ → 유사 문서 20개    │
         │                                               └─────────────────────┘
         │
         └─── FTS 쿼리 생성 ──────────────────────────────────────────────┐
              "프로젝트 마감 기한"                                          │
              → '"프로젝트" AND "마감" AND "기한"'                         │
                                                                          ▼
                                                          ┌─────────────────────┐
                                                          │  키워드 검색 (FTS)  │
                                                          │    BM25 알고리즘    │
                                                          │ → 관련 문서 20개    │
                                                          └─────────────────────┘
                                                                    │
                                                    ┌───────────────┘
                                                    ▼
                                        ┌────────────────────────┐
                                        │   결과 병합 & 점수 계산  │
                                        │  최종점수 = 0.7×벡터   │
                                        │           + 0.3×텍스트 │
                                        └────────────────────────┘
                                                    │
                                        ┌───────────┼───────────┐
                                        ▼           ▼           ▼
                                    시간 감쇠     MMR 적용    0.35 미만
                                   (30일 반감)   (다양성)    필터링
                                        │
                                        ▼
                                   최대 6개 결과 반환
```

---

## 7. 고급 기능 설명

### 7.1 시간 감쇠 (Temporal Decay) - `temporal-decay.ts`

최근에 수정된 파일을 더 높은 점수로 우선시:

```typescript
// 파일: temporal-decay.ts
// 지수 감쇠 공식: e^(-λ × 경과일수)
// 30일 반감기: 30일 지난 파일은 점수가 절반으로 줄어듦
export function calculateTemporalDecayMultiplier(params: {
  ageInDays: number;  // 파일 수정 후 경과 일수
  halfLifeDays: number; // 기본값: 30일
}): number {
  const lambda = Math.LN2 / params.halfLifeDays; // 감쇠 상수
  return Math.exp(-lambda * params.ageInDays);
  // 0일: 점수 × 1.0 (변화 없음)
  // 30일: 점수 × 0.5 (절반)
  // 60일: 점수 × 0.25 (1/4)
}
```

### 7.2 MMR 다양성 재순위화 (Maximal Marginal Relevance) - `mmr.ts`

중복된 내용의 문서가 결과에 많이 나오지 않도록 다양성 확보:

```typescript
// 파일: mmr.ts
// 자카드 유사도: 두 텍스트 조각이 얼마나 비슷한지 계산
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  // 교집합 크기 / 합집합 크기
  // 같은 단어가 많을수록 1에 가까움
  return intersectionSize / unionSize;
}
// 이미 선택된 결과와 너무 비슷한 문서는 점수를 낮춰 다양성 확보
```

### 7.3 대안 벡터 DB: LanceDB

외부 플러그인으로 LanceDB를 사용할 수도 있음:

```typescript
// extensions/memory-lancedb/index.ts
async search(vector: number[], limit = 5, minScore = 0.5) {
  // LanceDB 고유의 벡터 검색 (L2 거리 기반)
  const results = await this.table.vectorSearch(vector).limit(limit).toArray();

  return results.map((row) => {
    const score = 1 / (1 + row._distance); // L2 거리 → 유사도 점수
    return { entry: row, score };
  }).filter((r) => r.score >= minScore);
}
```

---

## 8. 검색 매니저 선택 흐름 (`search-manager.ts`)

```
getMemorySearchManager() 호출
         │
         ▼
   QMD 백엔드 설정 있음?
         │
   Yes ──┤
         ▼
   QMD 연결 시도
         │
   성공? ─── No ──→ SQLite 내장 DB 사용
         │
         ▼ Yes
   FallbackMemoryManager 생성
   (QMD 실패 시 → SQLite로 자동 전환)
```

QMD: 외부 메모리 인덱싱 도구 (더 강력하지만 별도 설치 필요)
SQLite: 내장 기본 DB (항상 사용 가능)

---

## 9. 주요 설정값 요약

| 설정 | 기본값 | 의미 |
|------|--------|------|
| `maxResults` | 6 | 최대 반환 결과 수 |
| `minScore` | 0.35 | 최소 점수 (0.35 미만은 버림) |
| `vectorWeight` | 0.7 | 벡터 검색 가중치 |
| `textWeight` | 0.3 | 텍스트 검색 가중치 |
| `candidateMultiplier` | 4 | 중간 후보 수 = maxResults × 4 |
| `chunkTokens` | 400 | 한 청크의 토큰 크기 |
| `chunkOverlap` | 80 | 청크 간 겹침 토큰 수 |
| `halfLifeDays` | 30 | 시간 감쇠 반감기 |
| `mmrLambda` | 0.7 | MMR 다양성 가중치 |

---

## 10. 정리: 두 검색 방식 비교

| 비교 항목 | 벡터 검색 | 키워드 검색 |
|-----------|-----------|-------------|
| 원리 | 의미 유사도 계산 | 단어 직접 매칭 |
| 장점 | 동의어, 유사 개념 찾기 | 정확한 단어 검색 |
| 단점 | API 비용 발생 | 동의어 못 찾음 |
| DB 기술 | SQLite-Vec (코사인 거리) | SQLite FTS5 (BM25) |
| 점수 기여 | 70% (가중치 0.7) | 30% (가중치 0.3) |
| 제공자 없을 때 | 사용 불가 | 단독으로 동작 |

---

## 11. 청킹(Chunking) 프로세스 흐름도

```
메모리 파일 (긴 문서)
       │
       ▼
┌─────────────────────────────────────────┐
│          chunkMarkdown()                │
│          (internal.ts)                  │
│                                         │
│  400 토큰 단위로 자르기                  │
│  ┌──────────────┐ ← 청크 1 (줄 1~40)   │
│  │  내용 A       │                      │
│  │  내용 B       │                      │
│  │  ...          │                      │
│  └──────────────┘                      │
│         │ 80 토큰 겹침 (overlap)         │
│  ┌──────────────┐ ← 청크 2 (줄 35~75)  │
│  │  내용 B (재사용)│                    │
│  │  내용 C       │                      │
│  └──────────────┘                      │
└─────────────────────────────────────────┘
       │
       ▼
각 청크를 임베딩 API로 벡터 변환
       │
       ▼
chunks 테이블 + vector 테이블에 저장
       │
       ▼
FTS5 테이블에도 텍스트 저장
```

**왜 겹치게 자르나?** 중요한 내용이 청크 경계에서 잘리는 것을 방지하기 위해
앞 청크의 끝 부분과 뒤 청크의 시작 부분을 80 토큰씩 겹쳐 자름

---

## 12. 키워드(FTS) 저장 과정 상세 분석

키워드 검색이 동작하려면 먼저 텍스트가 FTS 테이블에 저장되어 있어야 합니다.
이 섹션에서는 **어떻게 텍스트가 FTS 테이블에 저장되는지** 전체 과정을 설명합니다.

### 12.1 저장 전체 흐름도

```
메모리 파일 (예: MEMORY.md)
         │
         ▼
① 파일 읽기 & 해시 계산
   buildFileEntry() - internal.ts
   ├─ fs.readFile()로 내용 읽기
   ├─ fs.stat()으로 mtime, size 읽기
   └─ hashText(content)로 SHA-256 해시 생성
         │
         ▼
② 변경 감지 (재인덱싱 필요 여부 판단)
   manager-sync-ops.ts
   ├─ files 테이블에서 저장된 해시 조회
   ├─ 현재 파일 해시와 비교
   └─ 같으면 SKIP → 다르면 재인덱싱 진행
         │
         ▼
③ 텍스트 청킹 (chunkMarkdown)
   internal.ts
   ├─ 줄(\n) 단위로 분리
   ├─ 400 토큰(≈1600자) 단위로 묶음
   ├─ 80 토큰 겹침(overlap) 유지
   └─ 각 청크마다 hash 계산
         │
         ▼
④ 임베딩 생성 (벡터 검색용)
   embeddings.ts
   └─ 임베딩 API 호출 → 숫자 배열 반환
         │
         ▼
⑤ 기존 데이터 삭제 (3개 테이블)
   manager-embedding-ops.ts
   ├─ DELETE FROM chunks_vec WHERE path = ?
   ├─ DELETE FROM chunks_fts WHERE path = ?
   └─ DELETE FROM chunks WHERE path = ?
         │
         ▼
⑥ 새 데이터 INSERT (청크마다 반복)
   ├─ chunks 테이블 → 항상 저장
   ├─ chunks_vec 테이블 → 벡터 있을 때만
   └─ chunks_fts 테이블 → FTS 활성화 시만
         │
         ▼
⑦ files 테이블 업데이트
   INSERT OR REPLACE 로 파일 메타데이터 갱신
```

### 12.2 핵심 파일과 함수

| 역할 | 파일 | 함수 |
|------|------|------|
| 파일 읽기 & 해시 | `internal.ts` | `buildFileEntry()` |
| 변경 감지 | `manager-sync-ops.ts` | `syncMemoryFiles()` |
| 텍스트 청킹 | `internal.ts` | `chunkMarkdown()` |
| INSERT 전체 | `manager-embedding-ops.ts` | `indexFile()` |
| 청크 ID 생성 | `manager-embedding-ops.ts` | `hashText(...)` |

### 12.3 변경 감지 코드 (`manager-sync-ops.ts`)

파일이 바뀌었을 때만 재인덱싱합니다. 매번 다시 저장하면 너무 느리기 때문입니다.

```typescript
// files 테이블에서 이전에 저장한 파일 해시 조회
const record = this.db
  .prepare(`SELECT hash FROM files WHERE path = ? AND source = ?`)
  .get(entry.path, "memory") as { hash: string } | undefined;

// 해시가 같으면 내용이 안 바뀐 것 → 건너뜀
if (!params.needsFullReindex && record?.hash === entry.hash) {
  return; // SKIP
}

// 해시가 다르면 파일이 바뀐 것 → 재인덱싱
await this.indexFile(entry, { source: "memory" });
```

**비유:** 마치 파일의 "지문(해시)"을 DB에 저장해 두고,
다음에 같은 파일을 보면 지문이 일치하는지 확인하는 방식입니다.

### 12.4 청크 ID 생성 방법 (`manager-embedding-ops.ts`)

FTS 테이블에 저장할 때 각 청크를 구별하는 고유 ID를 만듭니다:

```typescript
const id = hashText(
  `${options.source}:${entry.path}:${chunk.startLine}:${chunk.endLine}:${chunk.hash}:${this.provider.model}`
);
// 예: hashText("memory:docs/guide.md:1:40:abc123:text-embedding-3-small")
// 결과: "7f3d9e2a1b..." (SHA-256 해시)
```

**ID 구성 요소:**

```
source    : "memory" 또는 "sessions"
path      : "docs/guide.md"
startLine : 1        ← 청크 시작 줄
endLine   : 40       ← 청크 끝 줄
hash      : "abc123" ← 청크 텍스트의 해시
model     : "text-embedding-3-small"
```

같은 파일이라도 줄 범위나 모델이 다르면 다른 ID → 중복 저장 방지

### 12.5 기존 데이터 삭제 코드 (`manager-embedding-ops.ts`)

새로 저장하기 전에 이전 데이터를 먼저 지웁니다:

```typescript
// 1. 벡터 테이블 삭제 (경로 기준)
this.db
  .prepare(`DELETE FROM chunks_vec WHERE id IN (
    SELECT id FROM chunks WHERE path = ? AND source = ?
  )`)
  .run(entry.path, options.source);

// 2. FTS 테이블 삭제 (경로 + 모델 기준)
this.db
  .prepare(`DELETE FROM chunks_fts WHERE path = ? AND source = ? AND model = ?`)
  .run(entry.path, options.source, this.provider.model);

// 3. chunks 메인 테이블 삭제
this.db
  .prepare(`DELETE FROM chunks WHERE path = ? AND source = ?`)
  .run(entry.path, options.source);
```

**왜 삭제 후 INSERT?**
파일 내용이 바뀌면 청크 경계도 달라집니다.
이전 청크들이 남아 있으면 검색 결과가 뒤섞이므로 전부 지우고 새로 씁니다.

### 12.6 FTS 테이블 INSERT 코드 (`manager-embedding-ops.ts`)

```typescript
// FTS가 활성화된 경우에만 저장
if (this.fts.enabled && this.fts.available) {
  this.db
    .prepare(`
      INSERT INTO chunks_fts (text, id, path, source, model, start_line, end_line)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      chunk.text,        // ← FTS가 색인할 실제 텍스트
      id,                // ← 고유 ID (위에서 생성)
      entry.path,        // ← 파일 경로
      options.source,    // ← "memory" 또는 "sessions"
      this.provider.model, // ← 임베딩 모델명
      chunk.startLine,   // ← 시작 줄
      chunk.endLine,     // ← 끝 줄
    );
}
```

**중요:** `chunks_fts`는 FTS5 가상 테이블이라서 `ON CONFLICT` 구문이 없습니다.
대신 위의 DELETE를 먼저 실행해서 중복을 막습니다.

### 12.7 files 메타데이터 저장 코드 (`manager-embedding-ops.ts`)

모든 청크 저장이 끝난 후 파일 자체의 정보를 저장합니다:

```typescript
this.db
  .prepare(`
    INSERT INTO files (path, source, hash, mtime, size)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      source = excluded.source,
      hash   = excluded.hash,   ← 다음 변경 감지에 사용
      mtime  = excluded.mtime,
      size   = excluded.size
  `)
  .run(
    entry.path,    // 파일 경로
    options.source,
    entry.hash,    // 파일 전체 해시 (SHA-256)
    entry.mtimeMs, // 마지막 수정 시간
    entry.size,    // 파일 크기 (bytes)
  );
```

### 12.8 FTS 테이블과 트리거

```
chunks_fts 테이블은 SQL 트리거를 쓰지 않습니다.

일반적인 FTS 동기화 방식:          OpenClaw 방식:
  chunks 테이블                      chunks 테이블
       │                                  │
  [자동 트리거] ← X               [수동 코드에서 직접]
       │                                  │
  chunks_fts                        chunks_fts

→ 애플리케이션 코드(indexFile)가
  두 테이블을 직접 관리합니다.
  더 세밀한 제어 가능, 단 개발자가
  직접 동기화 책임을 집니다.
```

### 12.9 FTS 저장 동작 조건 정리

| 조건 | 동작 |
|------|------|
| 파일 해시 변경 없음 | 저장 SKIP (빠름) |
| 파일 해시 변경 있음 | 삭제 후 전체 재저장 |
| 임베딩 제공자 없음 | 벡터 저장 SKIP, FTS만 저장 |
| FTS 비활성화 | FTS 저장 SKIP, 벡터만 저장 |
| 청크 텍스트가 빈 값 | 해당 청크 SKIP |
| 파일 삭제됨 | 3개 테이블 모두 DELETE |

---

*분석 완료 일자: 2026-02-27*
*분석 대상: openclaw_git/src/memory/ 디렉토리 전체*
