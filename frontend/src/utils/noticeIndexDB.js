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

const MOCK_NOTICES = [
  { id: 1, title: '[공지] 서비스 오픈 안내', content: '<p>핀볼 웹 서비스가 오픈되었습니다.</p>', created_at: '2026-03-01T00:00:00' },
  { id: 2, title: '[공지] 점검 안내', content: '<p>3월 10일 오전 2시~4시 서버 점검이 있습니다.</p>', created_at: '2026-03-05T00:00:00' },
];

export async function seedNoticesIfEmpty() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const count = await new Promise((res) => {
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => res(req.result);
  });
  if (count === 0) {
    const writeTx = db.transaction(STORE_NAME, 'readwrite');
    MOCK_NOTICES.forEach((n) => writeTx.objectStore(STORE_NAME).put(n));
  }
}

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
