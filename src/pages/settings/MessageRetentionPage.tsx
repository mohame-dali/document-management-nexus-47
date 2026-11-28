import React from 'react';
import MessageRetentionPanel from '@/components/settings/MessageRetentionPanel';

const MessageRetentionPage: React.FC = () => {
  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <MessageRetentionPanel standalone />
      </div>
    </div>
  );
};

export default MessageRetentionPage;
