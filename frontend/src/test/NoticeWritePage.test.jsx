import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

// Tiptap은 jsdom에서 동작하지 않으므로 mock 처리
const mockEditorChain = () => ({
  focus: () => ({
    toggleBold: () => ({ run: vi.fn() }),
    toggleItalic: () => ({ run: vi.fn() }),
    toggleHeading: () => ({ run: vi.fn() }),
    setImage: () => ({ run: vi.fn() }),
  }),
});

vi.mock('@tiptap/react', () => ({
  useEditor: () => ({ chain: mockEditorChain, getHTML: () => '<p>테스트 내용</p>' }),
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock('@tiptap/starter-kit', () => ({ default: {} }));
vi.mock('@tiptap/extension-image', () => ({ default: {} }));

vi.mock('../services/noticeService', () => ({
  createNotice: vi.fn().mockResolvedValue({ id: 1 }),
  uploadNoticeImage: vi.fn().mockResolvedValue({ url: '/uploads/img.png' }),
}));

import { createNotice } from '../services/noticeService';
import NoticeWritePage from '../pages/Notice/NoticeWritePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const ADMIN_USER = { user_id: 1, nickname: '관리자', role: 'admin', email: 'admin@test.com' };

function renderWithAuth(userValue) {
  if (userValue) {
    localStorage.setItem('user', JSON.stringify(userValue));
  }
  return render(
    <MemoryRouter>
      <AuthProvider>
        <NoticeWritePage />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ──────────────────────────────────────────
// 접근 제어
// ──────────────────────────────────────────
describe('NoticeWritePage 접근 제어', () => {
  it('비로그인 상태에서 /notice로 리다이렉트된다', async () => {
    renderWithAuth(null);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notice');
    });
  });

  it('일반 사용자(role=user) 접근 시 /notice로 리다이렉트된다', async () => {
    renderWithAuth({ user_id: 2, nickname: '일반유저', role: 'user', email: 'user@test.com' });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notice');
    });
  });

  it('admin 사용자는 페이지가 렌더링된다', async () => {
    renderWithAuth(ADMIN_USER);
    await waitFor(() => {
      expect(screen.getByText('공지사항 작성')).toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────
// 렌더링
// ──────────────────────────────────────────
describe('NoticeWritePage 렌더링', () => {
  beforeEach(() => {
    renderWithAuth(ADMIN_USER);
  });

  it('제목 입력 필드가 존재한다', async () => {
    await waitFor(() => {
      expect(screen.getByLabelText('제목')).toBeInTheDocument();
    });
  });

  it('Bold(B) 툴바 버튼이 존재한다', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
    });
  });

  it('Italic(I) 툴바 버튼이 존재한다', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'I' })).toBeInTheDocument();
    });
  });

  it('H2 툴바 버튼이 존재한다', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'H2' })).toBeInTheDocument();
    });
  });

  it('이미지 업로드 버튼이 존재한다', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /이미지/i })).toBeInTheDocument();
    });
  });

  it('저장 버튼이 존재한다', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    });
  });

  it('취소 버튼이 존재한다', async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });
  });
});

// ──────────────────────────────────────────
// 인터랙션
// ──────────────────────────────────────────
describe('NoticeWritePage 인터랙션', () => {
  beforeEach(async () => {
    renderWithAuth(ADMIN_USER);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });
  });

  it('취소 버튼 클릭 시 /notice로 이동한다', async () => {
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(mockNavigate).toHaveBeenCalledWith('/notice');
  });

  it('저장 버튼 클릭 시 createNotice가 호출된다', async () => {
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '테스트 제목' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => {
      expect(createNotice).toHaveBeenCalledWith('테스트 제목', '<p>테스트 내용</p>');
    });
  });

  it('저장 후 /notice로 이동한다', async () => {
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/notice');
    });
  });
});
