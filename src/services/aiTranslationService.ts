import api from '@/services/apiService';
import { getErrorMessage } from '@/utils/errorMessages';

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: 'ar' | 'fr';
}

/**
 * Traduit un texte administratif entre l'arabe et le français via Ollama.
 * Timeout: 65s.
 */
export const translateDocumentText = async (
  text: string,
  targetLang: 'ar' | 'fr',
  signal?: AbortSignal
): Promise<TranslationResult> => {
  const response = await api.post(
    '/ai/translate',
    { text, targetLang },
    {
      timeout: 65000,
      signal,
    }
  );
  return response.data.data;
};

/**
 * Extrait un message d'erreur lisible pour la traduction
 */
export const getTranslationErrorMessage = (error: any): string => {
  const code = error?.response?.data?.code;
  if (code === 'AI_SERVICE_DOWN') {
    return 'خدمة الذكاء الاصطناعي (Ollama) غير مشغلة حالياً. يرجى التحقق من تشغيل الخدمة.';
  }
  if (code === 'AI_TIMEOUT' || error?.code === 'ECONNABORTED') {
    return 'استغرقت عملية الترجمة وقتاً أطول من المتوقع. يرجى إعادة المحاولة.';
  }
  if (code === 'TEXT_TOO_SHORT') {
    return 'النص المطلوب ترجمته قصير جداً.';
  }
  if (code === 'AI_INVALID_JSON') {
    return 'تعذر استخراج الترجمة من النموذج. يرجى إعادة المحاولة.';
  }
  return getErrorMessage(error);
};
