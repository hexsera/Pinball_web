import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Box, Button, TextField, Container, Paper } from '@mui/material';
import { AuthContext } from '../../contexts/AuthContext';
import { createNotice } from '../../services/noticeService';
import HomeHeader from '../../components/HomeHeader';

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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_WIDTH = 800;
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const src = canvas.toDataURL('image/jpeg', 0.8);
        editor.chain().focus().setImage({ src }).run();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const content = editor.getHTML();
    await createNotice(title, content);
    navigate('/notice');
  };

  return (
    <Box sx={{ height: '100vh', backgroundColor: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      <HomeHeader />
      <Container maxWidth="md" sx={{ py: 4, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Paper sx={{
          backgroundColor: COLORS.card,
          p: 3,
          mb: 2,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <TextField
            fullWidth
            label="제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            sx={{ mb: 2, input: { color: COLORS.text },
                  label: { color: COLORS.subText },
                  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: COLORS.border } } }}
          />
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
          <Box sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 1,
            p: 1,
            '& .ProseMirror': {
              outline: 'none',
              '&:focus': { outline: 'none' },
            },
          }}>
            <EditorContent editor={editor} />
          </Box>
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
