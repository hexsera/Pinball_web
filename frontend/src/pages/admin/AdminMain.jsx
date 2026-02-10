import { Box, Toolbar, Container, CardMedia } from '@mui/material';

const drawerWidth = 260;

function AdminMain() {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        backgroundColor: '#F9FAFB',
        minHeight: '100vh',
      }}
    >
      <Toolbar />
      <Container maxWidth="xl">
        <CardMedia
          component="img"
          image="/images/admin_main_temp.png"
          alt="Admin Main Temp"
          sx={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </Container>
    </Box>
  );
}

export default AdminMain;
