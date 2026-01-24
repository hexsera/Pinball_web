import Pinball from './Pinball';
import Login from './Login';
import Dashboard from './Dashboard';
import { AuthProvider } from './AuthContext';
import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Register from './Register';
import AdminPage from './admin/AdminPage';

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
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}

export default App;
