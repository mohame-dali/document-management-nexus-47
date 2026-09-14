
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

export interface ResponsibleNotification {
  _id: string;
  documentId: {
    _id: string;
    subject: string;
    serialNumber: number;
    year: number;
  };
  assignedUserId: string;
  assignedBy: {
    _id: string;
    username: string;
  };
  isRead: boolean;
  isDismissed: boolean;
  dismissedUntil?: string;
  createdAt: string;
}

// Get unread responsible notifications for current user
export const getUnreadResponsibleNotifications = async (): Promise<ResponsibleNotification[]> => {
  try {
    const response = await api.get('/responsible-notifications/unread');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching unread responsible notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markResponsibleNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await api.put(`/responsible-notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Error marking responsible notification as read:', error);
    throw error;
  }
};

// Temporarily dismiss notification
export const dismissResponsibleNotification = async (notificationId: string, dismissMinutes: number = 60): Promise<void> => {
  try {
    await api.put(`/responsible-notifications/${notificationId}/dismiss`, {
      dismissMinutes
    });
  } catch (error) {
    console.error('Error dismissing responsible notification:', error);
    throw error;
  }
};
