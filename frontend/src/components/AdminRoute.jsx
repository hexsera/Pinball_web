import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '../store/authStore';

export default function AdminRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/" replace />;

  try {
    const { role } = jwtDecode(accessToken);
    if (role !== 'admin') return <Navigate to="/" replace />;
  } catch {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
