import api from './apiService';

export interface ChartPersonnel {
  _id: string;
  nom: string;
  prenom: string;
  poste?: string;
  photo?: string;
  cin?: string;
}

export interface ChartDepartment {
  _id: string;
  name: string;
  unitType: 'bureau_ordre' | 'rh' | 'service';
  totalPersonnel: number;
  personnel: ChartPersonnel[];
}

export interface Director {
  _id: string;
  nom: string;
  prenom: string;
  poste?: string;
  photo?: string;
  cin?: string;
}

export interface OrganizationChartData {
  administration: { name: string };
  director: Director | null;
  regalienDepartments: ChartDepartment[];
  operationalDepartments: ChartDepartment[];
}

export const getOrganizationChart = async (): Promise<OrganizationChartData> => {
  const response = await api.get('/organization-chart');
  return response.data.data;
};
