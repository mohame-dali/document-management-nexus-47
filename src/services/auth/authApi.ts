import axios from 'axios';
import { User } from '@/types';
import { LoginCredentials } from './authTypes';

// Set the API URL based on environment or use a fallback that works for local development
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Configure axios to include credentials in requests
axios.defaults.withCredentials = true;

// Add a console log to show the API URL being used (helpful for debugging)
console.log('API URL being used:', API_URL);

// Login user
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    console.log('Attempting login with:', credentials.username);
    
    // Add CORS headers and no-cache to avoid caching issues
    const response = await axios.post(`${API_URL}/auth/login`, credentials, {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log('Login response:', response.data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      // Initialize auth token for future requests
      setAuthToken(response.data.token);
    }
    return response.data.user;
  } catch (error) {
    console.error('Login error:', error);
    
    // Additional error details for debugging
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
    }
    
    throw error;
  }
};

// Get current user from API (for validation)
export const fetchCurrentUser = async (): Promise<User> => {
  try {
    const response = await axios.get(`${API_URL}/auth/me`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};

// Logout user
export const logout = async (): Promise<void> => {
  try {
    await axios.post(`${API_URL}/auth/logout`);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear auth token
    setAuthToken(null);
  } catch (error) {
    console.error('Logout error:', error);
    // Even if server logout fails, clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken(null);
    throw error;
  }
};

// Switch active department
export const switchDepartment = async (departmentId: string): Promise<User> => {
  try {
    console.log('Switching to department ID:', departmentId);
    
    if (!departmentId || departmentId === 'undefined') {
      throw new Error('Invalid department ID provided');
    }

    const response = await axios.put(`${API_URL}/auth/switchdepartment/${departmentId}`);
    const updatedUser = response.data.data;
    
    console.log('Switch department response:', updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  } catch (error) {
    console.error('Switch department error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Switch department axios error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    throw error;
  }
};

// Update password
export const updatePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  try {
    await axios.put(`${API_URL}/auth/updatepassword`, {
      currentPassword,
      newPassword
    });
  } catch (error) {
    console.error('Update password error:', error);
    throw error;
  }
};

// Test admin credentials - specific for initial setup
export const testAdminCredentials = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/auth/test-admin`);
    return response.data.success;
  } catch (error) {
    console.error('Test admin credentials error:', error);
    return false;
  }
};

// Reset admin password - specific for initial setup
export const resetAdminPassword = async (newPassword: string): Promise<void> => {
  try {
    await axios.post(`${API_URL}/auth/reset-admin`, { newPassword });
  } catch (error) {
    console.error('Reset admin password error:', error);
    throw error;
  }
};

// Set auth token for axios requests
export const setAuthToken = (token: string | null): void => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};
