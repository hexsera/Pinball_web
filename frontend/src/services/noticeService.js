import axios from 'axios';
import { seedNoticesIfEmpty, getAllNoticesFromDB, getNoticeFromDB } from '../utils/noticeIndexDB';

export const getNotices = async () => {
  try {
    const res = await axios.get('/api/v1/notices');
    return res.data;
  } catch {
    await seedNoticesIfEmpty();
    return getAllNoticesFromDB();
  }
};

export const getNotice = async (id) => {
  try {
    const res = await axios.get(`/api/v1/notices/${id}`);
    return res.data;
  } catch {
    await seedNoticesIfEmpty();
    return getNoticeFromDB(id);
  }
};

export const createNotice = (title, content) =>
  axios.post('/api/v1/notices', { title, content }).then(res => res.data);

export const deleteNotice = (id) =>
  axios.delete(`/api/v1/notices/${id}`).then(res => res.data);

export const uploadNoticeImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post('/api/v1/notices/upload-image', formData).then(res => res.data);
};
