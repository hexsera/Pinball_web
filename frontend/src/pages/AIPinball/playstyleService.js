import axios from 'axios';

export async function sendPlaystyleData(dataArray) {
  const response = await axios.post('/api/v1/pinball_ai/playstyle', dataArray);
  return response.data;
}

export function parsePlaystyleResponse(response) {
  if (response.playstyle === 'attack') return 'small';
  if (response.playstyle === 'defence') return 'big';
  return null;
}

export function getRandomSkill() {
  return Math.random() < 0.5 ? 'big' : 'small';
}
