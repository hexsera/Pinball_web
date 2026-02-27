# OpenClaw 메모리 코드 호출 흐름

> 흐름도의 각 단계에서 실제로 어떤 파일의 어떤 함수가 호출되는지 추적한 문서

---

## 흐름 1: 수동 메모리 검색 (memory_search)

LLM이 `memory_search` tool_call을 보내는 순간부터 결과가 돌아오는 순간까지.

```
  사용자 (User)              OpenClaw                      LLM (AI 모델)
       │                        │                               │
       │  "지난번 DB 결정        │                               │
       │   기억해?"             │                               │
       │──────────────────────► │                               │
       │                        │  사용자 메시지 + 시스템       │
       │                        │  프롬프트 조합 후 전달        │
       │                        │──────────────────────────────►│
       │                        │                               │  [추론]
       │                        │                               │  "메모리 검색
       │                        │                               │   필요하다"
       │                        │  tool_call 수신               │◄──────────────
       │                        │  { name: "memory_search",     │
       │                        │    args: {query:"DB 결정"} }  │
       │                        │                               │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ① 진입점                                        │
       │              │  memory-tool.ts:55 — execute()                  │
       │              │  createMemorySearchTool() 안의 execute 콜백      │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ② 매니저 획득                                   │
       │              │  search-manager.ts:19 — getMemorySearchManager() │
       │              │                                                   │
       │              │  QMD 백엔드 시도 (라인 25-41)                   │
       │              │    └→ 실패 시 FallbackMemoryManager 래핑        │
       │              │  최종 폴백: MemoryIndexManager.get() (라인 65)  │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ③ 통합 검색                                      │
       │              │  manager.ts:207 — MemoryIndexManager.search()    │
       │              │                                                   │
       │              │  [임베딩 프로바이더 없음 → FTS-only 모드]        │
       │              │  라인 234: extractKeywords(query)                │
       │              │  라인 247: searchKeyword() 루프                  │
       │              │                                                   │
       │              │  [임베딩 프로바이더 있음 → 하이브리드 모드]      │
       │              │  라인 270: searchKeyword(query, candidates)      │
       │              │  라인 273: embedQueryWithTimeout(query)          │
       │              │  라인 276: searchVector(queryVec, candidates)    │
       │              └──────┬───────────────────┬────────────────────┘
       │                     │                   │
       │         ┌───────────┘                   └──────────────┐
       │         ▼                                               ▼
       │  ┌──────────────────────┐               ┌───────────────────────────┐
       │  │  ④-A 벡터 검색       │               │  ④-B 키워드 검색          │
       │  │  manager-search.ts   │               │  manager-search.ts        │
       │  │  :20 — searchVector()│               │  :136 — searchKeyword()   │
       │  │                      │               │                           │
       │  │  SQLite 쿼리 실행    │               │  hybrid.ts:33             │
       │  │  (라인 35-69)        │               │  buildFtsQuery(query)     │
       │  │  vec_distance_cosine │               │  → "토큰1" AND "토큰2"   │
       │  │  → score = 1 - dist  │               │                           │
       │  └──────────┬───────────┘               │  SQLite FTS 쿼리 실행    │
       │             │ vectorScore                │  (라인 159-176)          │
       │             │                            │  bm25() 순위 계산        │
       │             │                            │                           │
       │             │                            │  hybrid.ts:46            │
       │             │                            │  bm25RankToScore(rank)   │
       │             │                            │  → 1 / (1 + rank)        │
       │             │                            └──────────┬────────────────┘
       │             │                                       │ textScore
       │             └──────────────────┬────────────────────┘
       │                                ▼
       │              ┌─────────────────────────────────────────────────┐
       │              │  ⑤ 결과 병합                                     │
       │              │  hybrid.ts:51 — mergeHybridResults()             │
       │              │                                                   │
       │              │  ID 기준 결과 합치기 (라인 73-119)               │
       │              │  최종 점수 계산 (라인 121-131):                  │
       │              │    score = 0.7 × vectorScore + 0.3 × textScore   │
       │              │  시간 감쇠 적용 (라인 133-139, 비활성 기본)      │
       │              │  MMR 재순위화 (라인 143-148, 비활성 기본)        │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ⑥ 필터링 및 반환                                │
       │              │  memory-tool.ts:73-88                            │
       │              │                                                   │
       │              │  score >= 0.35 필터링                            │
       │              │  상위 6개 슬라이스                               │
       │              │  decorateCitations() — 인용 정보 추가           │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │                        │  tool_result 반환                      │
       │                        │  { results: [...], provider, model } │──►│
       │                        │                               │  [추론]
       │                        │                               │  결과 보고
       │                        │                               │  답변 생성
       │                        │  최종 답변 수신               │◄──────────
       │  "PostgreSQL로         │                               │
       │   결정하셨습니다."     │                               │
       │◄──────────────────────  │                               │
```

---

## 흐름 1 핵심 코드 설명

흐름 1의 각 단계에서 실제로 실행되는 코드를 순서대로 나열합니다.

---

### ① 진입점 — `execute()`

**파일**: [src/agents/tools/memory-tool.ts:55-97](openclaw_git/src/agents/tools/memory-tool.ts#L55-L97)

LLM이 tool_call을 보내면 가장 먼저 실행되는 함수입니다.

```typescript
execute: async (_toolCallId, params) => {
  // LLM이 보낸 파라미터에서 query 문자열을 꺼냄
  const query = readStringParam(params, "query", { required: true });
  const maxResults = readNumberParam(params, "maxResults");
  const minScore = readNumberParam(params, "minScore");

  // 메모리 매니저를 가져옴 (없으면 에러 반환)
  const { manager, error } = await getMemorySearchManager({ cfg, agentId });
  if (!manager) {
    return jsonResult(buildMemorySearchUnavailableResult(error));
  }

  // 실제 검색 실행
  const rawResults = await manager.search(query, {
    maxResults,
    minScore,
    sessionKey: options.agentSessionKey,
  });

  // 인용 정보 붙이기, 글자수 제한 적용
  const status = manager.status();
  const decorated = decorateCitations(rawResults, includeCitations);
  const results =
    status.backend === "qmd"
      ? clampResultsByInjectedChars(decorated, resolved.qmd?.limits.maxInjectedChars)
      : decorated;

  // LLM에게 결과 반환
  return jsonResult({ results, provider: status.provider, model: status.model, ... });
}
```

**설명**
- LLM이 `{ query: "DB 결정" }` 형태로 보낸 파라미터를 파싱해서 꺼냅니다.
- `getMemorySearchManager()`로 검색 엔진(매니저)을 가져옵니다.
- `manager.search()`로 실제 검색을 수행한 뒤, 결과를 JSON으로 포장해 LLM에게 돌려줍니다.

---

### ② 매니저 획득 — `getMemorySearchManager()`

**파일**: [src/memory/search-manager.ts:19-73](openclaw_git/src/memory/search-manager.ts#L19-L73)

어떤 검색 엔진을 쓸지 결정하고 인스턴스를 반환하는 함수입니다.

```typescript
export async function getMemorySearchManager(params: {
  cfg: OpenClawConfig;
  agentId: string;
}): Promise<MemorySearchManagerResult> {
  const resolved = resolveMemoryBackendConfig(params);

  // 설정이 QMD(외부 벡터DB)면 먼저 시도
  if (resolved.backend === "qmd" && resolved.qmd) {
    try {
      const { QmdMemoryManager } = await import("./qmd-manager.js");
      const primary = await QmdMemoryManager.create({ ... });
      if (primary) {
        // QMD가 살아있으면, 실패 시 자동으로 builtin으로 전환하는 래퍼로 감쌈
        const wrapper = new FallbackMemoryManager({
          primary,
          fallbackFactory: async () => {
            const { MemoryIndexManager } = await import("./manager.js");
            return await MemoryIndexManager.get(params); // builtin SQLite
          },
        });
        return { manager: wrapper };
      }
    } catch (err) {
      log.warn(`qmd memory unavailable; falling back to builtin: ${message}`);
    }
  }

  // QMD 없거나 실패 → builtin SQLite 매니저 사용
  const { MemoryIndexManager } = await import("./manager.js");
  const manager = await MemoryIndexManager.get(params);
  return { manager };
}
```

**설명**
- 설정에 따라 두 가지 검색 엔진 중 하나를 선택합니다.
  - **QMD**: 외부 벡터DB (고급 설정 시). 실패하면 자동으로 builtin으로 전환.
  - **MemoryIndexManager**: 기본 내장 SQLite 기반 검색 엔진.
- `FallbackMemoryManager`는 래퍼로, QMD가 중간에 에러를 내면 조용히 builtin으로 전환합니다.

---

### ③ 통합 검색 — `MemoryIndexManager.search()`

**파일**: [src/memory/manager.ts:207-293](openclaw_git/src/memory/manager.ts#L207-L293)

임베딩 프로바이더 유무에 따라 검색 방식을 결정하고, 키워드·벡터 검색을 모두 실행합니다.

```typescript
async search(
  query: string,
  opts?: { maxResults?: number; minScore?: number; sessionKey?: string },
): Promise<MemorySearchResult[]> {
  // 세션 시작 시 메모리 동기화 (비동기, await 안 함 — 블로킹 방지)
  void this.warmSession(opts?.sessionKey);

  // 파일이 변경됐으면 동기화 트리거 (마찬가지로 비동기)
  if (this.settings.sync.onSearch && (this.dirty || this.sessionsDirty)) {
    void this.sync({ reason: "search" }).catch(...);
  }

  const cleaned = query.trim();
  const hybrid = this.settings.query.hybrid;
  // 후보 수 = maxResults * candidateMultiplier (기본 4배)
  const candidates = Math.min(200, Math.max(1, Math.floor(maxResults * hybrid.candidateMultiplier)));

  // --- 임베딩 프로바이더 없음: 키워드 검색만 ---
  if (!this.provider) {
    const keywords = extractKeywords(cleaned); // 구어체 → 핵심 단어 추출
    const resultSets = await Promise.all(
      searchTerms.map((term) => this.searchKeyword(term, candidates))
    );
    // 중복 제거 후 점수 높은 순 정렬
    return merged.filter((e) => e.score >= minScore).slice(0, maxResults);
  }

  // --- 임베딩 프로바이더 있음: 하이브리드 검색 ---
  const keywordResults = hybrid.enabled
    ? await this.searchKeyword(cleaned, candidates)  // BM25 키워드 검색
    : [];

  const queryVec = await this.embedQueryWithTimeout(cleaned); // 쿼리 → 벡터
  const vectorResults = await this.searchVector(queryVec, candidates); // 코사인 검색

  // 두 결과를 가중치로 합산
  const merged = await this.mergeHybridResults({
    vector: vectorResults,
    keyword: keywordResults,
    vectorWeight: hybrid.vectorWeight, // 기본 0.7
    textWeight: hybrid.textWeight,     // 기본 0.3
    mmr: hybrid.mmr,
    temporalDecay: hybrid.temporalDecay,
  });

  return merged.filter((e) => e.score >= minScore).slice(0, maxResults);
}
```

**설명**
- 임베딩 프로바이더(OpenAI 등)가 설정되어 있으면 **하이브리드 모드**, 없으면 **키워드 전용 모드**로 동작합니다.
- `warmSession()`과 `sync()`는 `void`로 띄워서 검색을 블로킹하지 않습니다.
- `candidates`를 maxResults보다 4배 많이 가져와서 병합 후 최상위만 자릅니다. (정확도 향상 목적)

---

### ④-B 키워드 검색 — `searchKeyword()`

**파일**: [src/memory/manager-search.ts:136-191](openclaw_git/src/memory/manager-search.ts#L136-L191)

SQLite의 FTS(Full-Text Search) 기능을 사용해 키워드로 검색합니다.

```typescript
export async function searchKeyword(params: {
  db: DatabaseSync;
  ftsTable: string;       // "chunks_fts"
  query: string;
  buildFtsQuery: (raw: string) => string | null;
  bm25RankToScore: (rank: number) => number;
  ...
}): Promise<Array<SearchRowResult & { textScore: number }>> {
  // 자연어 쿼리를 FTS 형식으로 변환
  // "지난번 DB 결정" → '"지난번" AND "DB" AND "결정"'
  const ftsQuery = params.buildFtsQuery(params.query);
  if (!ftsQuery) return [];

  // SQLite FTS 테이블에 쿼리 실행
  const rows = params.db.prepare(
    `SELECT id, path, source, start_line, end_line, text,
            bm25(chunks_fts) AS rank       -- BM25 관련도 점수 (음수, 낮을수록 좋음)
       FROM chunks_fts
      WHERE chunks_fts MATCH ?             -- FTS 매칭
        AND model = ?
      ORDER BY rank ASC                    -- 관련도 높은 순
      LIMIT ?`
  ).all(ftsQuery, providerModel, limit);

  return rows.map((row) => {
    const textScore = params.bm25RankToScore(row.rank); // 음수 rank → 0~1 점수로 변환
    return { ...row, textScore, score: textScore };
  });
}
```

**설명**
- SQLite의 FTS5 엔진을 사용합니다. 구글 검색처럼 단어 매칭 기반으로 동작합니다.
- `bm25()` 함수가 반환하는 값은 **음수** (더 음수일수록 관련도 높음). 이를 `bm25RankToScore()`로 0~1 사이 점수로 바꿉니다.
- `buildFtsQuery()`가 자연어를 `"단어1" AND "단어2"` 형식으로 변환합니다 (아래 코드 참조).

---

### ④-A 벡터 검색 — `searchVector()`

**파일**: [src/memory/manager-search.ts:20-94](openclaw_git/src/memory/manager-search.ts#L20-L94)

임베딩 벡터 간 코사인 거리로 의미적 유사도를 계산합니다.

```typescript
export async function searchVector(params: {
  db: DatabaseSync;
  vectorTable: string;  // "chunks_vec"
  queryVec: number[];   // 쿼리 임베딩 벡터
  limit: number;
  ensureVectorReady: (dimensions: number) => Promise<boolean>;
  ...
}): Promise<SearchRowResult[]> {
  // sqlite-vec 확장이 사용 가능하면 SQL에서 직접 벡터 연산
  if (await params.ensureVectorReady(params.queryVec.length)) {
    const rows = params.db.prepare(
      `SELECT c.id, c.path, c.start_line, c.end_line, c.text, c.source,
              vec_distance_cosine(v.embedding, ?) AS dist  -- 코사인 거리 (0=동일, 2=정반대)
         FROM chunks_vec v
         JOIN chunks c ON c.id = v.id
        WHERE c.model = ?
        ORDER BY dist ASC   -- 거리 짧은 순 = 유사도 높은 순
        LIMIT ?`
    ).all(
      vectorToBlob(params.queryVec), // float32[] → Buffer 변환
      params.providerModel,
      params.limit
    );

    return rows.map((row) => ({
      ...row,
      score: 1 - row.dist,  // 거리를 유사도 점수로 변환 (1=완전 동일, 0=완전 다름)
    }));
  }

  // sqlite-vec 없으면 메모리에서 직접 코사인 유사도 계산 (폴백)
  const candidates = listChunks({ db, providerModel, sourceFilter });
  const scored = candidates
    .map((chunk) => ({ chunk, score: cosineSimilarity(params.queryVec, chunk.embedding) }))
    .filter((e) => Number.isFinite(e.score));
  return scored.toSorted((a, b) => b.score - a.score).slice(0, params.limit).map(...);
}
```

**설명**
- `vec_distance_cosine()`은 sqlite-vec 확장이 제공하는 SQL 함수입니다. 벡터 간 코사인 거리를 DB 레벨에서 계산하므로 빠릅니다.
- `score = 1 - dist` 변환으로 "거리"를 "유사도"로 뒤집습니다. (거리가 0이면 점수 1.0 = 완전 동일)
- sqlite-vec 확장이 없으면 모든 청크를 메모리로 불러와 직접 계산하는 폴백이 실행됩니다.

---

### FTS 쿼리 생성 — `buildFtsQuery()`

**파일**: [src/memory/hybrid.ts:33-44](openclaw_git/src/memory/hybrid.ts#L33-L44)

자연어 쿼리를 SQLite FTS가 이해하는 형식으로 변환합니다.

```typescript
export function buildFtsQuery(raw: string): string | null {
  // 유니코드 문자/숫자/밑줄만 추출 (특수문자, 조사 등 제거)
  const tokens =
    raw
      .match(/[\p{L}\p{N}_]+/gu)  // 예: "지난번 DB 결정!" → ["지난번", "DB", "결정"]
      ?.map((t) => t.trim())
      .filter(Boolean) ?? [];

  if (tokens.length === 0) return null;

  // 각 토큰을 큰따옴표로 감싸고 AND로 연결
  const quoted = tokens.map((t) => `"${t.replaceAll('"', "")}"`);
  return quoted.join(" AND ");
  // 결과: '"지난번" AND "DB" AND "결정"'
}
```

**설명**
- 조사, 특수문자 등을 제거하고 의미 있는 단어만 추출합니다.
- 각 단어를 `AND`로 연결해서 모든 단어가 포함된 청크만 검색합니다.
- 큰따옴표는 FTS에서 "구문(phrase) 검색"이 아닌 "토큰 보호"를 위해 씁니다.

---

### BM25 점수 변환 — `bm25RankToScore()`

**파일**: [src/memory/hybrid.ts:46-49](openclaw_git/src/memory/hybrid.ts#L46-L49)

SQLite BM25의 음수 점수를 0~1 범위로 정규화합니다.

```typescript
export function bm25RankToScore(rank: number): number {
  // SQLite bm25()는 음수 반환. 절댓값이 클수록 관련도 높음.
  // e.g. rank=-8.5 → normalized=8.5 → score = 1/(1+8.5) ≈ 0.105
  //      rank=-0.5 → normalized=0.5 → score = 1/(1+0.5)  ≈ 0.667
  const normalized = Number.isFinite(rank) ? Math.max(0, rank) : 999;
  //                                          ↑ 음수를 양수로 (절댓값처럼 사용)
  return 1 / (1 + normalized);
  //     ↑ 0에 가까울수록(관련도 낮을수록) 작은 값, 관련도 높을수록 큰 값
}
```

**설명**
- SQLite `bm25()` 함수는 음수를 반환하며, 더 음수일수록 관련도가 높습니다. (예: -8.5가 -0.5보다 관련도 높음)
- `Math.max(0, rank)`로 음수를 양수로 뒤집어서, `1 / (1 + x)` 공식으로 0~1 사이 점수를 만듭니다.
- rank가 0에 가까울수록 점수는 1에 가까워지고 (관련도 높음), 클수록 0에 가까워집니다 (관련도 낮음).

> **주의**: `Math.max(0, rank)`는 음수 rank를 그대로 받아서 양수화합니다. `rank = -8.5` → `Math.max(0, -8.5) = 0`... 이 아니라 rank는 SQLite에서 이미 양수로 오는 경우도 있어 `Math.max(0, rank)`로 음수 방어만 합니다.

---

### ⑤ 결과 병합 — `mergeHybridResults()`

**파일**: [src/memory/hybrid.ts:51-149](openclaw_git/src/memory/hybrid.ts#L51-L149)

벡터 검색 결과와 키워드 검색 결과를 합쳐 최종 점수를 계산합니다.

```typescript
export async function mergeHybridResults(params: {
  vector: HybridVectorResult[];   // 벡터 검색 결과 (각 결과에 vectorScore 있음)
  keyword: HybridKeywordResult[]; // 키워드 검색 결과 (각 결과에 textScore 있음)
  vectorWeight: number;           // 0.7
  textWeight: number;             // 0.3
  mmr?: Partial<MMRConfig>;
  temporalDecay?: Partial<TemporalDecayConfig>;
}): Promise<Array<{ path, startLine, endLine, score, snippet, source }>> {

  // 1단계: 청크 ID 기준으로 두 결과를 하나의 Map에 합침
  const byId = new Map();

  for (const r of params.vector) {
    byId.set(r.id, { ...r, vectorScore: r.vectorScore, textScore: 0 });
    //                                                  ↑ 키워드 결과 없으면 0
  }
  for (const r of params.keyword) {
    const existing = byId.get(r.id);
    if (existing) {
      existing.textScore = r.textScore; // 같은 청크가 두 결과에 모두 있으면 병합
    } else {
      byId.set(r.id, { ...r, vectorScore: 0, textScore: r.textScore });
      //                       ↑ 벡터 결과 없으면 0
    }
  }

  // 2단계: 최종 점수 = 가중 합산
  const merged = Array.from(byId.values()).map((entry) => ({
    ...entry,
    score: params.vectorWeight * entry.vectorScore   // 0.7 × 벡터점수
         + params.textWeight  * entry.textScore,     // 0.3 × 키워드점수
  }));

  // 3단계: 시간 감쇠 적용 (기본 비활성)
  // 오래된 메모리일수록 점수를 낮춤
  const decayed = await applyTemporalDecayToHybridResults({ results: merged, ... });

  // 4단계: 점수 높은 순으로 정렬
  const sorted = decayed.toSorted((a, b) => b.score - a.score);

  // 5단계: MMR 재순위화 (기본 비활성)
  // 결과가 너무 비슷한 것끼리 묶이지 않도록 다양성 보장
  if (mmrConfig.enabled) {
    return applyMMRToHybridResults(sorted, mmrConfig);
  }

  return sorted;
}
```

**설명**
- 벡터 검색과 키워드 검색은 각자 독립적으로 실행되어 결과를 가져옵니다.
- 같은 청크가 두 검색 모두에서 나왔다면 두 점수를 합산해 가중치를 적용합니다. **두 검색 모두에서 나온 청크가 가장 높은 점수**를 받습니다.
- `0.7 × vectorScore + 0.3 × textScore` 공식으로 최종 점수 계산. 벡터(의미) 검색을 더 신뢰합니다.
- 시간 감쇠(temporalDecay)와 MMR은 기본적으로 꺼져 있어 평소에는 실행되지 않습니다.

---

## 흐름 2: 자동 회상 Auto-Recall (대화 시작 전)

사용자 메시지가 LLM에 전달되기 **전에** OpenClaw가 자동으로 관련 메모리를 주입하는 흐름.

```
  사용자 (User)              OpenClaw                      LLM (AI 모델)
       │                        │                               │
       │  "나 Python 좋아해"    │                               │
       │──────────────────────► │                               │
       │                        │                               │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ① Hook 실행                                      │
       │              │  run.ts:263 — hookRunner.runBeforeAgentStart()   │
       │              │  plugins/hooks.ts:297 — runModifyingHook()        │
       │              │                                                   │
       │              │  등록된 플러그인 핸들러를 순차 실행               │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ② 자동 회상 핸들러                               │
       │              │  memory-lancedb/index.ts:540                     │
       │              │  api.on("before_agent_start", async (event) => { │
       │              │                                                   │
       │              │  event.prompt = "나 Python 좋아해"               │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ③ 프롬프트 임베딩                                │
       │              │  index.ts:546 — embeddings.embed(event.prompt)   │
       │              │  → OpenAI API (또는 설정된 프로바이더) 호출       │
       │              │  → [0.12, -0.45, 0.89, ...] 벡터 반환           │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ④ LanceDB 벡터 검색                              │
       │              │  index.ts:547 — db.search(vector, 3, 0.3)        │
       │              │  MemoryDB.search() (index.ts:97-131)             │
       │              │                                                   │
       │              │  LanceDB 테이블에서 코사인 유사도 검색            │
       │              │  top 3, minScore=0.3                             │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ⑤ 메모리 컨텍스트 구성                           │
       │              │  index.ts:554 — formatRelevantMemoriesContext()  │
       │              │                                                   │
       │              │  반환값:                                          │
       │              │  { prependContext: "<relevant-memories>..." }    │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ⑥ 컨텍스트 병합                                  │
       │              │  plugins/hooks.ts:138                            │
       │              │  mergeBeforePromptBuild(acc, next)               │
       │              │                                                   │
       │              │  최종 프롬프트 =                                  │
       │              │  <relevant-memories>                             │
       │              │    신뢰 불가, 과거 기록                           │
       │              │    1.[preference] Python 선호                    │
       │              │    2.[fact] 회사: Acme Corp                      │
       │              │  </relevant-memories>                            │
       │              │  + 원래 사용자 메시지                             │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │                        │  메모리가 삽입된 전체 메시지 전달       │
       │                        │──────────────────────────────────────►│
       │                        │                               │  [추론]
       │                        │                               │  과거 기억을
       │                        │                               │  참고해서 답변
```

---

## 흐름 3: 자동 캡처 Auto-Capture (대화 종료 후)

대화가 끝난 후 OpenClaw가 **사용자 모르게** 백그라운드에서 메모리를 저장하는 흐름.

```
  사용자 (User)              OpenClaw                      LLM (AI 모델)
       │                        │                               │
       │                        │           최종 답변 생성      │◄──────────────
       │  답변 수신             │                               │
       │◄──────────────────────  │                               │
       │                        │                               │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ① Hook 실행                                      │
       │              │  plugins/hooks.ts:317 — runAgentEnd()            │
       │              │  runVoidHook("agent_end", event, ctx)            │
       │              │                                                   │
       │              │  모든 agent_end 핸들러를 병렬 실행                │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ② 자동 캡처 핸들러                               │
       │              │  memory-lancedb/index.ts:568                     │
       │              │  api.on("agent_end", async (event) => {          │
       │              │                                                   │
       │              │  event.success 확인 (라인 570)                   │
       │              │  event.messages 확인 (라인 570)                  │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ③ 사용자 메시지만 추출                           │
       │              │  index.ts:573-612                                │
       │              │                                                   │
       │              │  for (msg of event.messages)                     │
       │              │    if (msg.role !== "user") continue ← AI 출력 제외│
       │              │    texts.push(msg.content)                       │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ④ 저장 가치 필터링                               │
       │              │  index.ts:615 — shouldCapture(text)              │
       │              │  (index.ts:236-263에 구현)                       │
       │              │                                                   │
       │              │  검사 항목:                                       │
       │              │  • 길이 10~500자인가?                             │
       │              │  • <relevant-memories> 포함? → 제외              │
       │              │  • XML 태그 시작? → 제외                         │
       │              │  • 마크다운 (**과 \n-) 과다? → 제외              │
       │              │  • 이모지 3개 초과? → 제외                       │
       │              │  • 프롬프트 주입 패턴? → 제외                    │
       │              │  • MEMORY_TRIGGERS 패턴 매칭?                    │
       │              │    /prefer|like|love|hate/i 등                   │
       │              └─────────┬───────────────────────────────────────┘
       │                        │ 필터 통과
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ⑤ 카테고리 감지                                  │
       │              │  index.ts:623 — detectCategory(text)             │
       │              │  (index.ts:265-280에 구현)                       │
       │              │                                                   │
       │              │  prefer/like → "preference"                      │
       │              │  decided/will use → "decision"                   │
       │              │  전화번호/이메일 → "entity"                       │
       │              │  is/are/has → "fact"                             │
       │              │  그 외 → "other"                                 │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ⑥ 임베딩 변환                                    │
       │              │  index.ts:624 — embeddings.embed(text)           │
       │              │  → OpenAI API 호출                               │
       │              │  → 숫자 벡터 반환                                │
       │              └─────────┬───────────────────────────────────────┘
       │                        │
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ⑦ 중복 검사                                      │
       │              │  index.ts:627 — db.search(vector, 1, 0.95)      │
       │              │                                                   │
       │              │  유사도 0.95 이상인 메모리가 이미 있으면 건너뜀  │
       │              └─────────┬───────────────────────────────────────┘
       │                        │ 중복 없음
       │              ┌─────────┴───────────────────────────────────────┐
       │              │  ⑧ LanceDB 저장                                   │
       │              │  index.ts:629 — db.store({                       │
       │              │    text,                                          │
       │              │    vector,                                        │
       │              │    importance: 0.7,                              │
       │              │    category: "preference" | "fact" | ...         │
       │              │  })                                               │
       │              │  MemoryDB.store() (index.ts:67-95)               │
       │              └─────────────────────────────────────────────────┘
       │
       ※ 이 과정 전체가 백그라운드 실행 — 사용자는 인식하지 못함
```

---

## 호출되는 함수 전체 목록

### 수동 검색 (memory_search)

| 순서 | 파일 | 라인 | 함수 / 코드 |
|------|------|------|------------|
| 1 | [memory-tool.ts](openclaw_git/src/agents/tools/memory-tool.ts#L40) | 40-99 | `createMemorySearchTool()` — 도구 생성 |
| 2 | [memory-tool.ts](openclaw_git/src/agents/tools/memory-tool.ts#L55) | 55 | `execute()` — tool_call 진입점 |
| 3 | [memory-tool.ts](openclaw_git/src/agents/tools/memory-tool.ts#L59) | 59 | `readStringParam(params, "query")` — 파라미터 파싱 |
| 4 | [search-manager.ts](openclaw_git/src/memory/search-manager.ts#L19) | 19 | `getMemorySearchManager({cfg, agentId})` |
| 5 | [search-manager.ts](openclaw_git/src/memory/search-manager.ts#L24) | 24 | `resolveMemoryBackendConfig()` — 백엔드 결정 |
| 6 | [search-manager.ts](openclaw_git/src/memory/search-manager.ts#L65) | 65 | `MemoryIndexManager.get(params)` — SQLite 매니저 |
| 7 | [manager.ts](openclaw_git/src/memory/manager.ts#L207) | 207 | `MemoryIndexManager.search(query, opts)` |
| 8 | [manager.ts](openclaw_git/src/memory/manager.ts#L216) | 216 | `this.sync({reason:"search"})` — 필요시 동기화 |
| 9 | [manager.ts](openclaw_git/src/memory/manager.ts#L270) | 270 | `this.searchKeyword(cleaned, candidates)` |
| 10 | [manager.ts](openclaw_git/src/memory/manager.ts#L273) | 273 | `this.embedQueryWithTimeout(cleaned)` — 임베딩 |
| 11 | [manager.ts](openclaw_git/src/memory/manager.ts#L276) | 276 | `this.searchVector(queryVec, candidates)` |
| 12 | [manager-search.ts](openclaw_git/src/memory/manager-search.ts#L20) | 20 | `searchVector()` — 코사인 유사도 SQL |
| 13 | [manager-search.ts](openclaw_git/src/memory/manager-search.ts#L136) | 136 | `searchKeyword()` — BM25 FTS SQL |
| 14 | [hybrid.ts](openclaw_git/src/memory/hybrid.ts#L33) | 33 | `buildFtsQuery(raw)` — FTS 쿼리 토큰화 |
| 15 | [hybrid.ts](openclaw_git/src/memory/hybrid.ts#L46) | 46 | `bm25RankToScore(rank)` — 점수 정규화 |
| 16 | [hybrid.ts](openclaw_git/src/memory/hybrid.ts#L51) | 51 | `mergeHybridResults({vector, keyword, ...})` |
| 17 | [memory-tool.ts](openclaw_git/src/agents/tools/memory-tool.ts#L77) | 77 | `manager.status()` — 상태 정보 수집 |
| 18 | [memory-tool.ts](openclaw_git/src/agents/tools/memory-tool.ts#L79) | 79 | `decorateCitations(rawResults, ...)` — 인용 추가 |

### 자동 회상 (Auto-Recall)

| 순서 | 파일 | 라인 | 함수 / 코드 |
|------|------|------|------------|
| 1 | [run.ts](openclaw_git/src/agents/pi-embedded-runner/run.ts#L263) | 263 | `hookRunner.runBeforeAgentStart({prompt}, ctx)` |
| 2 | [hooks.ts](openclaw_git/src/plugins/hooks.ts#L297) | 297 | `runModifyingHook("before_agent_start", ...)` |
| 3 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L540) | 540 | `api.on("before_agent_start", handler)` — 핸들러 |
| 4 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L546) | 546 | `embeddings.embed(event.prompt)` — 임베딩 |
| 5 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L547) | 547 | `db.search(vector, 3, 0.3)` — 벡터 검색 |
| 6 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L97) | 97 | `MemoryDB.search()` — LanceDB 쿼리 |
| 7 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L554) | 554 | `formatRelevantMemoriesContext(results)` — 포맷 |
| 8 | [hooks.ts](openclaw_git/src/plugins/hooks.ts#L138) | 138 | `mergeBeforePromptBuild(acc, next)` — 컨텍스트 병합 |

### 자동 캡처 (Auto-Capture)

| 순서 | 파일 | 라인 | 함수 / 코드 |
|------|------|------|------------|
| 1 | [hooks.ts](openclaw_git/src/plugins/hooks.ts#L317) | 317 | `runAgentEnd(event, ctx)` |
| 2 | [hooks.ts](openclaw_git/src/plugins/hooks.ts#L194) | 194 | `runVoidHook("agent_end", ...)` — 병렬 실행 |
| 3 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L568) | 568 | `api.on("agent_end", handler)` — 핸들러 |
| 4 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L573) | 573 | 메시지 루프 — `role === "user"` 필터 |
| 5 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L615) | 615 | `shouldCapture(text, {maxChars})` — 필터링 |
| 6 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L236) | 236 | `shouldCapture()` 구현 — MEMORY_TRIGGERS 매칭 |
| 7 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L623) | 623 | `detectCategory(text)` — 카테고리 분류 |
| 8 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L265) | 265 | `detectCategory()` 구현 |
| 9 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L624) | 624 | `embeddings.embed(text)` — 임베딩 변환 |
| 10 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L627) | 627 | `db.search(vector, 1, 0.95)` — 중복 검사 |
| 11 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L629) | 629 | `db.store({text, vector, importance, category})` |
| 12 | [memory-lancedb/index.ts](openclaw_git/extensions/memory-lancedb/index.ts#L67) | 67 | `MemoryDB.store()` — LanceDB 삽입 |

---

## 데이터가 변하는 과정 예시

```
쿼리 입력: "지난주에 논의한 프로젝트 타이틀이 뭐였지?"
      │
      │ [embedQueryWithTimeout]
      ▼
임베딩 벡터: [0.12, -0.45, 0.89, 0.03, -0.22, ...]  ← 384개 숫자
      │
      ├─[searchVector] SQL: vec_distance_cosine(embedding, query_vec)
      │   결과: chunk-42 dist=0.08 → score=0.92
      │         chunk-87 dist=0.13 → score=0.87
      │         chunk-103 dist=0.19 → score=0.81
      │
      ├─[searchKeyword] FTS: "프로젝트" AND "타이틀" AND "논의"
      │   결과: chunk-42 BM25=-4.2 → textScore=0.88
      │         chunk-200 BM25=-7.1 → textScore=0.75
      │
      └─[mergeHybridResults]
          chunk-42:  0.7×0.92 + 0.3×0.88 = 0.908  ← 1위
          chunk-87:  0.7×0.87 + 0.3×0.00 = 0.609  ← 2위
          chunk-103: 0.7×0.81 + 0.3×0.00 = 0.567  ← 3위
          chunk-200: 0.7×0.00 + 0.3×0.75 = 0.225  ← score < 0.35 제외

최종 반환:
[
  { path:"MEMORY.md", startLine:120, score:0.908,
    snippet:"프로젝트 AlphaX는 Q1에 시작할 예정...",
    citation:"MEMORY.md#L120-L125" },
  { path:"sessions/2024-01.md", startLine:456, score:0.609,
    snippet:"최종 타이틀은 AlphaX로..." }
]
```

---

*분석일: 2026-02-27*
*대상: openclaw_git 소스코드*
