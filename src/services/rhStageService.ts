import axios from 'axios';

export interface RHEcoleRef {
  _id: string;
  nom: string;
  nomAr: string;
  pays: string;
  ville?: string;
  type?: string;
}

export interface RHTypeFormationRef {
  _id: string;
  code: string;
  nom: string;
  nomAr: string;
  categorie?: string;
}

export interface RHStage {
  _id: string;
  personnelId: {
    _id: string;
    nom: string;
    prenom: string;
    cin?: string;
    matricule?: string;
    poste?: string;
    activeDepartment?: any;
  } | string;
  sessionFormationId?: string | null;
  sourceDocumentId?: {
    _id: string;
    serialNumber?: string;
    year?: number;
    subject?: string;
    correspondenceNumber?: string;
  } | string | null;
  localisation: 'tunisie' | 'etranger';
  pays: string;
  lieuStage: string;
  sujetStage: string;
  typeFormationId?: {
    _id: string;
    code: string;
    nom: string;
    nomAr: string;
    categorie?: string;
  } | string | null;
  ecoleId?: {
    _id: string;
    nom: string;
    nomAr: string;
    pays: string;
    ville?: string;
    type?: string;
  } | string | null;
  dateDebut: string;
  dateFin: string;
  duree?: number; // champ virtuel en jours
  numeroRoute?: string;
  numeroStage?: string;
  statut: 'inscrit' | 'en_cours' | 'acheve' | 'suspendu' | 'abandonne';
  resultat?: 'admis' | 'refuse' | 'en_attente' | '';
  mention?: string;
  documents?: Array<{
    nom: string;
    type: 'convocation' | 'attestation' | 'certificat' | 'rapport' | 'autre';
    chemin: string;
    dateAjout: string;
  }>;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RHStageFormData {
  personnelId: string;
  sessionFormationId?: string | null;
  sourceDocumentId?: string | null;
  localisation: 'tunisie' | 'etranger';
  pays: string;
  lieuStage: string;
  sujetStage: string;
  typeFormationId?: string | null;
  ecoleId?: string | null;
  dateDebut: string;
  dateFin: string;
  numeroRoute?: string;
  numeroStage?: string;
  statut: 'inscrit' | 'en_cours' | 'acheve' | 'suspendu' | 'abandonne';
  resultat?: 'admis' | 'refuse' | 'en_attente' | '';
  mention?: string;
  observations?: string;
}

export interface StageFilters {
  personnelId?: string;
  localisation?: string;
  statut?: string;
  annee?: number | string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StageListResponse {
  success: boolean;
  count: number;
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  data: RHStage[];
}

export interface GroupedStagesResponse {
  success: boolean;
  count: number;
  data: {
    tunisie: RHStage[];
    etranger: RHStage[];
  };
}

export interface StageStatsResponse {
  success: boolean;
  data: {
    total: number;
    parLocalisation: {
      tunisie: number;
      etranger: number;
    };
    parStatut: Record<string, number>;
    parResultat: Record<string, number>;
  };
}

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

// 1. Obtenir tous les stages avec pagination et filtres
export const getStages = async (params?: StageFilters): Promise<StageListResponse> => {
  const response = await api.get('/stages', { params });
  return response.data;
};

// 2. Obtenir un stage par ID
export const getStageById = async (id: string): Promise<RHStage> => {
  const response = await api.get(`/stages/${id}`);
  return response.data.data;
};

// 3. Créer un stage (Cas A ou B)
export const createStage = async (data: RHStageFormData): Promise<RHStage> => {
  const response = await api.post('/stages', data);
  return response.data.data;
};

// 4. Mettre à jour un stage
export const updateStage = async (id: string, data: Partial<RHStageFormData>): Promise<RHStage> => {
  const response = await api.put(`/stages/${id}`, data);
  return response.data.data;
};

// 5. Supprimer un stage (Soft delete)
export const deleteStage = async (id: string): Promise<{ success: boolean; message: string; warning?: string }> => {
  const response = await api.delete(`/stages/${id}`);
  return response.data;
};

// 6. Obtenir les stages d'un personnel (groupés par Tunisie / Étranger)
export const getStagesByPersonnel = async (personnelId: string): Promise<{ tunisie: RHStage[]; etranger: RHStage[] }> => {
  const response = await api.get(`/personnel/${personnelId}/stages`);
  return response.data.data;
};

// 7. Obtenir les statistiques globales des stages
export const getStagesStats = async (filters?: { annee?: number | string }): Promise<StageStatsResponse['data']> => {
  const response = await api.get('/stages/stats', { params: filters });
  return response.data.data;
};

// 8. Référentiels : Écoles et Types de formation
export const getEcoles = async (): Promise<RHEcoleRef[]> => {
  const response = await api.get('/references/ecoles?isActive=true');
  return response.data.data;
};

export const createEcole = async (data: { nom: string; nomAr: string; pays?: string; ville?: string; type?: string }): Promise<RHEcoleRef> => {
  const response = await api.post('/references/ecoles', data);
  return response.data.data;
};

export const getTypesFormation = async (): Promise<RHTypeFormationRef[]> => {
  const response = await api.get('/references/types-formation?isActive=true');
  return response.data.data;
};
