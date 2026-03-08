import axios from 'axios';

export const getNotices = () =>
  axios.get('/api/v1/notices').then(res => res.data);

export const getNotice = (id) =>
  axios.get(`/api/v1/notices/${id}`).then(res => res.data);

export const createNotice = (title, content) =>
  axios.post('/api/v1/notices', { title, content }).then(res => res.data);

export const deleteNotice = (id) =>
  axios.delete(`/api/v1/notices/${id}`).then(res => res.data);

export const uploadNoticeImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post('/api/v1/notices/upload-image', formData).then(res => res.data);
};
