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
 * Vérifie que le service IA (Ollama) est opérationnel
 */
export const checkAIHealth = async (): Promise<AIHealth> => {
  const response = await api.get('/ai/health');
  return response.data.data;
};

/**
 * Extrait les informations d'un texte OCR via le LLM local.
 * Timeout : 65 secondes (backend = 60s).
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
      timeout: 65000,
      signal,
    }
  );
  return response.data.data;
};

/**
 * Extrait le code d'erreur structuré depuis une erreur Axios
 */
export const getAIErrorCode = (error: any): AIError => {
  const code = error?.response?.data?.code;
  const message = error?.response?.data?.message;

  if (code) return { code, message: message || '' };

  // Erreurs réseau / timeout côté client
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return { code: 'CLIENT_TIMEOUT', message: '' };
  }
  if (error?.code === 'ERR_CANCELED') {
    return { code: 'CANCELLED', message: '' };
  }

  return { code: 'UNKNOWN', message: message || '' };
};

// Re-exports pour commodité
export { summarizeDocument, type DocumentSummary } from './aiSummaryService';
export { translateDocumentText, type TranslationResult } from './aiTranslationService';

