# IndexDB 공지사항 폴백 실행계획

## 요구사항 요약

**요구사항**: 공지사항 API 호출 실패 시 IndexedDB에서 데이터를 가져오는 폴백 구조 구현

**목적**: API/DB 없이 프론트엔드 단독으로 공지사항 페이지를 테스트할 수 있도록 한다. IndexedDB는 임시 Mock 역할로, 나중에 API가 완성되면 제거한다.

## 현재상태 분석

- `noticeService.js`: axios로 `/api/v1/notices` 직접 호출, 실패 처리 없음
- `NoticeListPage.jsx`: `getNotices()` 결과를 그대로 state에 저장
- `NoticeDetailPage.jsx`: `getNotice(id)` 결과를 그대로 state에 저장
- IndexedDB 관련 코드 없음, 폴백 로직 없음

## 구현 방법

- IndexedDB를 다루는 유틸 모듈을 별도 파일로 생성
- IndexedDB에 Mock 데이터를 초기 삽입하는 초기화 함수 작성
- `noticeService.js`에서 axios 실패 시 IndexedDB 유틸을 호출하는 try/catch 폴백 추가
- 페이지 컴포넌트는 수정하지 않음 (서비스 레이어에서 처리)

## 구현 단계

### 1. IndexedDB 유틸 모듈 생성

```javascript
// frontend/src/utils/noticeIndexDB.js
const DB_NAME = 'pinball_notice_db';
const DB_VERSION = 1;
const STORE_NAME = 'notices';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}
```
- **무엇을 하는가**: IndexedDB를 열고, 없으면 `notices` store를 생성하는 함수
- `onupgradeneeded`는 DB가 처음 생성되거나 버전이 바뀔 때만 실행됨
- `keyPath: 'id'`로 각 공지사항을 id로 식별

### 2. Mock 데이터 초기화 함수 추가

```javascript
// frontend/src/utils/noticeIndexDB.js (이어서)
const MOCK_NOTICES = [
  { id: 1, title: '[공지] 서비스 오픈 안내', content: '<p>핀볼 웹 서비스가 오픈되었습니다.</p>', created_at: '2026-03-01T00:00:00' },
  { id: 2, title: '[공지] 점검 안내', content: '<p>3월 10일 오전 2시~4시 서버 점검이 있습니다.</p>', created_at: '2026-03-05T00:00:00' },
];

export async function seedNoticesIfEmpty() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const count = await new Promise((res) => {고
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => res(req.result);
  });
  if (count === 0) {
    const writeTx = db.transaction(STORE_NAME, 'readwrite');
    MOCK_NOTICES.forEach((n) => writeTx.objectStore(STORE_NAME).put(n));
  }
}
```
- **무엇을 하는가**: DB가 비어있을 때만 Mock 공지 2건을 삽입하는 초기화 함수
- 이미 데이터가 있으면 중복 삽입하지 않음
- Mock 데이터는 실제 API 응답 구조(`id`, `title`, `content`, `created_at`)와 동일한 형태

### 3. IndexedDB 조회 함수 추가

```javascript
// frontend/src/utils/noticeIndexDB.js (이어서)
export async function getAllNoticesFromDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getNoticeFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(Number(id));
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = (e) => reject(e.target.error);
  });
}
```
- **무엇을 하는가**: 전체 공지 목록 조회(`getAll`)와 단건 조회(`get`)를 Promise로 래핑
- `getNoticeFromDB(id)`는 URL 파라미터가 문자열이므로 `Number(id)`로 변환

### 4. noticeService.js에 폴백 로직 추가

```javascript
// frontend/src/services/noticeService.js
import axios from 'axios';
import { seedNoticesIfEmpty, getAllNoticesFromDB, getNoticeFromDB } from '../utils/noticeIndexDB';

export const getNotices = async () => {
  try {
    const res = await axios.get('/api/v1/notices');
    return res.data;
  } catch {
    await seedNoticesIfEmpty();
    return getAllNoticesFromDB();
  }
};

export const getNotice = async (id) => {
  try {
    const res = await axios.get(`/api/v1/notices/${id}`);
    return res.data;
  } catch {
    await seedNoticesIfEmpty();
    return getNoticeFromDB(id);
  }
};

// createNotice, deleteNotice, uploadNoticeImage는 그대로 유지
export const createNotice = (title, content) =>
  axios.post('/api/v1/notices', { title, content }).then(res => res.data);

export const deleteNotice = (id) =>
  axios.delete(`/api/v1/notices/${id}`).then(res => res.data);

export const uploadNoticeImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post('/api/v1/notices/upload-image', formData).then(res => res.data);
};
```
- **무엇을 하는가**: axios 호출 실패 시 IndexedDB에서 데이터를 반환하는 폴백 구조
- `try/catch`로 API 실패를 감지하고, IndexedDB에서 Mock 데이터 반환
- 쓰기 작업(`create`, `delete`, `uploadImage`)은 폴백 없이 그대로 유지

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/utils/noticeIndexDB.js` | 생성 | IndexedDB 열기, Mock 데이터 초기화, 조회 함수 |
| `frontend/src/services/noticeService.js` | 수정 | `getNotices`, `getNotice`에 try/catch 폴백 추가 |

## 완료 체크리스트

- [ ] API 서버 없이 `/notice` 페이지에 접근했을 때 공지 목록 32건이 보인다
- [ ] 목록에서 공지를 클릭하면 상세 페이지에 제목과 내용이 정상 표시된다
- [ ] 브라우저 개발자 도구 → Application → IndexedDB → `pinball_notice_db` → `notices` 에 데이터가 저장되어 있다
- [ ] API가 정상일 때는 IndexedDB가 아닌 API 응답 데이터가 표시된다
- [ ] 콘솔에 에러 없이 페이지가 렌더링된다
