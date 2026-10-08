import api from '@/services/apiService';

export interface OcrUploadResult {
  ocrText: string;
  length: number;
  filename: string;
}

/**
 * Envoie un fichier (PDF ou image) au serveur pour extraction OCR.
 * Le serveur utilise Tesseract natif (C++) avec support arabe+fra+eng.
 */
export const extractOcrFromServer = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/scan/ocr-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000, // 90 sec
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return response.data?.data?.ocrText || '';
};
