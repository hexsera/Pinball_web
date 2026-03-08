# 공지사항 이미지 Base64 방식 프론트엔드 실행계획

## 요구사항 요약

**요구사항**: 공지사항 작성 시 이미지를 Base64로 변환해 HTML content에 포함 저장하고, 상세 페이지에서 그대로 렌더링한다.

**목적**: 별도 파일 업로드 서버 API 없이 브라우저의 `FileReader` API만으로 이미지를 처리해 구현을 단순화한다.

## 현재상태 분석

- `NoticeWritePage.jsx`: `handleImageUpload`가 `uploadNoticeImage(file)` 호출 — 서버에 파일 전송 후 URL 반환 방식으로 구현됨.
- `noticeService.js`: `uploadNoticeImage` 함수가 `POST /api/v1/notices/upload-image` 호출 — 현재 PRD와 불일치.
- `NoticeDetailPage.jsx`: `dangerouslySetInnerHTML`로 HTML 렌더링 — 변경 불필요.
- 백엔드에 `upload-image` API가 구현되지 않은 상태.

## 구현 방법

- `NoticeWritePage.jsx`의 `handleImageUpload`를 `FileReader.readAsDataURL()`로 교체한다.
- 이미지 선택 시 서버 통신 없이 브라우저에서 즉시 Base64 문자열로 변환 후 Tiptap 에디터에 `<img src="data:image/...;base64,...">` 형태로 삽입한다.
- `noticeService.js`에서 `uploadNoticeImage` 함수를 제거한다.
- 저장 시 `editor.getHTML()`이 Base64 img 태그를 포함한 HTML을 반환하므로 기존 `createNotice` 호출은 그대로 유지한다.

## 구현 단계

### 1. NoticeWritePage.jsx — handleImageUpload를 Base64 방식으로 교체

```jsx
// 변경 전
const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const data = await uploadNoticeImage(file);
  editor.chain().focus().setImage({ src: data.url }).run();
};

// 변경 후
const handleImageUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editor.chain().focus().setImage({ src: reader.result }).run();
  };
  reader.readAsDataURL(file);
};
```

- **무엇을 하는가**: 서버 API 호출을 제거하고, 브라우저 내장 `FileReader`로 이미지를 Base64 data URI로 변환해 에디터에 삽입한다.
- `reader.result`는 `"data:image/png;base64,..."` 형태의 문자열이며, `<img src>` 값으로 직접 사용 가능하다.
- `async/await` 제거 — 서버 통신이 없으므로 비동기 처리 불필요.

### 2. NoticeWritePage.jsx — import에서 uploadNoticeImage 제거

```jsx
// 변경 전
import { createNotice, uploadNoticeImage } from '../../services/noticeService';

// 변경 후
import { createNotice } from '../../services/noticeService';
```

- **무엇을 하는가**: 더 이상 사용하지 않는 `uploadNoticeImage` import를 제거한다.
- 사용하지 않는 import를 남겨두면 빌드 경고가 발생할 수 있다.

### 3. noticeService.js — uploadNoticeImage 함수 제거

```js
// 제거할 코드
export const uploadNoticeImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post('/api/v1/notices/upload-image', formData).then(res => res.data);
};
```

- **무엇을 하는가**: PRD에서 제거된 `upload-image` API 호출 함수를 서비스 레이어에서도 삭제한다.
- 이 함수를 남겨두면 존재하지 않는 API를 참조하는 Dead Code가 된다.

### 4. noticeService.test.js — uploadNoticeImage 테스트 2개 제거

```js
// 제거할 describe 블록 전체
describe('uploadNoticeImage', () => {
  it('POST /api/v1/notices/upload-image를 FormData로 호출한다', ...);
  it('서버 응답 data를 반환한다', ...);
});
```

- **무엇을 하는가**: 삭제된 `uploadNoticeImage` 함수에 대한 테스트를 제거한다.
- 존재하지 않는 export를 import하는 테스트가 남아있으면 테스트 실행 자체가 실패한다.
- `noticeService.test.js` 상단의 `import { ..., uploadNoticeImage }` 에서도 `uploadNoticeImage`를 제거한다.

### 5. NoticeWritePage.test.jsx — uploadNoticeImage mock 제거 및 이미지 삽입 테스트 교체

```jsx
// 변경 전 mock
vi.mock('../services/noticeService', () => ({
  createNotice: vi.fn().mockResolvedValue({ id: 1 }),
  uploadNoticeImage: vi.fn().mockResolvedValue({ url: '/uploads/img.png' }),
}));

// 변경 후 mock
vi.mock('../services/noticeService', () => ({
  createNotice: vi.fn().mockResolvedValue({ id: 1 }),
}));
```

- **무엇을 하는가**: 삭제된 `uploadNoticeImage` mock을 제거하고, 이미지 삽입 동작을 FileReader 기반으로 검증하는 테스트로 교체한다.
- `import { createNotice } from '../services/noticeService'` — `uploadNoticeImage` import도 함께 제거한다.
- 아래 이미지 삽입 테스트를 `NoticeWritePage 인터랙션` describe 블록에 추가한다.

```jsx
// 추가할 테스트 — FileReader로 이미지 삽입 시 setImage가 호출된다
it('이미지 파일 선택 시 FileReader로 Base64 변환 후 setImage가 호출된다', async () => {
  const mockSetImage = vi.fn();
  // Tiptap mock의 setImage가 호출되는지 확인하기 위해 spy 설정
  const mockEditorChainSpy = () => ({
    focus: () => ({
      setImage: (args) => { mockSetImage(args); return { run: vi.fn() }; },
    }),
  });
  // FileReader mock
  const mockReadAsDataURL = vi.fn();
  global.FileReader = class {
    readAsDataURL(file) { mockReadAsDataURL(file); this.onload({ target: { result: 'data:image/png;base64,abc' } }); }
  };

  const input = document.querySelector('input[type="file"]');
  const file = new File(['img'], 'test.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });

  expect(mockSetImage).toHaveBeenCalledWith({ src: 'data:image/png;base64,abc' });
});
```

- `FileReader`를 전역 mock으로 교체해 jsdom 환경에서 `readAsDataURL` 동작을 시뮬레이션한다.
- `onload` 콜백이 즉시 실행되도록 구성해 비동기 처리 없이 검증한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/Notice/NoticeWritePage.jsx` | 수정 | `handleImageUpload`를 FileReader Base64 방식으로 교체, import 정리 |
| `frontend/src/services/noticeService.js` | 수정 | `uploadNoticeImage` 함수 제거 |
| `frontend/src/test/noticeService.test.js` | 수정 | `uploadNoticeImage` describe 블록 제거, import 정리 |
| `frontend/src/test/NoticeWritePage.test.jsx` | 수정 | `uploadNoticeImage` mock 제거, FileReader 기반 이미지 삽입 테스트 추가 |

## 완료 체크리스트

- [ ] 이미지 버튼 클릭 후 파일 선택 시 네트워크 탭에 upload 요청이 발생하지 않는다.
- [ ] 에디터에 이미지가 즉시 삽입되어 미리보기로 보인다.
- [ ] 저장 후 상세 페이지에서 이미지가 텍스트 사이에 정상 렌더링된다.
- [ ] `npm run test:run` 실행 시 모든 테스트가 통과한다.
- [ ] `npm run build` 시 빌드 오류 및 경고가 없다.
