import { useEffect, useState, useCallback, useRef } from 'react';
import { getSystemHealthAPI } from '@/services/documentService';

export type ServerConnectionStatus = 'connected' | 'reconnecting';

export function useServerConnection(pollIntervalMs = 30000): ServerConnectionStatus {
  const [status, setStatus] = useState<ServerConnectionStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'reconnecting' : 'connected'
  );
  const mountedRef = useRef(true);

  const checkHealth = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (mountedRef.current) setStatus('reconnecting');
      return;
    }

    try {
      const res = await getSystemHealthAPI();
      if (!mountedRef.current) return;
      if (res && res.success !== false && res.database !== 'disconnected') {
        setStatus('connected');
      } else {
        setStatus('reconnecting');
      }
    } catch {
      if (mountedRef.current) {
        setStatus('reconnecting');
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    checkHealth();

    const handleOnline = () => {
      checkHealth();
    };
    const handleOffline = () => {
      if (mountedRef.current) setStatus('reconnecting');
    };
    const handleFocus = () => {
      checkHealth();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);

    const interval = window.setInterval(checkHealth, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(interval);
    };
  }, [checkHealth, pollIntervalMs]);

  return status;
}
