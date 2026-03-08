import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNotices, getNotice, createNotice, deleteNotice } from '../services/noticeService';

vi.mock('axios');
import axios from 'axios';

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────
// getNotices
// ──────────────────────────────────────────
describe('getNotices', () => {
  it('GET /api/v1/notices를 호출한다', async () => {
    axios.get.mockResolvedValue({ data: [] });
    await getNotices();
    expect(axios.get).toHaveBeenCalledWith('/api/v1/notices');
  });

  it('서버 응답 data 배열을 반환한다', async () => {
    const mockData = [{ id: 1, title: '공지1' }];
    axios.get.mockResolvedValue({ data: mockData });
    const result = await getNotices();
    expect(result).toEqual(mockData);
  });
});

// ──────────────────────────────────────────
// getNotice
// ──────────────────────────────────────────
describe('getNotice', () => {
  it('GET /api/v1/notices/{id}를 호출한다', async () => {
    axios.get.mockResolvedValue({ data: {} });
    await getNotice(5);
    expect(axios.get).toHaveBeenCalledWith('/api/v1/notices/5');
  });

  it('서버 응답 data 객체를 반환한다', async () => {
    const mockData = { id: 5, title: '공지5', content: '<p>내용</p>' };
    axios.get.mockResolvedValue({ data: mockData });
    const result = await getNotice(5);
    expect(result).toEqual(mockData);
  });
});

// ──────────────────────────────────────────
// createNotice
// ──────────────────────────────────────────
describe('createNotice', () => {
  it('POST /api/v1/notices를 title, content와 함께 호출한다', async () => {
    axios.post.mockResolvedValue({ data: { id: 10 } });
    await createNotice('제목', '<p>내용</p>');
    expect(axios.post).toHaveBeenCalledWith('/api/v1/notices', {
      title: '제목',
      content: '<p>내용</p>',
    });
  });

  it('서버 응답 data를 반환한다', async () => {
    const mockData = { id: 10, title: '제목' };
    axios.post.mockResolvedValue({ data: mockData });
    const result = await createNotice('제목', '<p>내용</p>');
    expect(result).toEqual(mockData);
  });
});

// ──────────────────────────────────────────
// deleteNotice
// ──────────────────────────────────────────
describe('deleteNotice', () => {
  it('DELETE /api/v1/notices/{id}를 호출한다', async () => {
    axios.delete.mockResolvedValue({ data: {} });
    await deleteNotice(3);
    expect(axios.delete).toHaveBeenCalledWith('/api/v1/notices/3');
  });

  it('서버 응답 data를 반환한다', async () => {
    const mockData = { message: 'deleted' };
    axios.delete.mockResolvedValue({ data: mockData });
    const result = await deleteNotice(3);
    expect(result).toEqual(mockData);
  });
});
