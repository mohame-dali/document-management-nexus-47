
import axios from 'axios';
import { User } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
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

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/users');
    
    // Return all users (both active and inactive) for the users management page
    const users = response.data.data || response.data;
    
    // Don't filter by isActive - show all users in the management table
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getUser = async (id: string): Promise<User> => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const createUser = async (userData: Partial<User>): Promise<User> => {
  try {
    const response = await api.post('/users', userData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
  try {
    const response = await api.put(`/users/${id}`, userData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    await api.delete(`/users/${id}`);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Enhanced function to get users available for cross-department messaging
export const getMessagingUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/users/messaging');
    
    // Enhanced filtering for cross-department communication - include all active users
    const users = response.data.data || response.data;
    
    // Filter to include only active users of all valid roles across all departments
    const validRoles = ['SuperAdmin', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User'];
    const filteredUsers = users.filter((user: User) => 
      user.isActive && validRoles.includes(user.role)
    );
    
    // Log cross-department messaging capabilities
    const departmentGroups = filteredUsers.reduce((acc, user) => {
      const deptName = user.activeDepartment?.name || 'System';
      acc[deptName] = (acc[deptName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`Cross-department messaging enabled: ${filteredUsers.length} users across departments:`, departmentGroups);
    
    return filteredUsers;
  } catch (error) {
    console.error('Error fetching messaging users:', error);
    throw error;
  }
};

// Deactivate user function
export const deactivateUser = async (id: string, isActive: boolean): Promise<User> => {
  try {
    const response = await api.put(`/users/${id}/deactivate`, { isActive });
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }
};

// Reset user password function
export const resetUserPassword = async (id: string, newPassword?: string): Promise<void> => {
  try {
    await api.put(`/users/${id}/resetpassword`, { newPassword });
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

// Update user password function (new)
export const updateUserPassword = async (id: string, newPassword: string): Promise<void> => {
  try {
    await api.put(`/users/${id}/password`, { newPassword });
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Upload user photo function
export const uploadUserPhoto = async (id: string, photoFile: File): Promise<User> => {
  try {
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    const response = await api.put(`/users/${id}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

// Create user with photo function (new)
export const createUserWithPhoto = async (userData: Partial<User>, photoFile?: File): Promise<User> => {
  try {
    // First create the user
    const user = await createUser(userData);
    
    // Then upload photo if provided
    if (photoFile && user._id) {
      const updatedUser = await uploadUserPhoto(user._id, photoFile);
      return updatedUser;
    }
    
    return user;
  } catch (error) {
    console.error('Error creating user with photo:', error);
    throw error;
  }
};
