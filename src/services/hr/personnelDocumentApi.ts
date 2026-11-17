import axios, { isAxiosError } from 'axios';
import { 
  PersonnelDocument, 
  DocumentPersonnelAssociation, 
  DocumentType,
  CreatePersonnelDocumentPayload,
  UpdatePersonnelDocumentPayload 
} from '@/types/hr';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

export class PersonnelDocumentApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'PersonnelDocumentApiError';
    this.status = status;
  }
}

export const isForbiddenError = (error: unknown): boolean => {
  if (error instanceof PersonnelDocumentApiError) {
    return error.status === 403;
  }
  if (isAxiosError(error)) {
    return error.response?.status === 403;
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as { status?: unknown }).status === 403;
  }
  return false;
};

const toApiError = (error: unknown, defaultMessage: string): PersonnelDocumentApiError => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverMsg = error.response?.data?.message;
    const message =
      typeof serverMsg === 'string' && serverMsg.trim()
        ? serverMsg
        : defaultMessage;
    return new PersonnelDocumentApiError(message, status);
  }
  if (error instanceof PersonnelDocumentApiError) {
    return error;
  }
  if (error instanceof Error) {
    return new PersonnelDocumentApiError(error.message || defaultMessage);
  }
  return new PersonnelDocumentApiError(defaultMessage);
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
    throw toApiError(error, 'فشل في ربط الوثيقة بالموظف');
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
    throw toApiError(error, 'فشل في تحميل وثائق الموظف');
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
    throw toApiError(error, 'فشل في تحميل الموظفين المرتبطين بالوثيقة');
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
    throw toApiError(error, 'فشل في تحديث بيانات الربط');
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
    throw toApiError(error, 'فشل في إلغاء ربط الوثيقة');
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
    throw toApiError(error, 'فشل في تحميل وثائق حسابك');
  }
};
