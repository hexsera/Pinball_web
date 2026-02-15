import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import HeaderUserInfo from '../components/HeaderUserInfo';
import { AuthProvider } from '../contexts/AuthContext';

describe('HeaderUserInfo 컴포넌트', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저', email: 'test@example.com' }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('이메일 표시', () => {
    it('아바타 메뉴를 열면 사용자 이메일이 표시된다', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('닫기 버튼', () => {
    it('아바타 메뉴에 닫기 버튼이 있다', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByRole('button', { name: /닫기/ })).toBeInTheDocument();
    });

    it('닫기 버튼 클릭 시 메뉴가 닫힌다', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /닫기/ }));

      // MUI Menu가 닫히면 role="menu" 요소가 사라진다
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('메뉴 렌더링', () => {
    it('메뉴에 "페이지 이동" MenuItem이 존재한다', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('페이지 이동')).toBeInTheDocument();
    });
  });

  describe('계정설정 이동', () => {
    it('메뉴에 "계정설정" MenuItem이 존재한다', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('계정설정')).toBeInTheDocument();
    });

    it('"계정설정" 클릭 시 /dashboard로 이동하고 section이 "계정"이다', () => {
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

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);
      fireEvent.click(screen.getByText('계정설정'));

      expect(testLocation.pathname).toBe('/dashboard');
      expect(testLocation.state?.section).toBe('계정');
    });
  });

  describe('친구 이동', () => {
    it('메뉴에 "친구" MenuItem이 존재한다', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <HeaderUserInfo />
          </AuthProvider>
        </MemoryRouter>
      );

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      expect(screen.getByText('친구')).toBeInTheDocument();
    });

    it('"친구" 클릭 시 /dashboard로 이동하고 section이 "친구"이다', () => {
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

      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);
      fireEvent.click(screen.getByText('친구'));

      expect(testLocation.pathname).toBe('/dashboard');
      expect(testLocation.state?.section).toBe('친구');
    });
  });

  describe('페이지 이동 기능', () => {
    it('메인 페이지(/)에서 "페이지 이동" 클릭 시 /admin으로 이동한다', () => {
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

      // 초기 위치 확인
      expect(testLocation.pathname).toBe('/');

      // 메뉴 열기
      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      // "페이지 이동" 클릭
      const pageNavButton = screen.getByText('페이지 이동');
      fireEvent.click(pageNavButton);

      // /admin으로 이동했는지 확인
      expect(testLocation.pathname).toBe('/admin');
    });

    it('/admin으로 시작하는 페이지에서 "페이지 이동" 클릭 시 /로 이동한다', () => {
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

      // 초기 위치 확인
      expect(testLocation.pathname).toBe('/admin');

      // 메뉴 열기
      const avatarButton = screen.getByText('테스트유저').closest('button');
      fireEvent.click(avatarButton);

      // "페이지 이동" 클릭
      const pageNavButton = screen.getByText('페이지 이동');
      fireEvent.click(pageNavButton);

      // /로 이동했는지 확인
      expect(testLocation.pathname).toBe('/');
    });
  });
});
