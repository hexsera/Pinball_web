import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Box, AppBar, Toolbar, Typography, Button, TextField, Container, Paper } from '@mui/material';
import { AuthContext } from '../../contexts/AuthContext';
import { createNotice, uploadNoticeImage } from '../../services/noticeService';

const COLORS = { bg: '#0F172A', card: '#1E293B', border: '#334155',
                 text: '#F1F5F9', subText: '#94A3B8', primary: '#4F46E5' };

function NoticeWritePage() {
  const navigate = useNavigate();
  const { user, loading } = useContext(AuthContext);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'admin') navigate('/notice');
  }, [user, loading]);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: '',
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = await uploadNoticeImage(file);
    editor.chain().focus().setImage({ src: data.url }).run();
  };

  const handleSubmit = async () => {
    const content = editor.getHTML();
    await createNotice(title, content);
    navigate('/notice');
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <AppBar position="static" sx={{ backgroundColor: COLORS.card,
                                      borderBottom: `1px solid ${COLORS.border}` }}>
        <Toolbar>
          <Typography variant="h6" sx={{ color: COLORS.text, cursor: 'pointer' }}
                      onClick={() => navigate('/')}>HEXSERA PINBALL</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ color: COLORS.text, mb: 2 }}>공지사항 작성</Typography>
        <TextField
          fullWidth
          label="제목"
          value={title}
          onChange={e => setTitle(e.target.value)}
          sx={{ mb: 2, input: { color: COLORS.text },
                label: { color: COLORS.subText },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: COLORS.border } } }}
        />
        <Paper sx={{ backgroundColor: '#fff', p: 2, mb: 2, minHeight: 300 }}>
          <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined"
                    onClick={() => editor.chain().focus().toggleBold().run()}>B</Button>
            <Button size="small" variant="outlined"
                    onClick={() => editor.chain().focus().toggleItalic().run()}>I</Button>
            <Button size="small" variant="outlined"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
            <Button size="small" variant="outlined" component="label">
              이미지 <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </Button>
          </Box>
          <EditorContent editor={editor} />
        </Paper>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate('/notice')}
                  sx={{ color: COLORS.subText, borderColor: COLORS.border }}>취소</Button>
          <Button variant="contained" onClick={handleSubmit}
                  sx={{ backgroundColor: COLORS.primary }}>저장</Button>
        </Box>
      </Container>
    </Box>
  );
}

export default NoticeWritePage;
