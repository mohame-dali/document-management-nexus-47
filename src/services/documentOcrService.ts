import api from './apiService';

interface OcrUploadResponse {
  success: boolean;
  data?: {
    ocrText?: string;
    length?: number;
    filename?: string;
  };
  message?: string;
}

export const extractOcrFromServer = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<OcrUploadResponse>('/scan/ocr-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 180000,
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 80) / progressEvent.total);
        onProgress(Math.min(percent, 80));
      }
    },
  });

  if (onProgress) {
    onProgress(100);
  }

  return response.data?.data?.ocrText || '';
};
