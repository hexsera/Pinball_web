import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HeaderUserInfo from '../components/HeaderUserInfo';
import { AuthProvider } from '../AuthContext';

describe('HeaderUserInfo 컴포넌트', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));
  });

  afterEach(() => {
    localStorage.clear();
  });

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
