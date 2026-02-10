import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import HeaderUserInfo from '../components/HeaderUserInfo';
import { AuthProvider } from '../contexts/AuthContext';

describe('HeaderUserInfo 컴포넌트', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));
  });

  afterEach(() => {
    localStorage.clear();
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
