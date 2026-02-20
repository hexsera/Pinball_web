import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export default function ChatInput({ value, onChange, onSend, disabled }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !disabled) onSend();
  };

  return (
    <Box sx={{
      display: 'flex',
      gap: 1,
      alignItems: 'center',
      px: 1.5,
      py: 1,
      backgroundColor: '#1E293B',
      borderTop: '1px solid #334155',
      minHeight: '56px',
    }}>
      <TextField
        fullWidth
        size="small"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder="메시지를 입력하세요..."
        autoComplete="off"
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#0F172A',
            borderRadius: '8px',
            fontSize: '14px',
            '& fieldset': { borderColor: '#334155' },
            '&.Mui-focused fieldset': { borderColor: '#4F46E5' },
          },
          '& input': { color: '#F1F5F9' },
          '& input::placeholder': { color: '#64748B' },
        }}
      />
      <IconButton
        onClick={onSend}
        disabled={disabled}
        sx={{
          width: 40,
          height: 40,
          borderRadius: '8px',
          backgroundColor: '#4F46E5',
          color: '#FFFFFF',
          opacity: disabled ? 0.4 : 1,
          '&:hover': { backgroundColor: '#4338CA' },
          '&.Mui-disabled': { backgroundColor: '#4F46E5', color: '#FFFFFF' },
        }}
      >
        <SendIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
