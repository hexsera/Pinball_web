import { Box } from '@mui/material';

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <Box sx={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
      backgroundColor: isUser ? '#4F46E5' : '#334155',
      color: isUser ? '#FFFFFF' : '#F1F5F9',
      borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
      px: 1.5,
      py: 1,
      fontSize: '14px',
      wordBreak: 'break-word',
    }}>
      {content}
    </Box>
  );
}
