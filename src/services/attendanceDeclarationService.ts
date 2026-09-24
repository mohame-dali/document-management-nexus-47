import axios from 'axios';
import { LeaveReason } from './leaveReasonService';

export interface AttendanceDeclarationDetails {
  nomService?: string;
  lieuMission?: string;
  objetMission?: string;
  intituleFormation?: string;
  commentaire?: string;
}

export interface AttendanceDeclaration {
  _id: string;
  personnelId:
    | string
    | {
        _id: string;
        nom: string;
        prenom: string;
        matricule?: string;
        photo?: string;
        telephone?: string;
        activeDepartment?: string | { _id: string; name: string; code?: string };
      };
  userId:
    | string
    | {
        _id: string;
        username: string;
        photo?: string;
      };
  departmentId?:
    | string
    | {
        _id: string;
        name: string;
        code?: string;
      }
    | null;
  date: string;
  statut: 'present' | 'absent';
  motif?: string;
  leaveReasonId?: string | LeaveReason | null;
  detailsMotif?: AttendanceDeclarationDetails;
  heureArrivee?: string;
  validationStatus: 'en_attente' | 'approuvee' | 'rejetee' | 'modifiee';
  validatedBy?:
    | string
    | {
        _id: string;
        username: string;
      }
    | null;
  validatedAt?: string | null;
  rejectionReason?: string;
  adminComment?: string;
  attendanceId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceDeclarationInput {
  date: string;
  statut: 'present' | 'absent';
  motif?: string;
  leaveReasonId?: string | null;
  detailsMotif?: AttendanceDeclarationDetails;
  heureArrivee?: string;
}

export interface DeclarationFilters {
  date?: string;
  from?: string;
  to?: string;
  departmentId?: string;
  validationStatus?: 'all' | 'en_attente' | 'approuvee' | 'rejetee' | 'modifiee';
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: `${API_URL}/attendance`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 1. L'agent déclare sa présence ou son absence
 */
export const declareAttendance = async (
  data: AttendanceDeclarationInput
): Promise<{ success: boolean; data: AttendanceDeclaration }> => {
  const response = await api.post('/declarations', data);
  return response.data;
};

/**
 * 2. L'agent consulte ses propres déclarations
 */
export const getMyDeclarations = async (
  filters?: { from?: string; to?: string; validationStatus?: string }
): Promise<{ success: boolean; count: number; data: AttendanceDeclaration[] }> => {
  const response = await api.get('/declarations/me', { params: filters });
  return response.data;
};

/**
 * 3. L'Admin / Chef RH consulte toutes les déclarations avec filtres
 */
export const getAllDeclarations = async (
  filters?: DeclarationFilters
): Promise<{ success: boolean; count: number; data: AttendanceDeclaration[] }> => {
  const response = await api.get('/declarations', { params: filters });
  return response.data;
};

/**
 * 4. Valider / Approuver une déclaration (insertion auto dans Attendance)
 */
export const approveDeclaration = async (
  id: string,
  data?: { adminComment?: string }
): Promise<{ success: boolean; message: string; data: AttendanceDeclaration }> => {
  const response = await api.put(`/declarations/${id}/approve`, data || {});
  return response.data;
};

/**
 * 5. Rejeter une déclaration avec motif
 */
export const rejectDeclaration = async (
  id: string,
  reason: string,
  adminComment?: string
): Promise<{ success: boolean; message: string; data: AttendanceDeclaration }> => {
  const response = await api.put(`/declarations/${id}/reject`, { reason, adminComment });
  return response.data;
};

/**
 * 6. Modifier une déclaration (Admin / RH)
 */
export const updateDeclaration = async (
  id: string,
  data: Partial<AttendanceDeclarationInput> & {
    adminComment?: string;
    rejectionReason?: string;
    date?: string;
  }
): Promise<{ success: boolean; message: string; data: AttendanceDeclaration }> => {
  const response = await api.put(`/declarations/${id}`, data);
  return response.data;
};

/**
 * 7. Supprimer une déclaration (Agent si en_attente, Admin sinon)
 */
export const deleteDeclaration = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/declarations/${id}`);
  return response.data;
};
