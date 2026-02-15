import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login/Login';
import { AuthProvider } from '../contexts/AuthContext';
import axios from 'axios';

vi.mock('axios');

describe('Login 컴포넌트', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('로그인 성공 시 localStorage에 email이 저장된다', async () => {
    axios.post.mockResolvedValue({
      status: 200,
      data: {
        user_id: 1,
        nickname: '테스트유저',
        role: 'user',
        email: 'test@example.com',
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('이메일을 입력해주세요.'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('비밀번호를 입력해주세요.'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('user'));
      expect(saved.email).toBe('test@example.com');
    });
  });
});
