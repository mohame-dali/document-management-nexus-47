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

export const getMessages = async (type?: 'inbox' | 'sent' | 'all'): Promise<{ 
  data: Message[]; 
  count: number;
  unreadCount: number; 
  inboxCount?: number;
  sentCount?: number;
  oneToOneCount: number;
  groupCount: number;
}> => {
  try {
    const url = type && type !== 'all' ? `/messages?type=${type}` : '/messages';
    const response = await api.get(url);
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
  attachments?: File[],
  priority?: 'normal' | 'high' | 'urgent'
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
    if (priority) {
      formData.append('priority', priority);
    }
    
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

export const markAllAsRead = async (): Promise<{ success: boolean; updated: number }> => {
  try {
    const response = await api.put('/messages/read-all');
    return response.data;
  } catch (error) {
    console.error('Error marking all messages as read:', error);
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

export const downloadAttachment = async (attachment: any, openInNewTab = false): Promise<void> => {
  try {
    let filename = '';
    if (attachment.filename) {
      filename = attachment.filename;
    } else if (attachment.path) {
      filename = attachment.path.split(/[\/\\]/).pop() || '';
    } else if (attachment.url) {
      filename = attachment.url.split(/[\/\\]/).pop() || '';
    }

    if (!filename) {
      throw new Error('Nom de fichier manquant');
    }

    // Fetch the file with auth headers and arraybuffer/blob responseType
    const response = await api.get(`/messages/attachments/${filename}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream',
    });
    const blobUrl = window.URL.createObjectURL(blob);

    if (openInNewTab) {
      window.open(blobUrl, '_blank');
      // Revoke after delay to allow browser to open it
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
    }
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw error;
  }
};

