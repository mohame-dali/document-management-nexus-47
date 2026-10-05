import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getOnlineUsers, sendHeartbeat } from '@/services/onlineUsersService';
import { useAuth } from '@/contexts/AuthContext';

export const useOnlineUsers = () => {
  const { currentUser } = useAuth();

  // Heartbeat toutes les 60s
  useEffect(() => {
    if (!currentUser) return;
    sendHeartbeat().catch(() => {});
    const interval = setInterval(() => {
      sendHeartbeat().catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [currentUser?._id]);

  // Polling toutes les 15s
  const { data: onlineUsers = [] } = useQuery({
    queryKey: ['online-users'],
    queryFn: getOnlineUsers,
    refetchInterval: 15000,
    enabled: !!currentUser,
    staleTime: 10000,
  });

  const onlineSet = new Set(onlineUsers);
  const isUserOnline = (userId: string | undefined): boolean => {
    if (!userId) return false;
    return onlineSet.has(userId);
  };

  return { onlineUsers, onlineSet, isUserOnline };
};
