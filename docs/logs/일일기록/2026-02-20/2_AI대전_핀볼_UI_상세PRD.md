# AI 대전 핀볼 - 채팅 UI 상세 PRD

## 1. 개요

이 문서는 AI 대전 핀볼(`/ai-pinball`)의 **채팅 패널 UI/UX 설계**를 상세히 정의한다. 게임 물리 엔진, 게임 내 UI, 백엔드 API는 별도 문서에서 다루며, 본 문서는 채팅 패널의 레이아웃, 컴포넌트 구조, 스타일링, 인터랙션, 애니메이션에 집중한다.

### 1.1 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.x | UI 컴포넌트 |
| MUI (Material-UI) | 7.x | UI 컴포넌트 라이브러리, sx 스타일링 |
| MUI Icons | 7.x | 아이콘 |

### 1.2 디자인 원칙

- 기존 프로젝트의 다크 테마 컬러 시스템(`#0F172A`, `#1E293B`, `#334155`)을 따른다
- MUI sx prop 기반 인라인 스타일링을 사용한다 (CSS 모듈, Tailwind 미사용)
- 데스크탑 전용 (모바일 미지원)

---

## 2. 파일 구조

```
frontend/src/
└── components/
    └── ChatPanel/
        ├── ChatPanel.jsx     # 채팅 패널 메인 컴포넌트
        ├── ChatMessage.jsx   # 개별 메시지 말풍선
        └── ChatInput.jsx     # 메시지 입력 + 전송 버튼
```

---

## 3. 컬러 시스템

```js
const CHAT_COLORS = {
  panelBg: '#0F172A',         // 채팅 패널 배경
  headerBg: '#1E293B',        // 채팅 헤더 배경
  inputBg: '#1E293B',         // 채팅 입력 영역 배경
  inputFieldBg: '#0F172A',    // 입력 필드 배경
  border: '#334155',          // 테두리
  textPrimary: '#F1F5F9',     // 주요 텍스트
  textSecondary: '#94A3B8',   // 보조 텍스트
  textMuted: '#64748B',       // 비활성 텍스트
  userBubble: '#4F46E5',      // 사용자 메시지 말풍선
  aiBubble: '#334155',        // AI 메시지 말풍선
  sendBtn: '#4F46E5',         // 전송 버튼
  sendBtnHover: '#4338CA',    // 전송 버튼 호버
};
```

---

## 4. ChatPanel (전체 레이아웃)

페이지 우측에 고정 배치되는 채팅 패널.

```
┌──────────────────────────┐
│  💬 AI Chat         [✕]  │ ← ChatHeader (48px)
├──────────────────────────┤
│                          │
│  AI 메시지 (좌측 정렬)     │
│                          │
│       사용자 메시지 (우측)  │
│                          │
│  AI 메시지 (좌측 정렬)     │
│                          │
│       사용자 메시지 (우측)  │
│                          │
│  AI 입력 중... ●●●        │ ← 로딩 인디케이터 (조건부)
│                          │
├──────────────────────────┤
│ [메시지를 입력하세요] [▶]  │ ← ChatInput (56px)
└──────────────────────────┘
```

| 항목 | 값 |
|------|-----|
| 너비 | `350px` (고정) |
| 높이 | 게임 영역 전체 높이 (`calc(100vh - headerHeight)`) |
| 배경 | `#0F172A` |
| 좌측 테두리 | `1px solid #334155` |
| 레이아웃 | `display: flex`, `flexDirection: column` |

---

## 5. ChatHeader

| 항목 | 값 |
|------|-----|
| 높이 | `48px` |
| 배경 | `#1E293B` |
| 하단 테두리 | `1px solid #334155` |
| 좌측 아이콘 | `ChatBubbleOutlineIcon`, `color: '#94A3B8'`, `fontSize: 20px` |
| 타이틀 | "AI Chat", `color: '#F1F5F9'`, `fontWeight: 600`, `fontSize: 14px` |
| 우측 버튼 | 닫기 `CloseIcon`, `color: '#64748B'` |
| padding | `px: 2` |

---

## 6. ChatMessageList

| 항목 | 값 |
|------|-----|
| 레이아웃 | `flexGrow: 1`, `overflow-y: auto` |
| padding | `p: 2` |
| 메시지 간격 | `gap: 12px` |
| 스크롤바 스타일 | 얇은 커스텀 스크롤바 (`width: 4px`, `backgroundColor: '#334155'`) |
| 자동 스크롤 | 새 메시지 추가 시 하단으로 `scrollIntoView({ behavior: 'smooth' })` |
| 빈 상태 | 중앙에 "AI와 대화를 시작하세요" 텍스트, `color: '#64748B'`, `fontSize: 14px` |

---

## 7. ChatMessage

### 7.1 사용자 메시지 (우측 정렬)

```
                    ┌──────────────────┐
                    │ 안녕하세요!        │
                    └──────────────────┘
                                 오후 2:30
```

| 항목 | 값 |
|------|-----|
| 정렬 | `alignSelf: 'flex-end'` |
| 배경 | `#4F46E5` |
| 텍스트 색상 | `#FFFFFF` |
| borderRadius | `12px 12px 4px 12px` (우하단만 각진 형태) |
| padding | `px: 1.5`, `py: 1` |
| 최대 너비 | `maxWidth: '80%'` |
| fontSize | `14px` |
| 타임스탬프 | `fontSize: 11px`, `color: '#64748B'`, `textAlign: right`, `mt: 0.5` |

### 7.2 AI 메시지 (좌측 정렬)

```
┌──────────────────┐
│ 안녕하세요! 무엇을  │
│ 도와드릴까요?      │
└──────────────────┘
오후 2:31
```

| 항목 | 값 |
|------|-----|
| 정렬 | `alignSelf: 'flex-start'` |
| 배경 | `#334155` |
| 텍스트 색상 | `#F1F5F9` |
| borderRadius | `12px 12px 12px 4px` (좌하단만 각진 형태) |
| padding | `px: 1.5`, `py: 1` |
| 최대 너비 | `maxWidth: '80%'` |
| fontSize | `14px` |
| 타임스탬프 | `fontSize: 11px`, `color: '#64748B'`, `textAlign: left`, `mt: 0.5` |

### 7.3 AI 응답 대기 인디케이터

AI 응답 대기 중일 때 메시지 목록 하단에 표시.

```
┌──────────────────┐
│  ● ● ●           │
└──────────────────┘
```

| 항목 | 값 |
|------|-----|
| 배경 | `#334155` (AI 메시지와 동일) |
| 정렬 | `alignSelf: 'flex-start'` |
| 내용 | 3개의 원형 점이 순차적으로 바운스 |
| 점 크기 | `width: 8px`, `height: 8px`, `borderRadius: 50%` |
| 점 색상 | `#94A3B8` |
| 점 애니메이션 | 0.6초 주기 바운스, 각 점 0.15초 지연 |

```js
const dotBounce = {
  '0%, 80%, 100%': { transform: 'translateY(0)' },
  '40%': { transform: 'translateY(-8px)' },
};
```

---

## 8. ChatInput

```
┌──────────────────────────────────────────┐
│ [메시지를 입력하세요...              ] [▶] │
└──────────────────────────────────────────┘
```

| 항목 | 값 |
|------|-----|
| 전체 높이 | `56px` |
| 배경 | `#1E293B` |
| 상단 테두리 | `1px solid #334155` |
| padding | `px: 1.5`, `py: 1` |
| 레이아웃 | `display: flex`, `gap: 1`, `alignItems: center` |

### 8.1 입력 필드 (TextField)

| 항목 | 값 |
|------|-----|
| variant | `outlined` |
| placeholder | "메시지를 입력하세요..." |
| size | `small` |
| fullWidth | `true` |
| 배경 | `#0F172A` |
| 텍스트 색상 | `#F1F5F9` |
| placeholder 색상 | `#64748B` |
| 테두리 | `1px solid #334155` |
| 포커스 테두리 | `1px solid #4F46E5` |
| borderRadius | `8px` |
| fontSize | `14px` |
| Enter 키 | 메시지 전송 (Submit) |
| autoComplete | `off` |

**중요: 포커스 시 게임 키보드 이벤트 비활성화**
- 이 입력 필드에 포커스가 있으면 ArrowLeft/ArrowRight/Space 키가 게임에 전달되지 않아야 한다
- `AIPinball.jsx`의 keydown 핸들러에서 `document.activeElement.tagName`으로 필터링

### 8.2 전송 버튼

| 항목 | 값 |
|------|-----|
| 아이콘 | `SendIcon` |
| 크기 | `width: 40px`, `height: 40px` |
| 배경 | `#4F46E5` |
| 색상 | `#FFFFFF` |
| borderRadius | `8px` |
| 비활성 조건 | 입력이 비어있거나, AI 응답 대기 중 |
| 비활성 스타일 | `opacity: 0.4`, 클릭 불가 |
| 호버 | `backgroundColor: '#4338CA'` |

---

## 9. 상태 관리

| 상태 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `messages` | `Array<{ role, content, timestamp }>` | `[]` | 채팅 메시지 목록 |
| `inputValue` | `string` | `''` | 현재 입력 텍스트 |
| `isLoading` | `boolean` | `false` | AI 응답 대기 중 |

---

## 10. 키보드 단축키

| 키 | 동작 | 조건 |
|----|------|------|
| `Enter` | 채팅 메시지 전송 | 채팅 입력 포커스 시 |
| `Escape` | 채팅 입력 포커스 해제 | 채팅 입력 포커스 시 |

---

## 11. 테스트 체크리스트

- [ ] 메시지 입력 후 Enter 또는 전송 버튼으로 전송된다
- [ ] 사용자 메시지가 우측, AI 메시지가 좌측에 정렬된다
- [ ] 말풍선 색상이 사용자(인디고)와 AI(회색)로 구분된다
- [ ] AI 응답 대기 중 점 3개 바운스 인디케이터가 표시된다
- [ ] 새 메시지 추가 시 자동 스크롤이 동작한다
- [ ] 빈 입력 시 전송 버튼이 비활성화된다
- [ ] AI 응답 대기 중 전송 버튼이 비활성화된다
- [ ] 타임스탬프가 각 메시지 아래에 표시된다
- [ ] 채팅 입력 포커스 시 게임 키보드 조작이 비활성화된다
- [ ] Enter로 메시지 전송, Escape로 포커스 해제가 동작한다
- [ ] 메시지가 없을 때 "AI와 대화를 시작하세요" 안내 텍스트가 표시된다
- [ ] 채팅 패널이 350px 고정 너비를 유지한다
