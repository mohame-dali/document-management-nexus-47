import React from 'react';
import { Check, CheckCheck, Paperclip, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { Message } from '@/types';

export interface MessageBubbleProps {
  message: Message | any;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const formatTime = (dateStr?: string | Date): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  const handleDownloadAttachment = (e: React.MouseEvent, attachment: any) => {
    e.stopPropagation();
    let url = '';
    if (attachment.url && attachment.url.startsWith('http')) {
      url = attachment.url;
    } else if (attachment.path) {
      const filename = attachment.path.split(/[\/\\]/).pop();
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      url = `${apiBaseUrl}/api/messages/attachments/${filename}`;
    } else if (attachment.filename) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      url = `${apiBaseUrl}/api/messages/attachments/${attachment.filename}`;
    }

    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isRead = Array.isArray(message.recipients) && message.recipients.length > 0
    ? message.recipients.every((r: any) => r.read)
    : false;

  const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;

  return (
    <div className={`flex w-full my-1 ${isOwn ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[70%] px-4 py-2.5 shadow-sm transition-all duration-200 ${
          isOwn
            ? 'bg-[#2c5282] text-white rounded-tr-none'
            : 'bg-white text-[#1a202c] border border-[#e2e8f0] rounded-tl-none'
        }`}
      >
        {/* Message Content */}
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words select-text">
          {message.content}
        </p>

        {/* Attachments (if any) */}
        {hasAttachments && (
          <div className="mt-2.5 pt-2 border-t border-white/20 space-y-1.5">
            {message.attachments.map((att: any, idx: number) => {
              const ext = att.filename?.split('.').pop()?.toLowerCase() || '';
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

              return (
                <div
                  key={idx}
                  onClick={(e) => handleDownloadAttachment(e, att)}
                  className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer transition-colors text-xs ${
                    isOwn
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-[#e2e8f0]'
                  }`}
                  title="تحميل المرفق"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isImage ? (
                      <ImageIcon className="h-4 w-4 shrink-0 opacity-80" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 opacity-80" />
                    )}
                    <span className="truncate max-w-[160px] font-medium" dir="ltr">
                      {att.filename || `مرفق ${idx + 1}`}
                    </span>
                    {att.size ? (
                      <span className="text-[11px] opacity-75 shrink-0">
                        ({formatFileSize(att.size)})
                      </span>
                    ) : null}
                  </div>
                  <Download className="h-3.5 w-3.5 shrink-0 opacity-80" />
                </div>
              );
            })}
          </div>
        )}

        {/* Bubble Meta (Time + Status) */}
        <div
          className={`flex items-center justify-end gap-1.5 mt-1 text-[11px] select-none ${
            isOwn ? 'text-white/80' : 'text-slate-400'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span title={isRead ? 'تمت القراءة' : 'تم الإرسال'}>
              {isRead ? (
                <CheckCheck className="h-3.5 w-3.5 text-[#FFCB56]" />
              ) : (
                <Check className="h-3.5 w-3.5 text-white/70" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
