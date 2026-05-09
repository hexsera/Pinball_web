import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminRoute from '../components/AdminRoute';
import { useAuthStore } from '../store/authStore';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}));

import { jwtDecode } from 'jwt-decode';

function setup(token, role) {
  useAuthStore.setState({ accessToken: token });

  if (token && role !== undefined) {
    jwtDecode.mockReturnValue({ role });
  } else if (token && role === undefined) {
    jwtDecode.mockImplementation(() => { throw new Error('invalid token'); });
  }

  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Page</div>} />
        </Route>
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ accessToken: null });
  });

  it('토큰 없으면 Home으로 리다이렉트', () => {
    setup(null, null);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('role=admin이면 어드민 페이지 렌더', () => {
    setup('valid.token.here', 'admin');
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('role=user면 Home으로 리다이렉트', () => {
    setup('valid.token.here', 'user');
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('디코딩 실패하면 Home으로 리다이렉트', () => {
    setup('broken.token', undefined);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
