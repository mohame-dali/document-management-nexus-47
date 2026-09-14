
import axios from 'axios';
import { Department } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get all departments
export const getDepartments = async (): Promise<Department[]> => {
  try {
    const response = await axios.get(`${API_URL}/departments`);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
};

// Get a specific department
export const getDepartment = async (id: string): Promise<Department> => {
  try {
    const response = await axios.get(`${API_URL}/departments/${id}`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching department with id ${id}:`, error);
    throw error;
  }
};

// Create a new department - Admin only
export const createDepartment = async (departmentData: Partial<Department>): Promise<Department> => {
  try {
    const response = await axios.post(`${API_URL}/departments`, departmentData);
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error creating department:', error);
    throw error;
  }
};

// Update a department - Admin only
export const updateDepartment = async (id: string, departmentData: Partial<Department>): Promise<Department> => {
  try {
    const response = await axios.put(`${API_URL}/departments/${id}`, departmentData);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error updating department with id ${id}:`, error);
    throw error;
  }
};

// Delete a department - Admin only
export const deleteDepartment = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/departments/${id}`);
  } catch (error) {
    console.error(`Error deleting department with id ${id}:`, error);
    throw error;
  }
};

// Get users of a department - Admin and AdminDepartment
export const getDepartmentUsers = async (id: string): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_URL}/departments/${id}/users`);
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error fetching users for department ${id}:`, error);
    throw error;
  }
};

// Toggle department status - Admin only
export const toggleDepartmentStatus = async (id: string, isActive: boolean): Promise<Department> => {
  try {
    const response = await axios.put(`${API_URL}/departments/${id}/status`, { isActive });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`Error toggling department status for ${id}:`, error);
    throw error;
  }
};
