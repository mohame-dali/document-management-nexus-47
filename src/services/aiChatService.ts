import api from '@/services/apiService';

// ═══════════════════════════════════════════════════════════════
// Configuration Mock — STRICTEMENT réservé au développement local
// En production, le mock est totalement DÉSACTIVÉ.
// Il ne s'active QUE si :
// - On est en développement (import.meta.env.DEV)
// - ET VITE_ENABLE_MOCK === 'true'
// ═══════════════════════════════════════════════════════════════
const isMockEnabled = (): boolean => {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK === 'true';
};

export interface ChatSource {
  documentId: string;
  documentType: 'incoming' | 'outgoing';
  subject: string;
  source: string;
  serialNumber: string;
  year: number | null;
  date: string | null;
  score: number;
}

export interface ChatResponse {
  query: string;
  summary: string;
  totalFound: number;
  sources: ChatSource[];
  filters?: {
    yearFilter?: number | null;
    typeFilter?: string | null;
  };
}

/**
 * Envoie une question en langage naturel à l'IA
 * L'IA cherche dans les documents indexés et génère un résumé.
 * En production, utilise STRICTEMENT le backend réel.
 */
export const askAIAssistant = async (
  query: string,
  options?: {
    yearFilter?: number;
    typeFilter?: 'incoming' | 'outgoing';
    signal?: AbortSignal;
  }
): Promise<ChatResponse> => {
  // Le mock ne s'active QUE si DEV + VITE_ENABLE_MOCK === 'true'
  if (isMockEnabled()) {
    console.warn('[AI Chat] ⚠️ Mode mock actif (développement avec VITE_ENABLE_MOCK="true")');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      query,
      summary: `[Mode Mock Démo] Résumé simulé pour : "${query}". En production, les réponses proviennent de l'indexation RAG réelle et du modèle Ollama.`,
      totalFound: 1,
      sources: [
        {
          documentId: 'mock-demo-doc',
          documentType: options?.typeFilter || 'incoming',
          subject: `وثيقة تجريبية: ${query}`,
          source: 'Direction Générale',
          serialNumber: '001/2025',
          year: options?.yearFilter || 2025,
          date: new Date().toISOString(),
          score: 0.95,
        },
      ],
      filters: {
        yearFilter: options?.yearFilter || null,
        typeFilter: options?.typeFilter || null,
      },
    };
  }

  // Production / Sans flag mock : appel STRICTEMENT réel au backend
  const response = await api.post(
    '/ai/chat',
    {
      query,
      yearFilter: options?.yearFilter,
      typeFilter: options?.typeFilter,
    },
    {
      timeout: 90000,
      signal: options?.signal,
    }
  );
  return response.data.data;
};
