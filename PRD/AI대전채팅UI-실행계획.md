# AI 대전 핀볼 채팅 UI 실행계획

## 요구사항 요약

**요구사항**: 기존 `/pinball` 페이지(`PinballPage.jsx`)에 우측 고정 채팅 패널을 추가한다. 채팅 패널은 ChatPanel / ChatMessage / ChatInput 3개 컴포넌트로 분리하며, 백엔드 `POST /api/v1/chat` API와 연동하여 Gemini AI와 멀티턴 대화를 지원한다.

**목적**: 사용자가 핀볼 게임을 플레이하는 동안 AI와 실시간 채팅으로 상호작용하여 경쟁감과 몰입도를 높인다.

## 현재상태 분석

- `backend/app/api/v1/chat.py`: `POST /api/v1/chat` 엔드포인트 완성. `chat_id` 기반 멀티턴 세션 메모리 저장 동작 중.
- `frontend/src/pages/PinballPage/PinballPage.jsx`: AppBar + 게임 영역 구성 완성. 우측 채팅 패널 미포함.
- `frontend/src/components/ChatPanel/`: 디렉토리 없음, 컴포넌트 미작성.
- `backend/app/api/v1/chat.py`: `POST /api/v1/chat` 엔드포인트 완성. `chat_id` 기반 멀티턴 세션 동작 중.

## 구현 방법

React 컴포넌트를 3개로 분리한다(ChatPanel / ChatMessage / ChatInput). 상태(`messages`, `inputValue`, `isLoading`, `chatId`)는 ChatPanel이 소유하고 하위 컴포넌트에 props로 전달한다. API 통신은 `axios`로 `POST /api/v1/chat`을 호출하고, 응답의 `chat_id`를 로컬 state에 저장하여 다음 요청에 포함한다. 스타일링은 MUI sx prop만 사용한다. 응답 대기 인디케이터와 타임스탬프는 구현하지 않는다.

## 구현 단계

### 1. ChatMessage.jsx 생성

```jsx
// frontend/src/components/ChatPanel/ChatMessage.jsx
export default function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <Box sx={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
      backgroundColor: isUser ? '#4F46E5' : '#334155',
      color: isUser ? '#FFFFFF' : '#F1F5F9',
      borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
      px: 1.5, py: 1, fontSize: '14px',
    }}>
      {content}
    </Box>
  );
}
```
- **무엇을 하는가**: `role`이 `'user'`면 우측 인디고 말풍선, `'ai'`면 좌측 회색 말풍선으로 렌더링
- `alignSelf`로 flex 부모 안에서 좌/우 정렬 결정
- `borderRadius` 값이 달라 각진 꼭짓점이 대화 방향을 시각적으로 표시
- 타임스탬프 미표시 — `timestamp` prop 불필요

### 2. ChatInput.jsx 생성

```jsx
// frontend/src/components/ChatPanel/ChatInput.jsx
export default function ChatInput({ value, onChange, onSend, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !disabled) onSend();
  };
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', px: 1.5, py: 1, backgroundColor: '#1E293B', borderTop: '1px solid #334155', minHeight: '56px' }}>
      <TextField fullWidth size="small" value={value} onChange={onChange} onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요..." autoComplete="off"
        sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#0F172A', borderRadius: '8px', fontSize: '14px',
          '& fieldset': { borderColor: '#334155' }, '&.Mui-focused fieldset': { borderColor: '#4F46E5' } },
          '& input': { color: '#F1F5F9' }, '& input::placeholder': { color: '#64748B' } }} />
      <IconButton onClick={onSend} disabled={disabled}
        sx={{ width: 40, height: 40, borderRadius: '8px', backgroundColor: '#4F46E5', color: '#FFFFFF',
          opacity: disabled ? 0.4 : 1, '&:hover': { backgroundColor: '#4338CA' }, '&.Mui-disabled': { backgroundColor: '#4F46E5', color: '#FFFFFF' } }}>
        <SendIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
```
- **무엇을 하는가**: 메시지 입력 필드와 전송 버튼을 렌더링, Enter 키로 전송 처리
- `disabled` prop이 true면 버튼 opacity 0.4로 전송 불가 상태 표시
- `autoComplete="off"`로 브라우저 자동완성 비활성화

### 3. ChatPanel.jsx 생성

```jsx
// frontend/src/components/ChatPanel/ChatPanel.jsx
export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMsg = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    try {
      const { data } = await axios.post('/api/v1/chat', { chat_id: chatId, message: userMsg.content });
      setChatId(data.chat_id);
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } finally { setIsLoading(false); }
  };
  // ... 렌더링 (헤더 + 메시지 목록 + ChatInput)
}
```
- **무엇을 하는가**: 채팅 전체 상태(`messages`, `chatId`, `isLoading`)를 관리하고 API 호출을 담당
- `chatId`를 state로 보관해 두 번째 메시지부터 동일 세션으로 전송
- `finally`로 성공/실패 무관하게 `isLoading` 해제 보장
- `isLoading`은 전송 버튼 비활성화 용도로만 사용 (인디케이터 미표시)

### 4. PinballPage.jsx 수정 — 채팅 패널 추가

```jsx
// frontend/src/pages/PinballPage/PinballPage.jsx
import ChatPanel from '../../components/ChatPanel/ChatPanel';

// 기존 게임 영역 Box를 감싸는 구조로 변경
<Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
  {/* 기존 게임 영역 (좌측, flexGrow:1) */}
  <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'hidden', pt: isMobile ? 0 : 2 }}>
    {/* 기존 게임 스케일 Box + Pinball 컴포넌트 유지 */}
  </Box>
  {/* 채팅 패널 (우측 350px 고정) */}
  <ChatPanel />
</Box>
```
- **무엇을 하는가**: 기존 게임 영역 `Box`를 flex 컨테이너로 감싸고, 우측에 ChatPanel을 추가
- 기존 게임 스케일·로딩 로직은 그대로 유지하며 레이아웃 구조만 변경
- ChatPanel이 350px를 차지하므로 게임 영역은 나머지 너비를 자동으로 사용


## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/components/ChatPanel/ChatMessage.jsx` | 생성 | 메시지 말풍선 컴포넌트 |
| `frontend/src/components/ChatPanel/ChatInput.jsx` | 생성 | 입력 필드 + 전송 버튼 컴포넌트 |
| `frontend/src/components/ChatPanel/ChatPanel.jsx` | 생성 | 채팅 패널 메인 컴포넌트 (상태 관리 + API 호출) |
| `frontend/src/pages/PinballPage/PinballPage.jsx` | 수정 | 게임 영역 우측에 ChatPanel 추가 |

## 완료 체크리스트

- [ ] `/pinball` 접속 시 게임과 채팅 패널이 함께 정상 렌더링된다
- [ ] 채팅 패널이 우측에 350px 고정 너비로 표시된다
- [ ] 메시지 입력 후 Enter 또는 전송 버튼으로 전송된다
- [ ] 사용자 메시지(인디고, 우측)와 AI 메시지(회색, 좌측)가 구분된다
- [ ] 새 메시지 추가 시 채팅창이 자동으로 하단으로 스크롤된다
- [ ] 빈 입력 또는 AI 응답 대기 중 전송 버튼이 비활성(opacity 0.4)된다
- [ ] 두 번째 메시지부터 동일 `chat_id`로 API가 호출되어 이전 대화 맥락이 유지된다
- [ ] 메시지가 없을 때 "AI와 대화를 시작하세요" 안내 텍스트가 표시된다
