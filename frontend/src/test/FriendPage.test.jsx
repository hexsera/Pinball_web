import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import FriendPage from '../pages/FriendPage';

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


describe('FriendPage 레이아웃 통합', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));
  });

  it('왼쪽 영역(검색)과 오른쪽 영역(요청+목록)이 분리되어 렌더링된다', () => {
    render(<FriendPage />);

    const leftArea = screen.getByTestId('friend-left-area');
    const rightArea = screen.getByTestId('friend-right-area');

    // 왼쪽 영역에 검색 관련 요소 존재
    expect(leftArea.querySelector('input[placeholder="닉네임을 입력하세요"]')).toBeInTheDocument();

    // 오른쪽 영역에 Paper 존재
    expect(rightArea.querySelector('.MuiPaper-root')).toBeInTheDocument();
  });
});
