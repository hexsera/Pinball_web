import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import axios from 'axios';
import HeaderUserInfo from '../components/HeaderUserInfo';
import { AuthProvider } from '../contexts/AuthContext';

vi.mock('axios');

describe('HeaderUserInfo 컴포넌트', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저', email: 'test@example.com' }));
    axios.get.mockResolvedValue({ data: { role: 'user' } });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('이메일 표시', () => {
    it('아바타 메뉴를 열면 사용자 이메일이 표시된다', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('닫기 버튼', () => {
    it('아바타 메뉴에 닫기 버튼이 있다', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByRole('button', { name: /닫기/ })).toBeInTheDocument();
    });

    it('닫기 버튼 클릭 시 메뉴가 닫힌다', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /닫기/ }));

      // MUI Menu가 닫히면 role="menu" 요소가 사라진다
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('계정설정 이동', () => {
    it('메뉴에 "계정설정" MenuItem이 존재한다', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('계정설정')).toBeInTheDocument();
    });

    it('"계정설정" 클릭 시 /dashboard로 이동하고 section이 "계정"이다', async () => {
      let testLocation;

      const LocationTracker = () => {
        testLocation = useLocation();
        return null;
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <HeaderUserInfo />
            <LocationTracker />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);
      fireEvent.click(screen.getByText('계정설정'));

      expect(testLocation.pathname).toBe('/dashboard');
      expect(testLocation.state?.section).toBe('계정');
    });
  });

  describe('친구 이동', () => {
    it('메뉴에 "친구" MenuItem이 존재한다', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('친구')).toBeInTheDocument();
    });

    it('"친구" 클릭 시 /dashboard로 이동하고 section이 "친구"이다', async () => {
      let testLocation;

      const LocationTracker = () => {
        testLocation = useLocation();
        return null;
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <HeaderUserInfo />
            <LocationTracker />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);
      fireEvent.click(screen.getByText('친구'));

      expect(testLocation.pathname).toBe('/dashboard');
      expect(testLocation.state?.section).toBe('친구');
    });
  });

  // ─── 새 요구사항 테스트 (RED) ─────────────────────────────────────────────

  describe('페이지 이동 항목 표시 여부 (role 기반)', () => {
    it('role이 admin인 사용자는 메뉴에 "관리 페이지 이동"이 표시된다', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, name: '어드민유저', email: 'admin@example.com' }));
      axios.get.mockResolvedValue({ data: { role: 'admin' } });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('어드민유저').closest('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('관리 페이지 이동')).toBeInTheDocument();
      });
    });

    it('role이 user인 사용자는 메뉴에 페이지 이동 항목이 표시되지 않는다', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 2, name: '일반유저', email: 'user@example.com' }));
      axios.get.mockResolvedValue({ data: { role: 'user' } });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('일반유저').closest('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        expect(screen.queryByText('관리 페이지 이동')).not.toBeInTheDocument();
        expect(screen.queryByText('메인 페이지 이동')).not.toBeInTheDocument();
      });
    });

    it('role이 없는 사용자는 메뉴에 페이지 이동 항목이 표시되지 않는다', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 3, name: '롤없는유저', email: 'norole@example.com' }));
      axios.get.mockResolvedValue({ data: {} });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('롤없는유저').closest('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        expect(screen.queryByText('관리 페이지 이동')).not.toBeInTheDocument();
        expect(screen.queryByText('메인 페이지 이동')).not.toBeInTheDocument();
      });
    });
  });

  describe('페이지 이동 문구 변경 (경로 기반)', () => {
    it('admin 유저가 /admin 경로에 있으면 "메인 페이지 이동"이 표시된다', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, name: '어드민유저', email: 'admin@example.com' }));
      axios.get.mockResolvedValue({ data: { role: 'admin' } });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('어드민유저').closest('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('메인 페이지 이동')).toBeInTheDocument();
        expect(screen.queryByText('관리 페이지 이동')).not.toBeInTheDocument();
      });
    });

    it('admin 유저가 /admin 경로가 아니면 "관리 페이지 이동"이 표시된다', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, name: '어드민유저', email: 'admin@example.com' }));
      axios.get.mockResolvedValue({ data: { role: 'admin' } });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('어드민유저').closest('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('관리 페이지 이동')).toBeInTheDocument();
        expect(screen.queryByText('메인 페이지 이동')).not.toBeInTheDocument();
      });
    });
  });

  describe('API로 role 가져오기', () => {
    it('컴포넌트 마운트 시 GET /api/v1/users/{id}를 호출한다', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 42, name: '테스트유저', email: 'test@example.com' }));
      axios.get.mockResolvedValue({ data: { role: 'user' } });

      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/users/42');
      });
    });
  });

  describe('페이지 이동 내비게이션', () => {
    it('"관리 페이지 이동" 클릭 시 /admin으로 이동한다', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, name: '어드민유저', email: 'admin@example.com' }));
      axios.get.mockResolvedValue({ data: { role: 'admin' } });

      let testLocation;

      const LocationTracker = () => {
        testLocation = useLocation();
        return null;
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <HeaderUserInfo />
            <LocationTracker />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('어드민유저').closest('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('관리 페이지 이동')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('관리 페이지 이동'));

      expect(testLocation.pathname).toBe('/admin');
    });

    it('"메인 페이지 이동" 클릭 시 /로 이동한다', async () => {
      localStorage.setItem('user', JSON.stringify({ id: 1, name: '어드민유저', email: 'admin@example.com' }));
      axios.get.mockResolvedValue({ data: { role: 'admin' } });

      let testLocation;

      const LocationTracker = () => {
        testLocation = useLocation();
        return null;
      };

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AuthProvider>
            <HeaderUserInfo />
            <LocationTracker />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('어드민유저').closest('button');
      fireEvent.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText('메인 페이지 이동')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('메인 페이지 이동'));

      expect(testLocation.pathname).toBe('/');
    });
  });
});
