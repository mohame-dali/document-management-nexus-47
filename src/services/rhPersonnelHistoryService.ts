import axios from 'axios';

// ============================================================
// INTERFACES
// ============================================================

export interface RHPromotion {
  _id: string;
  personnelId: string;
  gradePrecedent?: string;
  gradeNouveau: string;
  datePromotion: string;
  reference?: string;
  motif?: string;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RHPromotionFormData {
  gradePrecedent?: string;
  gradeNouveau: string;
  datePromotion: string;
  reference?: string;
  motif?: string;
  observations?: string;
}

export interface RHPoste {
  _id: string;
  personnelId: string;
  poste: string;
  dateDebut: string;
  dateFin?: string | null;
  reference?: string;
  lieu?: string;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RHPosteFormData {
  poste: string;
  dateDebut: string;
  dateFin?: string | null;
  reference?: string;
  lieu?: string;
  observations?: string;
}

export interface RHDiplome {
  _id: string;
  personnelId: string;
  typeDiplome: string;
  sujetDiplome: string;
  dateObtention: string;
  etablissement?: string;
  reference?: string;
  niveau?: string;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RHDiplomeFormData {
  typeDiplome: string;
  sujetDiplome: string;
  dateObtention: string;
  etablissement?: string;
  reference?: string;
  niveau?: string;
  observations?: string;
}

export interface RHSanction {
  _id: string;
  personnelId: string;
  dateSanction: string;
  nombreJours?: number;
  raison: string;
  typeSanction?: string;
  reference?: string;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RHSanctionFormData {
  dateSanction: string;
  nombreJours?: number;
  raison: string;
  typeSanction?: string;
  reference?: string;
  observations?: string;
}

export interface FullPersonnelHistory {
  promotions: RHPromotion[];
  postes: RHPoste[];
  diplomes: RHDiplome[];
  sanctions: RHSanction[];
}

// ============================================================
// AXIOS CLIENT
// ============================================================

const api = axios.create({
  baseURL: '/api/hr',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// 1. PROMOTIONS API
// ============================================================

export const getPromotionsByPersonnel = async (personnelId: string): Promise<RHPromotion[]> => {
  const response = await api.get<{ success: boolean; data: RHPromotion[] }>(
    `/personnel/${personnelId}/promotions`
  );
  return response.data.data;
};

export const createPromotion = async (
  personnelId: string,
  data: RHPromotionFormData
): Promise<RHPromotion> => {
  const response = await api.post<{ success: boolean; data: RHPromotion }>(
    `/personnel/${personnelId}/promotions`,
    data
  );
  return response.data.data;
};

export const updatePromotion = async (
  id: string,
  data: Partial<RHPromotionFormData>
): Promise<RHPromotion> => {
  const response = await api.put<{ success: boolean; data: RHPromotion }>(
    `/promotions/${id}`,
    data
  );
  return response.data.data;
};

export const deletePromotion = async (id: string): Promise<void> => {
  await api.delete(`/promotions/${id}`);
};

// ============================================================
// 2. POSTES API
// ============================================================

export const getPostesByPersonnel = async (personnelId: string): Promise<RHPoste[]> => {
  const response = await api.get<{ success: boolean; data: RHPoste[] }>(
    `/personnel/${personnelId}/postes`
  );
  return response.data.data;
};

export const createPoste = async (
  personnelId: string,
  data: RHPosteFormData
): Promise<RHPoste> => {
  const response = await api.post<{ success: boolean; data: RHPoste }>(
    `/personnel/${personnelId}/postes`,
    data
  );
  return response.data.data;
};

export const updatePoste = async (
  id: string,
  data: Partial<RHPosteFormData>
): Promise<RHPoste> => {
  const response = await api.put<{ success: boolean; data: RHPoste }>(
    `/postes/${id}`,
    data
  );
  return response.data.data;
};

export const deletePoste = async (id: string): Promise<void> => {
  await api.delete(`/postes/${id}`);
};

// ============================================================
// 3. DIPLOMES API
// ============================================================

export const getDiplomesByPersonnel = async (personnelId: string): Promise<RHDiplome[]> => {
  const response = await api.get<{ success: boolean; data: RHDiplome[] }>(
    `/personnel/${personnelId}/diplomes`
  );
  return response.data.data;
};

export const createDiplome = async (
  personnelId: string,
  data: RHDiplomeFormData
): Promise<RHDiplome> => {
  const response = await api.post<{ success: boolean; data: RHDiplome }>(
    `/personnel/${personnelId}/diplomes`,
    data
  );
  return response.data.data;
};

export const updateDiplome = async (
  id: string,
  data: Partial<RHDiplomeFormData>
): Promise<RHDiplome> => {
  const response = await api.put<{ success: boolean; data: RHDiplome }>(
    `/diplomes/${id}`,
    data
  );
  return response.data.data;
};

export const deleteDiplome = async (id: string): Promise<void> => {
  await api.delete(`/diplomes/${id}`);
};

// ============================================================
// 4. SANCTIONS API
// ============================================================

export const getSanctionsByPersonnel = async (personnelId: string): Promise<RHSanction[]> => {
  const response = await api.get<{ success: boolean; data: RHSanction[] }>(
    `/personnel/${personnelId}/sanctions`
  );
  return response.data.data;
};

export const createSanction = async (
  personnelId: string,
  data: RHSanctionFormData
): Promise<RHSanction> => {
  const response = await api.post<{ success: boolean; data: RHSanction }>(
    `/personnel/${personnelId}/sanctions`,
    data
  );
  return response.data.data;
};

export const updateSanction = async (
  id: string,
  data: Partial<RHSanctionFormData>
): Promise<RHSanction> => {
  const response = await api.put<{ success: boolean; data: RHSanction }>(
    `/sanctions/${id}`,
    data
  );
  return response.data.data;
};

export const deleteSanction = async (id: string): Promise<void> => {
  await api.delete(`/sanctions/${id}`);
};

// ============================================================
// 5. AGRÉGATION (FULL HISTORY)
// ============================================================

export const getFullPersonnelHistory = async (personnelId: string): Promise<FullPersonnelHistory> => {
  const response = await api.get<{ success: boolean; data: FullPersonnelHistory }>(
    `/personnel/${personnelId}/full-history`
  );
  return response.data.data;
};
