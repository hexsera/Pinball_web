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

function makeLorem(paragraphs = 8) {
  const sentences = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
    'Excepteur sint occaecat cupidatat non proident, sunt in culpa.',
    'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
    'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
    'Ut labore et dolore magnam aliquam quaerat voluptatem.',
    'Quis autem vel eum iure reprehenderit qui in ea voluptate velit.',
    'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus.',
    'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil.',
    'Quid est enim aliud gigantum scelus praeter conatum depellere nos a deo?',
    'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis.',
    'Nam libero tempore, cum soluta nobis est eligendi optio.',
    'Itaque earum rerum hic tenetur a sapiente delectus ut aut reiciendis.',
    'Quis nostrum exercitationem ullam corporis suscipit laboriosam.',
    'Nisi ut aliquid ex ea commodi consequatur voluptas nulla pariatur.',
    'Sed perspiciatis unde omnis iste natus error sit voluptatem accusantium.',
    'Totam rem aperiam eaque ipsa quae ab illo inventore veritatis.',
    'Quasi architecto beatae vitae dicta sunt explicabo aspernatur aut.',
  ];
  const lines = [];
  for (let i = 0; i < paragraphs; i++) {
    const s1 = sentences[i % sentences.length];
    const s2 = sentences[(i + 3) % sentences.length];
    const s3 = sentences[(i + 7) % sentences.length];
    const s4 = sentences[(i + 11) % sentences.length];
    const s5 = sentences[(i + 15) % sentences.length];
    lines.push(`<p>${s1} ${s2} ${s3}</p>`);
    lines.push(`<p>${s4} ${s5}</p>`);
    lines.push(`<p>${s2} ${s3} ${s4} ${s1}</p>`);
    lines.push(`<p>${s5} ${s1}</p>`);
    lines.push(`<p>${s3} ${s4} ${s5}</p>`);
  }
  return lines.join('\n');
}

const NOTICE_DEFS = [
  { id:  1, title: '[공지] 서비스 오픈 안내',            date: '2025-01-01' },
  { id:  2, title: '[공지] 서버 점검 안내 (1월)',         date: '2025-01-10' },
  { id:  3, title: '[업데이트] v1.1 패치 노트',           date: '2025-01-20' },
  { id:  4, title: '[공지] 이용약관 변경 안내',           date: '2025-02-01' },
  { id:  5, title: '[공지] 개인정보 처리방침 개정',       date: '2025-02-10' },
  { id:  6, title: '[이벤트] 2월 랭킹 보상 안내',        date: '2025-02-15' },
  { id:  7, title: '[업데이트] v1.2 패치 노트',           date: '2025-02-22' },
  { id:  8, title: '[공지] 서버 점검 안내 (3월)',         date: '2025-03-05' },
  { id:  9, title: '[이벤트] 봄맞이 특별 이벤트',        date: '2025-03-10' },
  { id: 10, title: '[공지] 닉네임 정책 변경 안내',        date: '2025-03-15' },
  { id: 11, title: '[업데이트] v1.3 패치 노트',           date: '2025-03-25' },
  { id: 12, title: '[공지] 신규 스테이지 오픈',           date: '2025-04-01' },
  { id: 13, title: '[이벤트] 4월 랭킹 보상 안내',        date: '2025-04-10' },
  { id: 14, title: '[공지] 서버 점검 안내 (4월)',         date: '2025-04-18' },
  { id: 15, title: '[업데이트] v1.4 패치 노트',           date: '2025-04-28' },
  { id: 16, title: '[공지] 계정 보안 강화 안내',          date: '2025-05-02' },
  { id: 17, title: '[이벤트] 어린이날 기념 이벤트',       date: '2025-05-05' },
  { id: 18, title: '[공지] 친구 기능 오픈 안내',          date: '2025-05-12' },
  { id: 19, title: '[업데이트] v1.5 패치 노트',           date: '2025-05-20' },
  { id: 20, title: '[공지] 서버 점검 안내 (6월)',         date: '2025-06-03' },
  { id: 21, title: '[이벤트] 여름 시즌 랭킹전 안내',     date: '2025-06-15' },
  { id: 22, title: '[업데이트] v2.0 메이저 패치 노트',   date: '2025-07-01' },
  { id: 23, title: '[공지] 점수 시스템 개편 안내',        date: '2025-07-10' },
  { id: 24, title: '[이벤트] 여름방학 특별 이벤트',       date: '2025-07-20' },
  { id: 25, title: '[공지] 서버 점검 안내 (8월)',         date: '2025-08-05' },
  { id: 26, title: '[업데이트] v2.1 패치 노트',           date: '2025-08-18' },
  { id: 27, title: '[이벤트] 추석 기념 이벤트',           date: '2025-09-10' },
  { id: 28, title: '[공지] UI/UX 개편 안내',              date: '2025-10-01' },
  { id: 29, title: '[업데이트] v2.2 패치 노트',           date: '2025-11-01' },
  { id: 30, title: '[이벤트] 연말 랭킹 보상 안내',        date: '2025-12-01' },
  { id: 31, title: '[공지] 서버 점검 안내 (12월)',        date: '2025-12-15' },
  { id: 32, title: '[업데이트] v2.3 연말 패치 노트',      date: '2025-12-25' },
];

const MOCK_NOTICES = NOTICE_DEFS.map(({ id, title, date }) => ({
  id,
  title,
  content: makeLorem(8),
  created_at: `${date}T00:00:00`,
}));

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
