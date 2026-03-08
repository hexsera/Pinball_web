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
import FriendPage from './pages/FriendPage';
import UserInfo from './pages/UserInfo';
// TODO: 실행계획 섹션 6 — 공지사항 라우트 (테스트용 임시 등록, 추후 정식 구현 단계에서 재검토)
import NoticeListPage from './pages/Notice/NoticeListPage';
import NoticeWritePage from './pages/Notice/NoticeWritePage';
import NoticeDetailPage from './pages/Notice/NoticeDetailPage';

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
            <Route path="/user/friend" element={<FriendPage />} />
            <Route path="/user/account" element={<UserInfo />} />
            {/* TODO: 실행계획 섹션 6 — 공지사항 라우트 (테스트용 임시 등록) */}
            <Route path="/notice" element={<NoticeListPage />} />
            <Route path="/notice/write" element={<NoticeWritePage />} />
            <Route path="/notice/:id" element={<NoticeDetailPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}

export default App;
