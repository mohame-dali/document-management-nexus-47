import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  login as loginService, 
  logout as logoutService, 
  switchDepartment as switchDeptService, 
  updatePassword as updatePwdService,
  initializeAuth, 
  setAuthToken, 
  getCurrentUser,
  fetchCurrentUser,
  type User 
} from '../services/authService';
import { clearAllAuthData } from '../services/auth/authStorage';
import { getOrganizationSettings } from '../services/organizationSettingsService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDepartment: (departmentId: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  canAccessDepartment: (departmentId?: string) => boolean;
  canManageUsers: () => boolean;
  canCreateUsers: () => boolean;
  canViewAllDocuments: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Initialize auth when component mounts
    const initAuth = async () => {
      try {
        console.log('Starting auth initialization...');
        
        // Check for explicit logout flag first
        const hasExplicitLogout = sessionStorage.getItem('explicit_logout');
        
        if (hasExplicitLogout) {
          console.log('Explicit logout detected, clearing all auth data');
          sessionStorage.removeItem('explicit_logout');
          clearAllAuthData();
          setLoading(false);
          return;
        }

        // Clear any existing invalid tokens immediately to prevent loops
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
          console.log('Found existing token, attempting validation...');
          
          try {
            // Try to validate the token with a single request
            const freshUser = await fetchCurrentUser();
            
            if (freshUser) {
              console.log('Token validation successful, user authenticated');
              setCurrentUser(freshUser);
              localStorage.setItem('user', JSON.stringify(freshUser));
              setAuthToken(existingToken);
              
              // Redirect if user is at login page
              if (window.location.pathname === '/login') {
                if (freshUser.role === 'AdminDepartment' && freshUser.departments.length > 0) {
                  navigate('/dashboard/admin-department');
                } else {
                  navigate('/dashboard');
                }
              }
            }
          } catch (validationError) {
            console.log('Token validation failed, clearing all auth data:', validationError);
            // Immediately clear all auth data on any validation error
            clearAllAuthData();
            setCurrentUser(null);
          }
        } else {
          console.log('No existing token found');
          // Ensure clean state if no token
          clearAllAuthData();
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid auth data on any error
        clearAllAuthData();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate]);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      
      // Ensure we start with completely clean auth state
      console.log('Starting login, clearing all existing auth data');
      clearAllAuthData();
      
      // Clear any explicit logout flag
      sessionStorage.removeItem('explicit_logout');
      
      const user = await loginService({ username, password });
      
      // Fetch fresh user data with populated departments
      const freshUser = await fetchCurrentUser();
      const finalUser = freshUser || user;
      
      setCurrentUser(finalUser);
      
      // Update localStorage with fresh data
      localStorage.setItem('user', JSON.stringify(finalUser));
      
      toast.success('تم تسجيل الدخول بنجاح');
      
      // Role-based redirection with Setup check for Admins
      if (finalUser.role === 'Admin') {
        try {
          const settings = await getOrganizationSettings();
          const isComplete = Boolean(
            settings?.nomAdministration?.trim() &&
            settings?.rhDepartmentId &&
            settings?.bureauOrdreDepartmentId &&
            settings?.bureauDirecteurDepartmentId
          );
          if (!isComplete) {
            navigate('/setup');
            return;
          }
        } catch {
          // If checking fails, proceed to default dashboard
        }
      }

      if (finalUser.role === 'AdminDepartment' && finalUser.departments.length > 0) {
        navigate('/dashboard/admin-department');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Clear any auth data on login failure
      clearAllAuthData();
      setCurrentUser(null);
      
      let errorMessage = 'فشل في تسجيل الدخول';
      
      if (error.message === 'Network Error') {
        errorMessage = 'لا يمكن الاتصال بالخادم. يرجى التحقق من تشغيل الخادم الخلفي.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'خطأ في الشبكة. يرجى التحقق من تشغيل خادم النظام.';
      } else if (error.response) {
        errorMessage = error.response.data?.error || 'فشل في المصادقة';
      } else if (error.request) {
        errorMessage = 'لا يوجد رد من الخادم. يرجى التحقق من الاتصال.';
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      console.log('Starting logout process...');
      
      // Use centralized clear function
      clearAllAuthData();
      
      // Clear React state
      setCurrentUser(null);
      
      // Clear all React Query cache
      queryClient.clear();
      
      // Try to call server logout (but don't fail if it doesn't work)
      try {
        await logoutService();
        console.log('Server logout successful');
      } catch (serverError) {
        console.warn('Server logout failed, but continuing with client logout:', serverError);
      }
      
      toast.success('تم تسجيل الخروج بنجاح');
      
      // Navigate to landing page without forcing reload
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if logout fails, clear local state and redirect
      clearAllAuthData();
      setCurrentUser(null);
      queryClient.clear();
      toast.success('تم تسجيل الخروج');
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const switchDepartment = async (departmentId: string) => {
    try {
      setLoading(true);
      console.log('Switching to department:', departmentId);
      
      const updatedUser = await switchDeptService(departmentId);
      setCurrentUser(updatedUser);
      
      // Update local storage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Invalidate all department-related queries to force refresh
      console.log('Invalidating queries after department switch...');
      
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      // Invalidate document queries
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      
      // Invalidate folder queries
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      
      // Invalidate message queries
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      
      // Invalidate department-specific queries
      queryClient.invalidateQueries({ queryKey: ['departmentStats'] });
      
      console.log('All queries invalidated successfully');
      
      toast.success('تم تغيير القسم بنجاح');
    } catch (error) {
      console.error('Switch department error:', error);
      toast.error('فشل في تغيير القسم');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      await updatePwdService(currentPassword, newPassword);
      toast.success('تم تحديث كلمة المرور بنجاح');
    } catch (error) {
      console.error('Update password error:', error);
      toast.error('فشل في تحديث كلمة المرور');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for role-based access
  const canAccessDepartment = (departmentId?: string): boolean => {
    if (!currentUser) return false;
    
    // Director, Admin and AdminTuningDesk have access to all departments
    if (currentUser.role === 'Director' || currentUser.role === 'Admin' || currentUser.role === 'AdminTuningDesk') {
      return true;
    }
    
    // If no specific department requested, check if user has any departments
    if (!departmentId) {
      return currentUser.departments.length > 0;
    }
    
    // Check if user has access to specific department
    return currentUser.departments.some(dept => dept._id === departmentId);
  };

  const canManageUsers = (): boolean => {
    if (!currentUser) return false;
    return ['Admin', 'AdminDepartment'].includes(currentUser.role);
  };

  const canCreateUsers = (): boolean => {
    if (!currentUser) return false;
    return ['Admin', 'AdminDepartment'].includes(currentUser.role);
  };

  const canViewAllDocuments = (): boolean => {
    if (!currentUser) return false;
    return ['Director', 'Admin', 'AdminTuningDesk'].includes(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        logout,
        switchDepartment,
        updatePassword,
        canAccessDepartment,
        canManageUsers,
        canCreateUsers,
        canViewAllDocuments
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
