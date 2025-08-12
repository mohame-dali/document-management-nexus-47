import axios from 'axios';
import { Message } from '@/types';

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
    console.error('Message API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const getMessages = async (): Promise<{ 
  data: Message[]; 
  count: number;
  unreadCount: number; 
  oneToOneCount: number;
  groupCount: number;
}> => {
  try {
    const response = await api.get('/messages');
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const getMessage = async (id: string): Promise<Message> => {
  try {
    const response = await api.get(`/messages/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching message:', error);
    throw error;
  }
};

export const sendMessage = async (
  recipientIds: string[],
  subject: string,
  content: string,
  attachments?: File[]
): Promise<Message> => {
  try {
    const formData = new FormData();
    
    // Handle recipientIds - ensure it's an array
    if (Array.isArray(recipientIds)) {
      recipientIds.forEach(id => formData.append('recipientIds', id));
    } else {
      formData.append('recipientIds', recipientIds as string);
    }
    
    formData.append('subject', subject);
    formData.append('content', content);
    
    if (attachments && attachments.length > 0) {
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
    }
    
    const response = await api.post('/messages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const markAsRead = async (messageId: string): Promise<Message> => {
  try {
    const response = await api.put(`/messages/${messageId}/read`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    await api.delete(`/messages/${messageId}`);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  try {
    const response = await api.get('/messages/unread/count');
    return response.data;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

export const searchMessages = async (query: string): Promise<Message[]> => {
  try {
    const response = await api.get(`/messages/search?q=${encodeURIComponent(query)}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error searching messages:', error);
    throw error;
  }
};

export const getConversation = async (userId: string): Promise<Message[]> => {
  try {
    const response = await api.get(`/messages/conversation/${userId}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
};

export const markAllAsRead = async (): Promise<{ updated: number }> => {
  try {
    const response = await api.put('/messages/read-all');
    return response.data;
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    throw error;
  }
};
