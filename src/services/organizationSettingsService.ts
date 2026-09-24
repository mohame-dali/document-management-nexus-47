import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: `${API_URL}/organization-settings`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface OrganizationSettings {
  _id?: string;
  nomAdministration: string;
  logoAdministration: string;
  rhDepartmentId: string | { _id: string; name?: string } | null;
  bureauDirecteurDepartmentId: string | { _id: string; name?: string } | null;
  bureauOrdreDepartmentId: string | { _id: string; name?: string } | null;
  typesAssociationPersonnel?: string[];
  dateInitialisation?: string;
  misAJourPar?: string | null;
}

export const getOrganizationSettings = async (): Promise<OrganizationSettings> => {
  const response = await api.get('');
  return response.data?.data || response.data;
};

export const updateOrganizationSettings = async (data: {
  nomAdministration?: string;
  logoAdministration?: string;
}): Promise<OrganizationSettings> => {
  const response = await api.put('', data);
  return response.data?.data || response.data;
};

export const setRhDepartment = async (rhDepartmentId: string | null) => {
  const response = await api.put('/rh-department', { rhDepartmentId });
  return response.data?.data || response.data;
};

export const setBureauDepartments = async (data: {
  bureauDirecteurDepartmentId: string | null;
  bureauOrdreDepartmentId: string | null;
}) => {
  const response = await api.put('/bureau-departments', data);
  return response.data?.data || response.data;
};
