import axios from 'axios';
import { seedNoticesIfEmpty, getAllNoticesFromDB, getNoticeFromDB } from '../utils/noticeIndexDB';

export const getNotices = async (skip = 0, limit = 10) => {
  try {
    const res = await axios.get('/api/v1/notices', { params: { skip, limit } });
    return res.data; // { items, total }
  } catch {
    await seedNoticesIfEmpty();
    const all = await getAllNoticesFromDB();
    return {
      items: all.slice(skip, skip + limit),
      total: all.length,
    };
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
