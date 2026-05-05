import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  accessToken: localStorage.getItem('access_token') || null,
  setAccessToken: (token) => {
    localStorage.setItem('access_token', token);
    set({ accessToken: token });
  },
  clearAccessToken: () => {
    localStorage.removeItem('access_token');
    set({ accessToken: null });
  },
}));
