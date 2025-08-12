
import { User } from '@/types';
import { LoginCredentials } from './auth/authTypes';
import { 
  login, 
  fetchCurrentUser, 
  logout, 
  switchDepartment, 
  updatePassword, 
  setAuthToken,
  testAdminCredentials,
  resetAdminPassword
} from './auth/authApi';
import { getCurrentUser, initializeAuth, clearAllAuthData } from './auth/authStorage';
import { setupAxiosInterceptors } from './auth/authInterceptors';

// Initialize axios interceptors on import
setupAxiosInterceptors();

// Re-export all auth functions
export {
  login,
  logout,
  fetchCurrentUser,
  getCurrentUser,
  initializeAuth,
  setAuthToken,
  switchDepartment,
  updatePassword,
  testAdminCredentials,
  resetAdminPassword,
  clearAllAuthData
};

// Re-export types
export type { LoginCredentials, User };

// Validate user session
export const validateSession = async (): Promise<boolean> => {
  try {
    const user = await fetchCurrentUser();
    return !!user;
  } catch (error) {
    console.error('Session validation failed:', error);
    // Clear auth data if session validation fails
    clearAllAuthData();
    return false;
  }
};

// Refresh user data
export const refreshUserData = async (): Promise<User | null> => {
  try {
    const user = await fetchCurrentUser();
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    return user;
  } catch (error) {
    console.error('Failed to refresh user data:', error);
    // Clear auth data if refresh fails
    clearAllAuthData();
    return null;
  }
};
