import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

vi.mock('../services/noticeService', () => ({
  getNotice: vi.fn().mockResolvedValue({
    id: 1,
    title: '테스트 공지 제목',
    content: '<p>공지 <strong>내용</strong></p><img src="/img/test.png" />',
    created_at: '2026-03-01T09:00:00',
  }),
  deleteNotice: vi.fn().mockResolvedValue({}),
}));

import { getNotice, deleteNotice } from '../services/noticeService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const ADMIN_USER = { user_id: 1, nickname: '관리자', role: 'admin', email: 'admin@test.com' };
const NORMAL_USER = { user_id: 2, nickname: '일반유저', role: 'user', email: 'user@test.com' };

import NoticeDetailPage from '../pages/Notice/NoticeDetailPage';

function renderWithAuth(userValue, id = '1') {
  if (userValue) {
    localStorage.setItem('user', JSON.stringify(userValue));
  }
  return render(
    <MemoryRouter initialEntries={[`/notice/${id}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/notice/:id" element={<NoticeDetailPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getNotice.mockResolvedValue({
    id: 1,
    title: '테스트 공지 제목',
    content: '<p>공지 <strong>내용</strong></p>',
    created_at: '2026-03-01T09:00:00',
  });
  deleteNotice.mockResolvedValue({});
});

// ──────────────────────────────────────────
// 데이터 로딩
// ──────────────────────────────────────────
describe('NoticeDetailPage 데이터 로딩', () => {
  it('페이지 접속 시 getNotice(id)가 호출된다', async () => {
    renderWithAuth(null, '1');
    await waitFor(() => {
      expect(getNotice).toHaveBeenCalledWith('1');
    });
  });

  it('API 응답의 제목이 화면에 표시된다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(screen.getByText('테스트 공지 제목')).toBeInTheDocument();
    });
  });

  it('API 응답의 날짜가 한국어 형식으로 표시된다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(screen.getByText('2026. 3. 1.')).toBeInTheDocument();
    });
  });

  it('API 응답의 HTML 콘텐츠가 렌더링된다', async () => {
    getNotice.mockResolvedValue({
      id: 1,
      title: '테스트 공지 제목',
      content: '<p>HTML <strong>콘텐츠</strong></p>',
      created_at: '2026-03-01T09:00:00',
    });
    renderWithAuth(null);
    await waitFor(() => {
      expect(screen.getByText('콘텐츠')).toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────
// 접근 제어
// ──────────────────────────────────────────
describe('NoticeDetailPage 접근 제어', () => {
  it('비로그인 사용자에게 삭제 버튼이 보이지 않는다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(screen.getByText('테스트 공지 제목')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });

  it('일반 사용자에게 삭제 버튼이 보이지 않는다', async () => {
    renderWithAuth(NORMAL_USER);
    await waitFor(() => {
      expect(screen.getByText('테스트 공지 제목')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });

  it('admin에게 삭제 버튼이 보인다', async () => {
    renderWithAuth(ADMIN_USER);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────
// 네비게이션
// ──────────────────────────────────────────
describe('NoticeDetailPage 네비게이션', () => {
  it('목록으로 버튼 클릭 시 /notice로 이동한다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(screen.getByText('테스트 공지 제목')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('← 목록으로'));
    expect(mockNavigate).toHaveBeenCalledWith('/notice');
  });

  it('admin이 삭제 버튼 클릭 시 deleteNotice를 호출하고 /notice로 이동한다', async () => {
    renderWithAuth(ADMIN_USER);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    await waitFor(() => {
      expect(deleteNotice).toHaveBeenCalledWith('1');
      expect(mockNavigate).toHaveBeenCalledWith('/notice');
    });
  });
});
