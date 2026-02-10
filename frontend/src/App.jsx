import Pinball from './pages/Pinball';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './contexts';
import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import { AdminPage, AdminUserPage, AdminStatisticsPage } from './pages/admin';

const theme = createTheme();

//<ThemeProvider theme={theme}>

function App() {
  return (
    <>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/Register" element={<Register/>} />
            <Route path="/Pinball_test" element={<Pinball/>} />
            <Route path="/admin" element={<AdminPage/>} />
            <Route path="/admin/users" element={<AdminUserPage/>} />
            <Route path="/admin/statistics" element={<AdminStatisticsPage/>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}

export default App;
