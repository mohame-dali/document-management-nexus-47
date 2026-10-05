import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getOnlineUsers = async (): Promise<string[]> => {
  const response = await api.get('/users/online');
  return response.data.data || [];
};

export const sendHeartbeat = async (): Promise<void> => {
  await api.post('/users/heartbeat');
};
