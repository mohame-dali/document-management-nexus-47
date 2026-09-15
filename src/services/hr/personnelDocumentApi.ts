import axios, { isAxiosError } from 'axios';
import { 
  PersonnelDocument, 
  DocumentPersonnelAssociation, 
  DocumentType,
  CreatePersonnelDocumentPayload,
  UpdatePersonnelDocumentPayload 
} from '@/types/hr';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (isAxiosError(error) && error.response?.data?.message) {
    return String(error.response.data.message);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
};

// 1. Associer un document à une fiche de personnel
export const associerDocument = async (
  personnelId: string,
  data: CreatePersonnelDocumentPayload
): Promise<PersonnelDocument> => {
  try {
    const response = await api.post(`/hr/personnel/${personnelId}/documents`, data);
    return response.data.data;
  } catch (error: unknown) {
    console.error('Error associating document to personnel:', error);
    throw new Error(getErrorMessage(error, 'فشل في ربط الوثيقة بالموظف'));
  }
};

// 2. Lister les documents associés à une fiche de personnel
export const getDocumentsDuPersonnel = async (
  personnelId: string
): Promise<PersonnelDocument[]> => {
  try {
    const response = await api.get(`/hr/personnel/${personnelId}/documents`);
    return response.data.data || [];
  } catch (error: unknown) {
    console.error('Error fetching personnel documents:', error);
    throw new Error(getErrorMessage(error, 'فشل في تحميل وثائق الموظف'));
  }
};

// 3. Lister le personnel associé à un document (recherche inverse)
export const getPersonnelDuDocument = async (
  documentType: DocumentType,
  documentId: string
): Promise<DocumentPersonnelAssociation[]> => {
  try {
    const response = await api.get(`/hr/documents/${documentType}/${documentId}/personnel`);
    return response.data.data || [];
  } catch (error: unknown) {
    console.error('Error fetching document personnel associations:', error);
    throw new Error(getErrorMessage(error, 'فشل في تحميل الموظفين المرتبطين بالوثيقة'));
  }
};

// 4. Mettre à jour une association existante (type ou commentaire)
export const updateAssociation = async (
  associationId: string,
  data: UpdatePersonnelDocumentPayload
): Promise<PersonnelDocument> => {
  try {
    const response = await api.put(`/hr/personnel-documents/${associationId}`, data);
    return response.data.data;
  } catch (error: unknown) {
    console.error('Error updating association:', error);
    throw new Error(getErrorMessage(error, 'فشل في تحديث بيانات الربط'));
  }
};

// 5. Supprimer une association
export const deleteAssociation = async (
  associationId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await api.delete(`/hr/personnel-documents/${associationId}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error deleting association:', error);
    throw new Error(getErrorMessage(error, 'فشل في إلغاء ربط الوثيقة'));
  }
};

// 6. Récupérer les types d'association configurés
export const getTypesAssociation = async (): Promise<string[]> => {
  try {
    const response = await api.get('/organization-settings/types-association');
    return response.data.data || ['Stage', 'Formation', 'Diplôme', 'Autre'];
  } catch (error) {
    console.error('Error fetching association types, fallback to defaults:', error);
    return ['Stage', 'Formation', 'Diplôme', 'Autre'];
  }
};

// 7. Obtenir les documents de l'utilisateur connecté
export const getMyDocuments = async (): Promise<PersonnelDocument[]> => {
  try {
    const response = await api.get('/hr/my-documents');
    return response.data.data || [];
  } catch (error: unknown) {
    console.error('Error fetching my documents:', error);
    throw new Error(getErrorMessage(error, 'فشل في تحميل وثائق حسابك'));
  }
};
