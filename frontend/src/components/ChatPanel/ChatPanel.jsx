import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import axios from 'axios';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

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
