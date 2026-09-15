import axios from 'axios';
import { Personnel, PersonnelFilters, PersonnelListResponse, PersonnelDocument } from '@/types/hr';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: `${API_URL}/hr`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Obtenir la liste paginée du personnel avec filtres
export const getPersonnelList = async (params?: PersonnelFilters): Promise<PersonnelListResponse> => {
  try {
    const response = await api.get('/personnel', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching personnel list:', error);
    throw error;
  }
};

// Obtenir une fiche de personnel par ID
export const getPersonnelById = async (id: string): Promise<Personnel> => {
  try {
    const response = await api.get(`/personnel/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching personnel with id ${id}:`, error);
    throw error;
  }
};

// Créer une nouvelle fiche de personnel
export const createPersonnel = async (data: Partial<Personnel>): Promise<Personnel> => {
  try {
    const response = await api.post('/personnel', data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating personnel:', error);
    throw error;
  }
};

// Mettre à jour une fiche de personnel existante
export const updatePersonnel = async (id: string, data: Partial<Personnel>): Promise<Personnel> => {
  try {
    const response = await api.put(`/personnel/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating personnel with id ${id}:`, error);
    throw error;
  }
};

// Téléverser la photo d'un personnel
export const uploadPersonnelPhoto = async (
  personnelId: string,
  file: File
): Promise<{ photo: string }> => {
  const formData = new FormData();
  formData.append('photo', file);
  const response = await api.put(
    `/personnel/${personnelId}/photo`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data.data;
};

// Supprimer la photo d'un personnel
export const deletePersonnelPhoto = async (personnelId: string): Promise<Personnel> => {
  return updatePersonnel(personnelId, { photo: '' });
};

// Obtenir l'URL absolue d'affichage d'une photo de personnel
export const getPhotoUrl = (photoPath?: string): string => {
  if (!photoPath) return '';
  if (
    photoPath.startsWith('http://') ||
    photoPath.startsWith('https://') ||
    photoPath.startsWith('blob:') ||
    photoPath.startsWith('data:')
  ) {
    return photoPath;
  }
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const cleanBase = envUrl.replace(/\/api\/?$/, '');
    return `${cleanBase}${cleanPath}`;
  }
  return cleanPath;
};

// Supprimer une fiche de personnel (Admin / SuperAdmin uniquement, statut !== actif)
export const deletePersonnel = async (id: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await api.delete(`/personnel/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting personnel with id ${id}:`, error);
    throw error;
  }
};

// Obtenir les fiches de personnel en attente d'association avec un compte utilisateur
export const getPersonnelEnAttente = async (): Promise<Personnel[]> => {
  try {
    const response = await api.get('/personnel/en-attente');
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error('Error fetching pending personnel:', error);
    throw error;
  }
};

// Obtenir le profil Personnel de l'utilisateur connecté (LOT 8)
export const getMyProfile = async (): Promise<Personnel | null> => {
  try {
    const response = await api.get('/my-profile');
    return response.data?.data || null;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    console.error('Error fetching my profile:', error);
    throw error;
  }
};

// Obtenir les documents associés à la fiche Personnel de l'utilisateur connecté (LOT 8)
export const getMyDocuments = async (): Promise<PersonnelDocument[]> => {
  try {
    const response = await api.get('/my-documents');
    return response.data?.data || [];
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    console.error('Error fetching my documents:', error);
    throw error;
  }
};

// Lier un compte utilisateur à une fiche de personnel (LOT 7bis & LOT 8)
export const linkUserToPersonnel = async (
  personnelId: string,
  userId: string
): Promise<{ success: boolean; data?: { personnel: Personnel; user: unknown } }> => {
  try {
    const response = await api.post(`/personnel/${personnelId}/link-user`, { userId });
    return response.data;
  } catch (error) {
    console.error('Error linking user to personnel:', error);
    throw error;
  }
};

// Obtenir les paramètres généraux de l'organisation pour rhDepartmentId (LOT 8) et unités fonctionnelles (LOT A/B)
export const getOrganizationSettings = async (): Promise<{
  rhDepartmentId?: string | { _id: string; name?: string } | null;
  bureauDirecteurDepartmentId?: string | { _id: string; name?: string } | null;
  bureauOrdreDepartmentId?: string | { _id: string; name?: string } | null;
  nomAdministration?: string;
  typesAssociationPersonnel?: string[];
} | null> => {
  try {
    const baseApi = axios.create({
      baseURL: API_URL,
      withCredentials: true,
    });
    const token = localStorage.getItem('token');
    const response = await baseApi.get('/organization-settings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data?.data || null;
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    return null;
  }
};

// LOT C: Mettre à jour les départements transversaux (Bureau Directeur et Bureau d'Ordre)
export const setBureauDepartments = async (data: {
  bureauDirecteurDepartmentId?: string | null;
  bureauOrdreDepartmentId?: string | null;
}): Promise<unknown> => {
  try {
    const baseApi = axios.create({
      baseURL: API_URL,
      withCredentials: true,
    });
    const token = localStorage.getItem('token');
    const response = await baseApi.put('/organization-settings/bureau-departments', data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error updating bureau departments:', error);
    throw error;
  }
};

// Définir le département RH
export const setRhDepartment = async (data: {
  rhDepartmentId: string | null;
}): Promise<unknown> => {
  try {
    const baseApi = axios.create({
      baseURL: API_URL,
      withCredentials: true,
    });
    const token = localStorage.getItem('token');
    const response = await baseApi.put('/organization-settings/rh-department', data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error updating RH department:', error);
    throw error;
  }
};

