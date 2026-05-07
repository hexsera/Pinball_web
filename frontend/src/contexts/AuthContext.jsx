import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
      .then(({ data }) => {
        const token = data.access_token;
        useAuthStore.getState().setAccessToken(token);
        const payload = JSON.parse(atob(token.split('.')[1]));
        return axios.get(`/api/v1/users/${payload.sub}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then(({ data }) => {
        setUser(data);
        setIsLoggedIn(true);
      })
      .catch(() => {
        // Refresh 쿠키 없거나 만료 → 비로그인 상태 유지
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, accessToken) => {
    setUser(userData);
    setIsLoggedIn(true);
    useAuthStore.getState().setAccessToken(accessToken);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } finally {
      setUser(null);
      setIsLoggedIn(false);
      useAuthStore.getState().clearAccessToken();
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
