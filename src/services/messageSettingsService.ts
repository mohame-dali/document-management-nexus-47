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

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Message Settings API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface RetentionPolicy {
  enabled: boolean;
  period: number;
  unit: 'days' | 'months' | 'years';
  updatedAt?: string;
  updatedBy?: string;
}

export interface MessagesStats {
  totalMessages: number;
  totalAttachments: number;
  messagesByAge: {
    lastMonth: number;
    lastThreeMonths: number;
    lastSixMonths: number;
    lastYear: number;
    olderThanYear: number;
  };
}

export interface DeleteResult {
  deletedCount: number;
  deletedAttachments: number;
  thresholdDate: string;
  period: number;
  unit: string;
}

export const deleteMessagesByPeriod = async (period: number, unit: string): Promise<DeleteResult> => {
  try {
    const response = await api.post('/message-settings/delete-by-period', { period, unit });
    return response.data.data;
  } catch (error) {
    console.error('Error deleting messages by period:', error);
    throw error;
  }
};

export const setRetentionPolicy = async (policy: RetentionPolicy): Promise<RetentionPolicy> => {
  try {
    const response = await api.post('/message-settings/retention-policy', policy);
    return response.data.data;
  } catch (error) {
    console.error('Error setting retention policy:', error);
    throw error;
  }
};

export const getRetentionPolicy = async (): Promise<RetentionPolicy> => {
  try {
    const response = await api.get('/message-settings/retention-policy');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching retention policy:', error);
    throw error;
  }
};

export const getMessagesStats = async (): Promise<MessagesStats> => {
  try {
    const response = await api.get('/message-settings/stats');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching messages stats:', error);
    throw error;
  }
};