import { User } from '@/types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  data?: User;
  message?: string;
  error?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AdminTestResponse {
  success: boolean;
  message?: string;
  username?: string;
}

export interface AdminResetResponse {
  success: boolean;
  message?: string;
  username?: string;
  password?: string;
}
