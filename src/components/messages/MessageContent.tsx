import React from 'react';
import { Message } from '@/types';

interface MessageContentProps {
  message: Message;
}

const MessageContent: React.FC<MessageContentProps> = ({ message }) => {
  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Body text box */}
      <div className="bg-[#ffffff] p-5 rounded border border-[#e2e8f0] min-h-[160px] text-slate-800 leading-relaxed text-sm whitespace-pre-wrap selection:bg-[#FFD758]/30">
        {message.content}
      </div>
    </div>
  );
};

export default MessageContent;
