import api from './apiService';

export interface ChartPersonnel {
  _id: string;
  nom: string;
  prenom: string;
  poste: string;
  photo: string;
}

export interface ChartDepartment {
  _id: string;
  name: string;
  description: string;
  isFunctional: boolean;
  unitType: 'bureau_directeur' | 'bureau_ordre' | 'rh' | null;
  personnel: ChartPersonnel[];
}

export interface OrganizationChartData {
  administration: {
    name: string;
    departments: ChartDepartment[];
  };
}

export const getOrganizationChart = async (): Promise<OrganizationChartData> => {
  const response = await api.get('/organization-chart');
  return response.data.data;
};
