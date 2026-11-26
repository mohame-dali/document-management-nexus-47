import axios from 'axios';
import { User } from '@/types';
import api from '../apiService';

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const saveAuthToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      delete api.defaults.headers.common['Authorization'];
      delete axios.defaults.headers.common['Authorization'];
    }
  } catch (error) {
    console.error('Failed to update stored auth token:', error);
  }
};

export const getCurrentUser = (): User | null => {
  try {
    const rawUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!rawUser) {
      return null;
    }
    return JSON.parse(rawUser) as User;
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    return null;
  }
};

export const saveCurrentUser = (user: User | null): void => {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to store current user:', error);
  }
};

export const initializeAuth = (): string | null => {
  const token = getAuthToken();
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  return token;
};

export const clearAllAuthData = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
};
