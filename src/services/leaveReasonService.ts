import axios from 'axios';

export interface LeaveReason {
  _id: string;
  code: string;
  labelAr: string;
  labelFr?: string;
  category: 'conge' | 'mission' | 'formation' | 'service' | 'autre';
  impacteSolde: boolean;
  description?: string;
  requiresDocument?: boolean;
  requiresServiceName?: boolean;
  requiresLieu?: boolean;
  requiresFormationDetails?: boolean;
  color?: string;
  icon?: string | null;
  order: number;
  isActive: boolean;
  isSystem: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveReasonFormData {
  code?: string;
  labelAr: string;
  labelFr?: string;
  category: 'conge' | 'mission' | 'formation' | 'service' | 'autre';
  impacteSolde: boolean;
  description?: string;
  requiresDocument?: boolean;
  requiresServiceName?: boolean;
  requiresLieu?: boolean;
  requiresFormationDetails?: boolean;
  color?: string;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface LeaveReasonQueryParams {
  isActive?: boolean;
  category?: string;
  impacteSolde?: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: `${API_URL}/hr/leave-reasons`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 1. Obtenir la liste des motifs
export const getLeaveReasons = async (params?: LeaveReasonQueryParams): Promise<LeaveReason[]> => {
  try {
    const response = await api.get('', { params });
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching leave reasons:', error);
    throw error;
  }
};

// 2. Obtenir un motif par ID
export const getLeaveReasonById = async (id: string): Promise<LeaveReason> => {
  try {
    const response = await api.get(`/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching leave reason ${id}:`, error);
    throw error;
  }
};

// 3. Créer un nouveau motif
export const createLeaveReason = async (data: LeaveReasonFormData): Promise<LeaveReason> => {
  try {
    const response = await api.post('', data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating leave reason:', error);
    throw error;
  }
};

// 4. Mettre à jour un motif
export const updateLeaveReason = async (id: string, data: Partial<LeaveReasonFormData>): Promise<LeaveReason> => {
  try {
    const response = await api.put(`/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating leave reason ${id}:`, error);
    throw error;
  }
};

// 5. Basculer le statut actif/inactif
export const toggleLeaveReasonStatus = async (id: string): Promise<LeaveReason> => {
  try {
    const response = await api.put(`/${id}/toggle`);
    return response.data.data;
  } catch (error) {
    console.error(`Error toggling leave reason ${id}:`, error);
    throw error;
  }
};

// 6. Supprimer un motif personnalisé
export const deleteLeaveReason = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.delete(`/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting leave reason ${id}:`, error);
    throw error;
  }
};
