
import axios from 'axios';
import { clearAllAuthData } from './authStorage';

// Create a request interceptor to handle token refresh if needed
export const setupAxiosInterceptors = (): void => {
  // Response interceptor
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If error is unauthorized and not already retrying
      if (error.response?.status === 401) {
        console.log('401/403 error detected, clearing all auth data immediately');
        
        // Use the centralized clear function immediately
        clearAllAuthData();
        
        // Don't retry the request, just clear everything and reload
        console.log('Authentication failed - forcing page reload to clear all state');
        
        // Add a small delay to ensure storage is cleared before reload
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
        
        return Promise.reject(error);
      }
      
      return Promise.reject(error);
    }
  );

  // Setup axios request interceptor to include auth token
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};
