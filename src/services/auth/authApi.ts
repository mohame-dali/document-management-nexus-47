import { User } from '@/types';
import api from '../apiService';
import {
  AdminResetResponse,
  AdminTestResponse,
  AuthResponse,
  LoginCredentials,
} from './authTypes';
import {
  clearAllAuthData,
  getAuthToken,
  saveAuthToken,
  saveCurrentUser,
} from './authStorage';

export const setAuthToken = (token: string | null): void => {
  saveAuthToken(token);
};

export const login = async (credentials: LoginCredentials): Promise<User> => {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  const data = response.data;

  if (!data?.success) {
    throw new Error(data?.error || data?.message || 'Authentication failed');
  }

  if (data.token) {
    saveAuthToken(data.token);
  }

  const user = data.user || data.data;
  if (!user) {
    throw new Error('User payload missing from login response');
  }

  saveCurrentUser(user);
  return user;
};

export const fetchCurrentUser = async (): Promise<User | null> => {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const response = await api.get<AuthResponse>('/auth/me');
  const user = response.data?.data || response.data?.user || null;

  if (user) {
    saveCurrentUser(user);
  }

  return user;
};

export const logout = async (): Promise<void> => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('explicit_logout', 'true');
    }
    const token = getAuthToken();
    if (token) {
      await api.post('/auth/logout');
    }
  } finally {
    clearAllAuthData();
  }
};

export const switchDepartment = async (departmentId: string): Promise<User> => {
  const response = await api.put<AuthResponse>(`/auth/switchdepartment/${departmentId}`);
  const user = response.data?.data || response.data?.user;

  if (!user) {
    throw new Error('User payload missing from switchDepartment response');
  }

  saveCurrentUser(user);
  return user;
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const response = await api.put<AuthResponse>('/auth/updatepassword', {
    currentPassword,
    newPassword,
  });

  if (response.data?.token) {
    saveAuthToken(response.data.token);
  }
  if (response.data?.user) {
    saveCurrentUser(response.data.user);
  }
};

export const testAdminCredentials = async (): Promise<AdminTestResponse> => {
  const response = await api.get<AdminTestResponse>('/auth/test-admin');
  return response.data;
};

export const resetAdminPassword = async (): Promise<AdminResetResponse> => {
  const response = await api.post<AdminResetResponse>('/auth/reset-admin');
  return response.data;
};
