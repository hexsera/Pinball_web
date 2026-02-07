import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import FriendPage from '../FriendPage';

describe('FriendPage 검색기능', () => {
  it('검색바가 존재한다', () => {
    render(<FriendPage />);
    const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
    expect(searchInput).toBeInTheDocument();
  });

  it('검색 버튼이 존재한다', () => {
    render(<FriendPage />);
    const searchButton = screen.getByRole('button', { name: '검색' });
    expect(searchButton).toBeInTheDocument();
  });

  it('검색바에 닉네임을 입력할 수 있다', async () => {
    const user = userEvent.setup();
    render(<FriendPage />);

    const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
    await user.type(searchInput, '테스트유저');

    expect(searchInput).toHaveValue('테스트유저');
  });

  it('검색 버튼 클릭 시 사용자 리스트가 표시된다', async () => {
    const user = userEvent.setup();
    render(<FriendPage />);

    const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
    await user.type(searchInput, '테스트');

    const searchButton = screen.getByRole('button', { name: '검색' });
    await user.click(searchButton);

    // Mock 데이터에 '테스트' 포함된 닉네임이 여러 개 표시됨
    const results = await screen.findAllByText(/테스트유저/);
    expect(results.length).toBeGreaterThan(0);
  });

  it('검색 결과가 없으면 안내 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<FriendPage />);

    const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
    await user.type(searchInput, 'zzz존재하지않는닉네임zzz');

    const searchButton = screen.getByRole('button', { name: '검색' });
    await user.click(searchButton);

    const message = await screen.findByText('검색 결과가 없습니다');
    expect(message).toBeInTheDocument();
  });

  it('검색 결과 각 항목에 "친구추가" 버튼이 존재한다', async () => {
    const user = userEvent.setup();
    render(<FriendPage />);

    const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
    await user.type(searchInput, '테스트');

    const searchButton = screen.getByRole('button', { name: '검색' });
    await user.click(searchButton);

    // "친구추가" 버튼이 여러 개 존재 (검색 결과 개수만큼)
    const addButtons = await screen.findAllByRole('button', { name: '친구추가' });
    expect(addButtons.length).toBeGreaterThan(0);
  });
});
