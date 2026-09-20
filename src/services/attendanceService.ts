import axios from 'axios';

export interface AttendanceEntryDetails {
  nomService?: string;
  lieuMission?: string;
  objetMission?: string;
  intituleFormation?: string;
  organismeFormation?: string;
  dureeFormation?: string;
  formationDocumentId?: string;
  commentaire?: string;
}

export interface AttendanceEntry {
  personnelId: string;
  statut: 'present' | 'absent';
  motif?: string | null;
  leaveReasonId?: string | null;
  impacteSolde?: boolean;
  detailsMotif?: AttendanceEntryDetails;
  heureArrivee?: string | null;
}

export interface AttendanceRecord {
  _id: string;
  personnelId: string;
  date: string;
  departmentId?: string | { _id: string; name: string; code?: string };
  statut: 'present' | 'absent';
  motif?: string | null;
  leaveReasonId?: string | null;
  impacteSolde: boolean;
  detailsMotif?: AttendanceEntryDetails;
  heureArrivee?: string | null;
  saisiPar?: string | { _id: string; username: string };
  modifiePar?: string | { _id: string; username: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyAttendanceAgentItem {
  personnel: {
    _id: string;
    nom: string;
    prenom: string;
    cin?: string;
    poste?: string;
    photo?: string;
    statut: string;
    activeDepartment?: {
      _id: string;
      name: string;
      code?: string;
    };
  };
  attendance: AttendanceRecord | null;
}

export interface DailyAttendanceResponse {
  success: boolean;
  date: string;
  departmentId?: string | null;
  count: number;
  data: DailyAttendanceAgentItem[];
}

export interface BatchSaveResponse {
  success: boolean;
  message: string;
  count: number;
}

export interface PersonnelBalanceResponse {
  success: boolean;
  personnelId: string;
  annee: number;
  soldeAnnuel: number;
  joursUtilises: number;
  soldeRestant: number;
  totalAbsencesAnnee: number;
  absencesNonDeductibles: number;
}

export interface PresenceSettingsData {
  _id?: string;
  annee: number;
  soldeAnnuelDefaut: number;
  motifsDeductibles: string[];
  joursWeekend: number[];
  joursFeries: Array<{
    date: string;
    description: string;
  }>;
  autoriserSaisieFuture: boolean;
  autoriserSaisieRetroactive: boolean;
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

// 1. Obtenir la feuille de présence quotidienne (collectif)
export const getDailyAttendance = async (
  date: string,
  departmentId?: string
): Promise<DailyAttendanceResponse> => {
  try {
    const params: Record<string, string> = { date };
    if (departmentId && departmentId !== 'all') {
      params.departmentId = departmentId;
    }
    const response = await api.get('/daily', { params });
    return response.data;
  } catch (error) {
    console.error('Error in getDailyAttendance:', error);
    throw error;
  }
};

// 2. Enregistrer ou mettre à jour un lot de présences (saisie collective)
export const saveBatchAttendance = async (
  date: string,
  entries: AttendanceEntry[]
): Promise<BatchSaveResponse> => {
  try {
    const response = await api.post('/batch', { date, entries });
    return response.data;
  } catch (error) {
    console.error('Error in saveBatchAttendance:', error);
    throw error;
  }
};

// 3. Obtenir le calendrier d'un agent (Self-service / Consultation)
export const getPersonnelCalendar = async (
  personnelId: string,
  year?: number | string,
  month?: number | string
): Promise<unknown> => {
  try {
    const params: Record<string, string | number> = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const response = await api.get(`/calendar/${personnelId}`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error in getPersonnelCalendar for ${personnelId}:`, error);
    throw error;
  }
};

// 4. Calculer le solde de congés d'un agent pour une année donnée
export const getPersonnelBalance = async (
  personnelId: string,
  year?: number | string
): Promise<PersonnelBalanceResponse> => {
  try {
    const params: Record<string, string | number> = {};
    if (year) params.year = year;
    const response = await api.get(`/balance/${personnelId}`, { params });
    return response.data;
  } catch (error) {
    console.error(`Error in getPersonnelBalance for ${personnelId}:`, error);
    throw error;
  }
};

// 5. Obtenir le rapport journalier
export const getDailyReport = async (
  date: string,
  departmentId?: string
): Promise<unknown> => {
  try {
    const params: Record<string, string> = { date };
    if (departmentId && departmentId !== 'all') {
      params.departmentId = departmentId;
    }
    const response = await api.get('/report/daily', { params });
    return response.data;
  } catch (error) {
    console.error('Error in getDailyReport:', error);
    throw error;
  }
};

// 6. Obtenir le rapport mensuel
export const getMonthlyReport = async (
  year: number | string,
  month: number | string,
  departmentId?: string
): Promise<unknown> => {
  try {
    const params: Record<string, string | number> = { year, month };
    if (departmentId && departmentId !== 'all') {
      params.departmentId = departmentId;
    }
    const response = await api.get('/report/monthly', { params });
    return response.data;
  } catch (error) {
    console.error('Error in getMonthlyReport:', error);
    throw error;
  }
};

// 7. Obtenir le rapport annuel
export const getYearlyReport = async (
  year: number | string,
  departmentId?: string
): Promise<unknown> => {
  try {
    const params: Record<string, string | number> = { year };
    if (departmentId && departmentId !== 'all') {
      params.departmentId = departmentId;
    }
    const response = await api.get('/report/yearly', { params });
    return response.data;
  } catch (error) {
    console.error('Error in getYearlyReport:', error);
    throw error;
  }
};

// 8. Obtenir les paramètres annuels de présence
export const getSettings = async (
  year?: number | string
): Promise<{ success: boolean; data: PresenceSettingsData }> => {
  try {
    const params: Record<string, string | number> = {};
    if (year) params.year = year;
    const response = await api.get('/settings', { params });
    return response.data;
  } catch (error) {
    console.error('Error in getSettings:', error);
    throw error;
  }
};

// 9. Mettre à jour les paramètres de présence
export const updateSettings = async (
  data: Partial<PresenceSettingsData>
): Promise<{ success: boolean; message: string; data: PresenceSettingsData }> => {
  try {
    const response = await api.put('/settings', data);
    return response.data;
  } catch (error) {
    console.error('Error in updateSettings:', error);
    throw error;
  }
};
