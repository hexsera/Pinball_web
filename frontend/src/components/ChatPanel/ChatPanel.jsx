import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import axios from 'axios';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatPanel({ isAIMode }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const bottomRef = useRef(null);
  const initTimerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI 선제 메시지: 마운트 후 5초 뒤 50% 확률로 AI가 먼저 대화 시작
  useEffect(() => {
    if (!isAIMode) return;
    initTimerRef.current = setTimeout(async () => {
      if (Math.random() < 0.5) {
        try {
          const { data } = await axios.post('/api/v1/chat', {
            chat_id: null,
            message: '__AI_INIT__',
          });
          setChatId(data.chat_id);
          setMessages([{ role: 'ai', content: data.reply }]);
        } catch {
          // 선제 메시지 실패 시 조용히 무시
        }
      }
    }, 5000);
    return () => clearTimeout(initTimerRef.current);
  }, [isAIMode]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    // 유저가 먼저 말을 걸면 AI 선제 메시지 타이머 취소
    if (initTimerRef.current) {
      clearTimeout(initTimerRef.current);
      initTimerRef.current = null;
    }

    const userMsg = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data } = await axios.post('/api/v1/chat', {
        chat_id: chatId,
        message: userMsg.content,
      });
      setChatId(data.chat_id);
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{
      width: '350px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0F172A',
      borderLeft: '1px solid #334155',
      height: '100%',
    }}>
      {/* 헤더 */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        height: '48px',
        backgroundColor: '#1E293B',
        borderBottom: '1px solid #334155',
        flexShrink: 0,
      }}>
        <ChatBubbleOutlineIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
        <Typography sx={{ color: '#F1F5F9', fontWeight: 600, fontSize: '14px' }}>
          AI Chat
        </Typography>
      </Box>

      {/* 메시지 목록 */}
      <Box sx={{
        flexGrow: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        p: 2,
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-thumb': { backgroundColor: '#334155', borderRadius: '2px' },
        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      }}>
        {messages.length === 0 ? (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: '#64748B', fontSize: '14px' }}>
              AI와 대화를 시작하세요
            </Typography>
          </Box>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))
        )}
        <div ref={bottomRef} />
      </Box>

      {/* 입력 영역 */}
      <ChatInput
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onSend={handleSend}
        disabled={!inputValue.trim() || isLoading}
      />
    </Box>
  );
}
