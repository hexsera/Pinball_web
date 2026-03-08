# NoticeWritePage.jsx 코드 설명

## 전체 흐름 (아스키 다이어그램)

```
[사용자가 이미지 파일 선택]
         |
         v
[FileReader: 파일을 Base64 문자열로 변환]
  → 서버에 업로드 X, 브라우저 메모리에만 존재
         |
         v
[Image 객체: Base64를 실제 이미지로 로드]
  → 원본 가로/세로 크기를 알아내기 위함
         |
         v
[Canvas: 이미지를 800px 이하로 축소 + JPEG 80% 품질로 재인코딩]
  → 결과물도 Base64 문자열
         |
         v
[Tiptap editor: Base64 문자열을 src로 갖는 이미지 노드 삽입]
  → ProseMirror 문서 모델에 <image> 노드 추가
         |
         v
[EditorContent: 문서 모델을 실제 DOM(<img> 태그)으로 렌더링]
  → 화면에 이미지가 보임
         |
         v
[저장 버튼 클릭: editor.getHTML() 호출]
  → <img src="data:image/jpeg;base64,..."> 포함된 HTML 문자열 반환
         |
         v
[createNotice(title, content): 백엔드 API로 전송 → DB 저장]
```

---

## 한 줄씩 상세 설명

### import 구역 (1~9번 줄)

```js
import { useState, useContext, useEffect } from 'react';
```
- `useState`: 컴포넌트 안에서 변하는 값(상태)을 저장하는 React 기능
- `useContext`: 전역으로 공유된 데이터(로그인 정보 등)를 가져오는 React 기능
- `useEffect`: 컴포넌트가 화면에 나타나거나 특정 값이 바뀔 때 실행할 코드를 등록하는 React 기능

```js
import { useNavigate } from 'react-router-dom';
```
- `useNavigate`: 다른 페이지로 이동시켜주는 함수를 제공. 예) `/notice`로 이동

```js
import { useEditor, EditorContent } from '@tiptap/react';
```
- `useEditor`: Tiptap 에디터 인스턴스(편집기 객체)를 생성하는 훅
- `EditorContent`: 에디터 내용을 실제 화면에 렌더링하는 컴포넌트

```js
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
```
- `StarterKit`: 굵게, 기울임, 제목 등 기본 텍스트 편집 기능 묶음
- `Image`: 에디터 안에 이미지를 삽입할 수 있는 Tiptap 확장 기능

```js
import { Box, Button, TextField, Container, Paper } from '@mui/material';
```
- MUI(Material UI) 라이브러리의 UI 컴포넌트들
  - `Box`: div와 같은 기본 레이아웃 박스
  - `Button`: 버튼
  - `TextField`: 입력창
  - `Container`: 내용을 가운데 정렬하고 최대 너비를 제한하는 컨테이너
  - `Paper`: 카드처럼 배경색과 그림자가 있는 박스

```js
import { AuthContext } from '../../contexts/AuthContext';
```
- 로그인 상태(user, loading)를 전역으로 관리하는 Context 객체

```js
import { createNotice } from '../../services/noticeService';
```
- 공지사항을 백엔드 API에 저장하는 함수

```js
import HomeHeader from '../../components/HomeHeader';
```
- 상단 헤더 컴포넌트

---

### 색상 상수 (11~12번 줄)

```js
const COLORS = { bg: '#0F172A', card: '#1E293B', border: '#334155',
                 text: '#F1F5F9', subText: '#94A3B8', primary: '#4F46E5' };
```
- 페이지 전체에서 반복 사용할 색상을 한 곳에 모아둔 객체
- `bg`: 배경색 (매우 어두운 남색)
- `card`: 카드 배경색 (약간 밝은 남색)
- `border`: 테두리 색 (중간 회색)
- `text`: 본문 글자색 (밝은 흰색)
- `subText`: 부제목 글자색 (회색)
- `primary`: 강조색 (보라/인디고)

---

### 컴포넌트 시작 및 상태 선언 (14~17번 줄)

```js
function NoticeWritePage() {
```
- `NoticeWritePage`라는 이름의 React 컴포넌트 함수 시작

```js
  const navigate = useNavigate();
```
- 페이지 이동 함수를 `navigate`라는 변수에 저장

```js
  const { user, loading } = useContext(AuthContext);
```
- 전역 로그인 상태에서 `user`(로그인한 사용자 정보)와 `loading`(로딩 중 여부)를 꺼내옴

```js
  const [title, setTitle] = useState('');
```
- `title`: 제목 입력창에 사용자가 입력한 문자열을 저장하는 상태
- `setTitle`: `title` 값을 바꾸는 함수
- `''`: 초기값은 빈 문자열

---

### 관리자 권한 체크 (19~22번 줄)

```js
  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'admin') navigate('/notice');
  }, [user, loading]);
```
- `useEffect`가 실행되는 조건: `user` 또는 `loading` 값이 바뀔 때
- `if (loading) return;` → 아직 로그인 정보를 불러오는 중이면 아무것도 하지 않고 종료
- `if (!user || user.role !== 'admin')` → 로그인 안 했거나 관리자가 아니면
- `navigate('/notice')` → 공지사항 목록 페이지로 강제 이동 (관리자만 글 작성 가능)

---

### Tiptap 에디터 생성 (24~27번 줄)

```js
  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: '',
  });
```
- `useEditor`: Tiptap 에디터 객체를 만드는 훅
- `extensions`: 사용할 기능 목록. `StarterKit`(기본 텍스트 기능) + `Image`(이미지 삽입)
- `content: ''`: 에디터 초기 내용은 비어있음
- 반환된 `editor` 객체로 에디터를 조작(굵게, 이미지 삽입 등)할 수 있음

---

### 이미지 업로드 핸들러 (29~48번 줄)

```js
  const handleImageUpload = (e) => {
```
- 이미지 파일 선택 시 실행되는 함수. `e`는 파일 선택 이벤트 객체

```js
    const file = e.target.files[0];
```
- 사용자가 선택한 파일 목록(`files`) 중 첫 번째 파일을 `file`에 저장
- `files[0]`: 파일 선택창은 여러 파일을 받을 수 있는 배열 형태라 인덱스 0으로 첫 파일 접근

```js
    if (!file) return;
```
- 파일이 없으면(취소했으면) 함수 종료

```js
    const reader = new FileReader();
```
- `FileReader`: 파일을 브라우저에서 읽을 수 있게 해주는 브라우저 내장 객체

```js
    reader.onload = () => {
```
- 파일 읽기가 완료되면 실행할 콜백 함수 등록

```js
      const img = new window.Image();
```
- 브라우저 내장 `Image` 객체 생성. 이미지를 로드해서 실제 픽셀 크기(width, height)를 알아내기 위함
- `window.Image()`라고 쓴 이유: 위에서 Tiptap의 `Image`를 import했기 때문에 이름 충돌 방지

```js
      img.onload = () => {
```
- Image 객체에 이미지가 완전히 로드되면 실행할 콜백 함수 등록

```js
        const MAX_WIDTH = 800;
```
- 에디터에 표시할 이미지의 최대 가로 크기를 800픽셀로 제한

```js
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
```
- 이미지 가로가 800px를 초과하면 → 축소 비율 계산 (예: 1200px면 800/1200 = 0.667)
- 800px 이하면 → 그대로 사용 (scale = 1)
- 삼항 연산자: `조건 ? 참일때값 : 거짓일때값`

```js
        const canvas = document.createElement('canvas');
```
- 이미지를 그릴 캔버스(그림판) HTML 요소를 생성. 화면에 보이지는 않음

```js
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
```
- 캔버스 크기를 리사이즈된 이미지 크기로 설정
- 가로세로 비율을 유지하며 축소 (둘 다 같은 `scale` 비율 적용)

```js
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
```
- `getContext('2d')`: 캔버스의 2D 드로잉 컨텍스트(그리기 도구) 획득
- `drawImage(img, 0, 0, 너비, 높이)`: 원본 이미지를 캔버스에 리사이즈해서 그림
- 인자 설명: `(이미지객체, x좌표, y좌표, 그릴너비, 그릴높이)`

```js
        const src = canvas.toDataURL('image/jpeg', 0.8);
```
- 캔버스에 그려진 이미지를 JPEG 형식, 80% 품질의 Base64 문자열로 변환
- 결과: `"data:image/jpeg;base64,/9j/4AAQSkZJRgAB..."` 같은 긴 문자열
- Base64란? 이진 파일(이미지)을 텍스트로 표현하는 인코딩 방식

```js
        editor.chain().focus().setImage({ src }).run();
```
- `editor.chain()`: 여러 명령을 연결해서 실행하는 체이닝 시작
- `.focus()`: 에디터에 커서 포커스 설정
- `.setImage({ src })`: 현재 커서 위치에 `src` URL을 가진 이미지 노드 삽입
- `.run()`: 체이닝된 명령들 실행
- 이 시점에서 에디터 내부 문서 모델에 이미지 노드가 추가되고, EditorContent가 이를 `<img>` 태그로 렌더링해 화면에 표시

```js
      img.src = reader.result;
```
- `reader.result`: FileReader가 읽은 Base64 파일 데이터 (원본 크기 이미지)
- `img.src`에 대입하면 Image 객체가 이 데이터를 로드 시작 → 완료되면 `img.onload` 실행

```js
    reader.readAsDataURL(file);
```
- FileReader에게 파일을 Base64 데이터 URL 형식으로 읽으라고 지시
- 읽기 완료되면 `reader.onload` 실행

---

### 저장 핸들러 (50~54번 줄)

```js
  const handleSubmit = async () => {
```
- 저장 버튼 클릭 시 실행되는 비동기 함수

```js
    const content = editor.getHTML();
```
- 에디터의 현재 내용을 HTML 문자열로 추출
- 예: `"<h2>제목</h2><p>내용</p><img src=\"data:image/jpeg;base64,...\">"`
- 이미지도 Base64 그대로 HTML 안에 포함됨

```js
    await createNotice(title, content);
```
- `title`(제목 상태값)과 `content`(에디터 HTML)를 백엔드 API로 전송
- `await`: 비동기 함수 완료를 기다림

```js
    navigate('/notice');
```
- 저장 완료 후 공지사항 목록 페이지로 이동

---

### JSX (UI 구조, 56~114번 줄)

```jsx
<Box sx={{ height: '100vh', ... }}>
```
- 뷰포트 전체 높이(100vh)를 차지하는 최외곽 컨테이너

```jsx
  <HomeHeader />
```
- 상단 헤더 컴포넌트 렌더링

```jsx
  <Container maxWidth="md" ...>
```
- 최대 너비 `md`(960px)로 내용을 가운데 정렬

```jsx
    <Paper ...>
```
- 카드 형태의 박스 (배경색, 패딩 적용)

```jsx
      <TextField label="제목" value={title} onChange={e => setTitle(e.target.value)} />
```
- 제목 입력창
- `value={title}`: 상태값과 입력창을 연결 (controlled component)
- `onChange`: 입력할 때마다 `setTitle`로 상태 업데이트

```jsx
      <Button onClick={() => editor.chain().focus().toggleBold().run()}>B</Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()}>I</Button>
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
```
- 텍스트 서식 버튼들. 클릭하면 에디터에 굵게/기울임/H2 제목 적용

```jsx
      <Button component="label">
        이미지 <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
      </Button>
```
- `component="label"`: Button이 `<label>` 태그로 렌더링되어 내부 input 클릭을 유발
- `hidden`: input을 화면에 숨김 (버튼 클릭 시 파일 선택창이 열림)
- `accept="image/*"`: 이미지 파일만 선택 가능
- `onChange={handleImageUpload}`: 파일 선택 시 이미지 처리 함수 실행

```jsx
      <EditorContent editor={editor} />
```
- Tiptap 에디터 내용을 실제 DOM으로 렌더링
- `editor` 객체의 ProseMirror 문서 모델이 바뀔 때마다 자동으로 화면 업데이트
- 이미지 노드가 있으면 `<img src="data:...">` 태그로 렌더링되어 이미지가 보임

```jsx
    <Button onClick={() => navigate('/notice')}>취소</Button>
    <Button onClick={handleSubmit}>저장</Button>
```
- 취소 버튼: 목록 페이지로 이동
- 저장 버튼: `handleSubmit` 실행 → API 전송 → 목록 페이지로 이동

---

## 이미지가 에디터에 보이는 핵심 원리 요약

```
1. 파일 → Base64 문자열 (FileReader)
   : 이미지 파일을 텍스트로 변환. 서버 없이 브라우저 메모리에 저장.

2. Base64 → Canvas 리사이징
   : 너무 큰 이미지는 800px로 줄이고 JPEG 80% 품질로 재압축.

3. Base64 → Tiptap 문서 모델 (setImage)
   : 에디터 내부 데이터 구조(ProseMirror)에 이미지 노드 추가.

4. 문서 모델 → 화면 DOM (EditorContent)
   : Tiptap이 이미지 노드를 <img src="data:..."> 태그로 자동 렌더링.
```

> **주의**: 이미지가 서버에 파일로 저장되지 않고, HTML 안에 Base64 텍스트로 직접 포함되어 DB에 저장됩니다. 이미지가 크면 DB 용량이 많이 소모될 수 있습니다.
