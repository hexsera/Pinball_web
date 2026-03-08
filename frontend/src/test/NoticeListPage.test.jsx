import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

vi.mock('../services/noticeService', () => ({
  getNotices: vi.fn().mockResolvedValue([
    { id: 1, title: '첫 번째 공지', created_at: '2026-01-15T00:00:00' },
    { id: 2, title: '두 번째 공지', created_at: '2026-02-20T00:00:00' },
  ]),
}));

import { getNotices } from '../services/noticeService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const ADMIN_USER = { user_id: 1, nickname: '관리자', role: 'admin', email: 'admin@test.com' };
const NORMAL_USER = { user_id: 2, nickname: '일반유저', role: 'user', email: 'user@test.com' };

function renderWithAuth(userValue) {
  if (userValue) {
    localStorage.setItem('user', JSON.stringify(userValue));
  }
  return render(
    <MemoryRouter>
      <AuthProvider>
        <NoticeListPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

import NoticeListPage from '../pages/Notice/NoticeListPage';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getNotices.mockResolvedValue([
    { id: 1, title: '첫 번째 공지', created_at: '2026-01-15T00:00:00' },
    { id: 2, title: '두 번째 공지', created_at: '2026-02-20T00:00:00' },
  ]);
});

// ──────────────────────────────────────────
// 데이터 로딩
// ──────────────────────────────────────────
describe('NoticeListPage 데이터 로딩', () => {
  it('페이지 접속 시 getNotices가 호출된다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(getNotices).toHaveBeenCalledTimes(1);
    });
  });

  it('API 응답의 공지 제목들이 목록에 표시된다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(screen.getByText('첫 번째 공지')).toBeInTheDocument();
      expect(screen.getByText('두 번째 공지')).toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────
// admin 접근 제어
// ──────────────────────────────────────────
describe('NoticeListPage 글쓰기 버튼 접근 제어', () => {
  it('비로그인 상태에서 글쓰기 버튼이 보이지 않는다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '글쓰기' })).not.toBeInTheDocument();
    });
  });

  it('일반 사용자(role=user)에게 글쓰기 버튼이 보이지 않는다', async () => {
    renderWithAuth(NORMAL_USER);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '글쓰기' })).not.toBeInTheDocument();
    });
  });

  it('admin에게 글쓰기 버튼이 보인다', async () => {
    renderWithAuth(ADMIN_USER);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '글쓰기' })).toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────
// 네비게이션
// ──────────────────────────────────────────
describe('NoticeListPage 네비게이션', () => {
  it('글쓰기 버튼 클릭 시 /notice/write로 이동한다', async () => {
    renderWithAuth(ADMIN_USER);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '글쓰기' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '글쓰기' }));
    expect(mockNavigate).toHaveBeenCalledWith('/notice/write');
  });

  it('공지 항목 클릭 시 /notice/{id}로 이동한다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(screen.getByText('첫 번째 공지')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('첫 번째 공지'));
    expect(mockNavigate).toHaveBeenCalledWith('/notice/1');
  });
});
