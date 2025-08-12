
import axios from 'axios';
import { ActivityNotification } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Set up axios defaults
axios.defaults.withCredentials = true;

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getActivityNotifications = async (): Promise<ActivityNotification[]> => {
  try {
    const response = await api.get('/activity-notifications');
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching activity notifications:', error);
    throw error;
  }
};

export const getNotificationCount = async (): Promise<number> => {
  try {
    const response = await api.get('/activity-notifications/count');
    return response.data.count || 0;
  } catch (error) {
    console.error('Error fetching notification count:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await api.put(`/activity-notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await api.delete(`/activity-notifications/${notificationId}`);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};
