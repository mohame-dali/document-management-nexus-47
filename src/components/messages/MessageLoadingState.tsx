import React from 'react';
import { Card } from '@/components/ui/card';

const MessageLoadingState: React.FC = () => {
  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-xl">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    </Card>
  );
};

export default MessageLoadingState;
