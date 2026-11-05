import api from '@/services/apiService';

export interface ExtractedInfo {
  subject: string | null;
  source: string | null;
  correspondenceNumber: string | null;
  correspondenceDate: string | null;
  typeDocument: string | null;
  confidence: number;
}

export interface AIHealth {
  ok: boolean;
  url?: string;
  chatModel?: string;
  chatInstalled?: boolean;
  installedModels?: string[];
  error?: string;
}

export interface AIError {
  code: string;
  message: string;
}

/**
 * Vérifie que le service IA local est opérationnel
 */
export const checkAIHealth = async (): Promise<AIHealth> => {
  const response = await api.get('/ai/health');
  return response.data.data;
};

/**
 * Extrait les informations d'un texte OCR via le LLM local.
 * Timeout : 90 secondes (backend = 120s).
 * Support AbortController pour annulation.
 */
export const extractFromOcr = async (
  ocrText: string,
  signal?: AbortSignal
): Promise<ExtractedInfo> => {
  const response = await api.post(
    '/ai/extract-from-ocr',
    { ocrText },
    {
      timeout: 90000,
      signal,
    }
  );
  return response.data.data;
};

interface AxiosErrorLike {
  code?: string;
  message?: string;
  response?: {
    data?: {
      code?: AIErrorCode;
      message?: string;
    };
  };
}

/**
 * Extrait le code d'erreur structuré depuis une erreur Axios
 */
export const getAIErrorCode = (error: unknown): AIError => {
  const err = error as AxiosErrorLike;
  const code = err?.response?.data?.code;
  const message = err?.response?.data?.message;

  if (code) return { code, message: message || '' };

  // Erreurs réseau / timeout côté client
  if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
    return { code: 'CLIENT_TIMEOUT', message: '' };
  }
  if (err?.code === 'ERR_CANCELED') {
    return { code: 'CANCELLED', message: '' };
  }

  return { code: 'UNKNOWN', message: message || '' };
};

// Re-exports pour commodité
export { summarizeDocument, type DocumentSummary } from './aiSummaryService';
export { translateDocumentText, type TranslationResult } from './aiTranslationService';

