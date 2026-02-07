import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FriendPage from '../FriendPage';
import Maindashboard from '../Dashboard';
import { AuthProvider } from '../AuthContext';

describe('FriendPage 컴포넌트', () => {
  it('FriendPage가 렌더링된다', () => {
    render(<FriendPage />);
    const container = screen.getByTestId('friend-page');
    expect(container).toBeInTheDocument();
  });

  it('왼쪽 60% 영역과 오른쪽 40% 영역이 존재한다', () => {
    render(<FriendPage />);
    const leftArea = screen.getByTestId('friend-left-area');
    const rightArea = screen.getByTestId('friend-right-area');

    expect(leftArea).toBeInTheDocument();
    expect(rightArea).toBeInTheDocument();
  });

  it('왼쪽 영역이 60%, 오른쪽 영역이 40% 비율이다', () => {
    render(<FriendPage />);
    const leftArea = screen.getByTestId('friend-left-area');
    const rightArea = screen.getByTestId('friend-right-area');

    // MUI Box의 sx prop으로 설정된 width 검증
    expect(leftArea).toHaveStyle({ width: '60%' });
    expect(rightArea).toHaveStyle({ width: '40%' });
  });

  it('왼쪽 영역에 Paper 컴포넌트가 존재한다', () => {
    render(<FriendPage />);
    const leftArea = screen.getByTestId('friend-left-area');
    const paper = leftArea.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });

  it('오른쪽 영역에 Paper 컴포넌트가 존재한다', () => {
    render(<FriendPage />);
    const rightArea = screen.getByTestId('friend-right-area');
    const paper = rightArea.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });
});

describe('Dashboard 친구 페이지 통합', () => {
  beforeEach(() => {
    // 로그인 상태를 localStorage에 설정
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));
  });

  it('"친구" 메뉴 클릭 시 FriendPage가 표시된다', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Maindashboard />
        </AuthProvider>
      </MemoryRouter>
    );

    // '친구' 텍스트가 여러 개 있을 수 있으므로 첫 번째 요소 클릭
    const friendMenus = screen.getAllByText('친구');
    fireEvent.click(friendMenus[0]);

    const friendPage = screen.getByTestId('friend-page');
    expect(friendPage).toBeInTheDocument();
  });
});
