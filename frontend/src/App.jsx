import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HomePage from './pages/HomePage';
import { AuthProvider } from './contexts';
import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import { AdminUserPage, AdminStatisticsPage } from './pages/admin';
import PinballPage from './pages/PinballPage';

const theme = createTheme();

//<ThemeProvider theme={theme}>

function App() {
  return (
    <>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/Register" element={<Register/>} />
            <Route path="/pinball" element={<PinballPage />} />
            <Route path="/admin" element={<AdminUserPage/>} />
            <Route path="/admin/users" element={<AdminUserPage/>} />
            <Route path="/admin/statistics" element={<AdminStatisticsPage/>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}

export default App;
