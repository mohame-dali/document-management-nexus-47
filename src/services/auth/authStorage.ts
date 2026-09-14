
import { User } from '@/types';
import { setAuthToken } from './authApi';

// Get current user from localStorage
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

// Initialize token from localStorage
export const initializeAuth = (): void => {
  const token = localStorage.getItem('token');
  if (token) {
    setAuthToken(token);
  }
};

// Clear all authentication data completely
export const clearAllAuthData = (): void => {
  console.log('Clearing all authentication data');
  
  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Clear sessionStorage as backup
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  
  // Clear axios auth token
  setAuthToken(null);
  
  // Clear any cached user data
  if (window.cachedUser) {
    delete window.cachedUser;
  }
  
  // Set explicit logout flag to prevent auto re-login
  sessionStorage.setItem('explicit_logout', 'true');
};
