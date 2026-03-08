# AI 채팅 변경 실행계획

## 요구사항 요약

**요구사항**:
1. AI 대전 모드일 때만 채팅창 표시
2. 채팅창 활성화 후 5초 대기, 50% 확률로 AI가 먼저 대화 시작
3. AI 역할을 "핀볼 대결 상대"로 설정 — 반말 + 게이머 말투, 욕설/과한 표현 순화
4. 채팅 입력창 클릭 시 focus 처리로 스페이스바 게임 조작 방지

**목적**: AI 대전 중에만 채팅이 노출되고, AI가 자연스럽게 대화를 유도하여 몰입감을 높인다.

## 현재상태 분석

- `PinballPage.jsx`: `isAIMode` 상태 존재. `<ChatPanel />`은 항상 렌더링됨 (조건 없음)
- `ChatPanel.jsx`: AI 첫 메시지 로직 없음. 시스템 프롬프트 전달 없음. 초기 messages 빈 배열
- `ChatInput.jsx`: focus 처리 없음. Enter로 전송, 스페이스바 이벤트 미차단
- `backend/app/api/v1/chat.py`: 시스템 프롬프트 존재하지만 반말/게이머 말투 미적용. Gemini API 사용

## 구현 방법

- **조건부 렌더링**: `isAIMode`를 ChatPanel에 prop으로 전달하여 AI 대전일 때만 표시
- **AI 선제 메시지**: `useEffect`로 마운트 시 5초 후 50% 확률로 백엔드 API 호출 (빈 트리거 메시지)
- **시스템 프롬프트 수정**: 백엔드에서 반말, 게이머 말투, 욕설 순화 지시 추가
- **Focus 처리**: ChatInput의 TextField에 `ref`와 클릭 이벤트로 focus 이동, 게임 keydown 이벤트에서 채팅 focus 시 스페이스바 무시

## 구현 단계

### 1. PinballPage.jsx — ChatPanel 조건부 렌더링

```jsx
// isAIMode를 ChatPanel에 전달하고 조건부 렌더링
{isAIMode && <ChatPanel isAIMode={isAIMode} />}
```
- **무엇을 하는가**: AI 대전 버튼이 ON일 때만 채팅창을 화면에 표시
- `isAIMode`가 false이면 ChatPanel 컴포넌트 자체가 DOM에 마운트되지 않음
- isAIMode가 false → true로 바뀌는 순간 ChatPanel이 마운트되어 useEffect 타이머 시작

### 2. ChatPanel.jsx — AI 선제 메시지 로직 추가

```jsx
useEffect(() => {
  if (!isAIMode) return;
  const timer = setTimeout(async () => {
    if (Math.random() < 0.5) {
      const { data } = await axios.post('/api/v1/chat', {
        chat_id: chatId || null,
        message: '__AI_INIT__',  // 백엔드가 인식하는 선제 트리거
      });
      setChatId(data.chat_id);
      setMessages([{ role: 'ai', content: data.reply }]);
    }
  }, 5000);
  return () => clearTimeout(timer);
}, [isAIMode]);
```
- **무엇을 하는가**: 채팅창이 열린 뒤 5초 후 50% 확률로 AI가 먼저 인사말을 전송
- `Math.random() < 0.5`: 0.0~1.0 난수 중 절반이 조건 충족 = 50% 확률
- 컴포넌트 언마운트 시 `clearTimeout`으로 타이머 정리 (메모리 누수 방지)
- `__AI_INIT__` 메시지를 백엔드가 받으면 AI 선제 인사말로 처리

### 3. backend/app/api/v1/chat.py — 시스템 프롬프트 + AI 선제 메시지 처리

```python
SYSTEM_PROMPT = (
    "너는 핀볼 게임에서 사용자와 대결 중인 AI 상대방이다. "
    "반말을 사용하고 흔한 게이머 말투(ㅋㅋ, ㄷㄷ, 실화냐 등)를 구사해. "
    "욕설과 과한 표현은 순화해서 표현해 (예: '미친' → '헐', '개' → '엄청'). "
    "핀볼 점수, 게임 전략, 승부 이야기 위주로 짧게 대화해. "
    "한국어로만 대화하고, 게임 외 주제는 핀볼 대결로 돌려서 답해."
)

AI_INIT_TRIGGER = "__AI_INIT__"

# POST /chat 핸들러 내부
if request.message == AI_INIT_TRIGGER:
    prompt = "대결 시작 전 상대방에게 짧은 도발이나 인사를 건네."
else:
    prompt = request.message
```
- **무엇을 하는가**: AI의 말투를 반말+게이머 스타일로 고정하고, 선제 메시지 트리거를 처리
- `SYSTEM_PROMPT`는 Gemini API의 `system_instruction`으로 전달
- `__AI_INIT__` 수신 시 일반 대화가 아닌 선제 인사 프롬프트로 대체

### 4. ChatInput.jsx — Focus 처리로 스페이스바 충돌 해결

```jsx
const inputRef = useRef(null);

const handleFocus = () => {
  // 게임 영역의 keydown 이벤트가 input focus 상태를 확인할 수 있도록 ref 노출
};

<TextField
  inputRef={inputRef}
  onFocus={() => inputRef.current?.focus()}
  // ... 기존 props
/>
```
- **무엇을 하는가**: 사용자가 채팅 입력창을 클릭하면 브라우저 focus가 input으로 이동
- 게임의 keydown 리스너는 `document`에 붙어 있어 input에 focus가 있으면 `event.target`이 input
- 게임 키 핸들러에 `if (e.target.tagName === 'INPUT') return;` 조건 추가로 스페이스바 충돌 방지

### 5. AIPinball.jsx / Pinball.jsx — 스페이스바 이벤트 guard 추가

```jsx
const handleKeyDown = (event) => {
  // 채팅 input에 focus가 있으면 게임 조작 무시
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    // ... 기존 로직
  }
};
```
- **무엇을 하는가**: 채팅창 입력 중 스페이스바가 게임 조작으로 전달되는 것을 차단
- `event.target.tagName` 검사로 input/textarea focus 여부를 판별
- 기존 게임 로직은 변경 없이 guard 조건만 상단에 추가

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/PinballPage/PinballPage.jsx` | 수정 | ChatPanel 조건부 렌더링, isAIMode prop 전달 |
| `frontend/src/components/ChatPanel/ChatPanel.jsx` | 수정 | AI 선제 메시지 useEffect, isAIMode prop 수신 |
| `frontend/src/components/ChatPanel/ChatInput.jsx` | 수정 | inputRef 추가, focus 처리 |
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | keydown guard (INPUT focus 무시) |
| `frontend/src/pages/Pinball/Pinball.jsx` | 수정 | keydown guard (INPUT focus 무시) |
| `backend/app/api/v1/chat.py` | 수정 | 시스템 프롬프트 수정, AI_INIT 트리거 처리 |

## 완료 체크리스트

- [ ] AI 대전 버튼 OFF 상태에서 채팅창이 보이지 않는다
- [ ] AI 대전 버튼 ON 클릭 후 채팅창이 나타난다
- [ ] 채팅창 표시 후 5초 기다리면 약 절반의 확률로 AI가 먼저 메시지를 보낸다
- [ ] AI 메시지가 반말 + 게이머 말투(ㅋㅋ, ㄷㄷ 등)로 출력된다
- [ ] AI가 욕설 없이 순화된 표현을 사용한다
- [ ] 채팅 입력창을 클릭하고 스페이스바를 누르면 게임 플런저가 충전되지 않는다
- [ ] 채팅 입력창에서 벗어난 뒤 스페이스바를 누르면 게임이 정상 작동한다
- [ ] 에러 없이 빌드 및 실행된다 (`npm run build` 통과)
