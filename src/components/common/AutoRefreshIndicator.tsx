import React, { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

export const AutoRefreshIndicator: React.FC = () => {
  const isFetching = useIsFetching();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isFetching > 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isFetching]);

  if (!visible || isFetching === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-[#e2e8f0] rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2 text-xs text-[#718096] animate-fade-slide-in pointer-events-none">
      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2c5282]" />
      <span>جاري التحديث...</span>
    </div>
  );
};
