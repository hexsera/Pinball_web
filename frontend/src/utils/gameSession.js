import axios from 'axios';

export async function saveGameSession(userId, { score, lives, stage }) {
  await axios.put(`/api/v1/game-sessions/${userId}`, { score, lives, stage });
}

export async function loadGameSession(userId) {
  try {
    const res = await axios.get(`/api/v1/game-sessions/${userId}`);
    return res.data;
  } catch (e) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

export async function deleteGameSession(userId) {
  await axios.delete(`/api/v1/game-sessions/${userId}`);
}
