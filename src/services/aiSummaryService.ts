import api from '@/services/apiService';
import { getErrorMessage } from '@/utils/errorMessages';

export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  language?: 'ar' | 'fr' | 'mixed';
  urgency?: 'normal' | 'urgent' | 'very_urgent';
}

/**
 * Résume automatiquement un texte OCR via l'IA locale (Ollama / Qwen).
 * Timeout: 65s (backend = 60s).
 */
export const summarizeDocument = async (
  ocrText: string,
  maxLength: number = 200,
  signal?: AbortSignal
): Promise<DocumentSummary> => {
  const response = await api.post(
    '/ai/summarize',
    { ocrText, maxLength },
    {
      timeout: 65000,
      signal,
    }
  );
  return response.data.data;
};

/**
 * Extrait un message d'erreur lisible pour l'interface utilisateur
 */
export const getSummaryErrorMessage = (error: any): string => {
  const code = error?.response?.data?.code;
  if (code === 'AI_SERVICE_DOWN') {
    return 'خدمة الذكاء الاصطناعي (Ollama) غير مشغلة حالياً. يرجى التحقق من تشغيل الخدمة.';
  }
  if (code === 'AI_TIMEOUT' || error?.code === 'ECONNABORTED') {
    return 'استغرقت عملية التلخيص وقتاً أطول من المتوقع. يرجى إعادة المحاولة.';
  }
  if (code === 'OCR_TOO_SHORT') {
    return 'النص المستخرج قصير جداً لإنشاء تلخيص ذكي (الحد الأدنى 50 حرفاً).';
  }
  if (code === 'AI_INVALID_JSON') {
    return 'حدث خطأ في معالجة مخرجات النموذج الذكي. يرجى المحاولة مرة أخرى.';
  }
  return getErrorMessage(error);
};
