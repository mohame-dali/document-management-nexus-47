import api from './apiService';

export const getOnlineUsers = async (): Promise<string[]> => {
  const response = await api.get<{ success: boolean; data?: string[] }>('/users/online');
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const sendHeartbeat = async (): Promise<void> => {
  await api.post('/users/heartbeat');
};
