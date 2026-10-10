import { useQuery } from '@tanstack/react-query';
import api from '@/services/apiService';

/**
 * Hook centralisé pour récupérer tous les compteurs de badges.
 * Utilisé par les hubs pour afficher les badges sur les onglets.
 * 
 * ⚠️ Utilise staleTime élevé pour éviter les appels API excessifs.
 * ⚠️ Ne casse pas si un endpoint n'existe pas (retourne 0 silencieusement).
 */
export const useHubBadges = () => {
  // Compteur messages non lus (endpoint existant)
  const { data: unreadMessages } = useQuery({
    queryKey: ['hub-badge-unread-messages'],
    queryFn: async () => {
      try {
        const response = await api.get('/messages/unread/count');
        return response.data?.data?.count || response.data?.count || 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60 * 1000, // 1 min
    refetchInterval: 2 * 60 * 1000, // 2 min
    retry: false,
  });

  // Compteur déclarations en attente (si endpoint existe)
  const { data: pendingDeclarations } = useQuery({
    queryKey: ['hub-badge-pending-declarations'],
    queryFn: async () => {
      try {
        const response = await api.get('/attendance-declarations/pending/count');
        return response.data?.data?.count || response.data?.count || 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: false,
  });

  // Compteur courriers entrants en attente (si endpoint existe)
  const { data: pendingIncoming } = useQuery({
    queryKey: ['hub-badge-pending-incoming'],
    queryFn: async () => {
      try {
        const response = await api.get('/incoming-documents/pending/count');
        return response.data?.data?.count || response.data?.count || 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: false,
  });

  return {
    unreadMessages: unreadMessages || 0,
    pendingDeclarations: pendingDeclarations || 0,
    pendingIncoming: pendingIncoming || 0,
  };
};

export default useHubBadges;
