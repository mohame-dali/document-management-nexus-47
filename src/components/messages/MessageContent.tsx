import React from 'react';
import { Message } from '@/types';
import { useDirection } from '@/i18n/useDirection';

interface MessageContentProps {
  message: Message;
}

const MessageContent: React.FC<MessageContentProps> = ({ message }) => {
  const { dir } = useDirection();

  return (
    <div className="space-y-4 text-start" dir={dir}>
      {/* Body text box */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200/80 dark:border-slate-800 min-h-[160px] text-slate-800 dark:text-slate-100 leading-relaxed text-sm whitespace-pre-wrap selection:bg-[#FFD758]/30">
        {message.content}
      </div>
    </div>
  );
};

export default MessageContent;
