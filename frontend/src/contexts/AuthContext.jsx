import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // 페이지 로드할 때 로그인 정보 확인
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  // 로그인 함수
  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // 로그아웃 함수
  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}