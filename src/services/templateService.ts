
import apiService from './apiService';

export interface Template {
  _id: string;
  name: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedBy: {
    _id: string;
    username: string;
  };
  downloads: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  template: File;
}

export interface UpdateTemplateData {
  name: string;
  description?: string;
  template?: File;
}

export const getTemplates = async (): Promise<Template[]> => {
  const response = await apiService.get('/templates');
  return response.data.data;
};

export const getTemplate = async (id: string): Promise<Template> => {
  const response = await apiService.get(`/templates/${id}`);
  return response.data.data;
};

export const createTemplate = async (data: CreateTemplateData): Promise<Template> => {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.description) {
    formData.append('description', data.description);
  }
  formData.append('template', data.template);

  const response = await apiService.post('/templates', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const updateTemplate = async (id: string, data: UpdateTemplateData): Promise<Template> => {
  const formData = new FormData();
  formData.append('name', data.name);
  if (data.description) {
    formData.append('description', data.description);
  }
  if (data.template) {
    formData.append('template', data.template);
  }

  const response = await apiService.put(`/templates/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await apiService.delete(`/templates/${id}`);
};

export const downloadTemplate = async (id: string, fileName: string): Promise<void> => {
  const response = await apiService.get(`/templates/${id}/download`, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
