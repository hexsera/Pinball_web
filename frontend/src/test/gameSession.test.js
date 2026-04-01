import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { saveGameSession, loadGameSession, deleteGameSession } from '../utils/gameSession';

vi.mock('axios');

beforeEach(() => {
  vi.clearAllMocks();
});

// saveGameSession
describe('saveGameSession', () => {
  it('올바른 URL로 PUT 요청을 보낸다', async () => {
    axios.put.mockResolvedValue({ data: {} });
    await saveGameSession(42, { score: 100, lives: 3, stage: 1 });
    expect(axios.put).toHaveBeenCalledWith('/api/v1/game-sessions/42', expect.any(Object));
  });

  it('score, lives, stage를 요청 body에 포함한다', async () => {
    axios.put.mockResolvedValue({ data: {} });
    await saveGameSession(42, { score: 500, lives: 2, stage: 3 });
    expect(axios.put).toHaveBeenCalledWith(expect.any(String), { score: 500, lives: 2, stage: 3 });
  });

  it('PUT 요청이 실패하면 에러를 throw한다', async () => {
    axios.put.mockRejectedValue(new Error('Network Error'));
    await expect(saveGameSession(42, { score: 100, lives: 3, stage: 1 })).rejects.toThrow('Network Error');
  });
});

// loadGameSession
describe('loadGameSession', () => {
  it('올바른 URL로 GET 요청을 보낸다', async () => {
    axios.get.mockResolvedValue({ data: { score: 100, lives: 3, stage: 1 } });
    await loadGameSession(42);
    expect(axios.get).toHaveBeenCalledWith('/api/v1/game-sessions/42');
  });

  it('세션이 있으면 데이터를 반환한다', async () => {
    const session = { score: 100, lives: 3, stage: 1 };
    axios.get.mockResolvedValue({ data: session });
    const result = await loadGameSession(42);
    expect(result).toEqual(session);
  });

  it('404면 null을 반환한다', async () => {
    const error = { response: { status: 404 } };
    axios.get.mockRejectedValue(error);
    const result = await loadGameSession(42);
    expect(result).toBeNull();
  });

  it('404 외 오류는 에러를 throw한다', async () => {
    const error = { response: { status: 500 } };
    axios.get.mockRejectedValue(error);
    await expect(loadGameSession(42)).rejects.toEqual(error);
  });
});

// deleteGameSession
describe('deleteGameSession', () => {
  it('올바른 URL로 DELETE 요청을 보낸다', async () => {
    axios.delete.mockResolvedValue({ data: {} });
    await deleteGameSession(42);
    expect(axios.delete).toHaveBeenCalledWith('/api/v1/game-sessions/42');
  });

  it('DELETE 요청이 실패하면 에러를 throw한다', async () => {
    axios.delete.mockRejectedValue(new Error('Network Error'));
    await expect(deleteGameSession(42)).rejects.toThrow('Network Error');
  });
});
