import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image, File, ExternalLink, Paperclip } from 'lucide-react';
import { Message } from '@/types';

interface AttachmentsListProps {
  attachments: Message['attachments'];
}

const AttachmentsList: React.FC<AttachmentsListProps> = ({ attachments }) => {
  const getFileIcon = (filename?: string) => {
    const extension = filename?.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension || '')) {
      return <Image className="h-4 w-4 text-[#2c5282]" />;
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
      return <FileText className="h-4 w-4 text-[#2c5282]" />;
    } else {
      return <File className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  const getAttachmentUrl = (attachment: any): string => {
    if (attachment.url && attachment.url.startsWith('http')) {
      return attachment.url;
    }
    
    if (attachment.path) {
      const filename = attachment.path.split(/[\/\\]/).pop();
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      return `${apiBaseUrl}/api/messages/attachments/${filename}`;
    }
    
    if (attachment.filename) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      return `${apiBaseUrl}/api/messages/attachments/${attachment.filename}`;
    }
    
    return '';
  };

  const handleDownload = (attachment: any) => {
    const url = getAttachmentUrl(attachment);
    if (!url) return;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpen = (attachment: any) => {
    const url = getAttachmentUrl(attachment);
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-[#e2e8f0]" dir="rtl">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2.5">
        <Paperclip className="h-3.5 w-3.5 text-[#2c5282]" />
        <span>المرفقات ({attachments.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((attachment, index) => {
          if (!attachment) return null;
          const url = getAttachmentUrl(attachment);

          return (
            <div 
              key={index} 
              className="flex items-center justify-between p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-xs transition-colors duration-200 hover:border-[#cbd5e1] hover:bg-white"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1.5 bg-slate-100 rounded flex-shrink-0">
                  {getFileIcon(attachment.filename)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate" title={attachment.filename}>
                    {attachment.filename || 'ملف مرفق'}
                  </p>
                  {attachment.size ? (
                    <p className="text-[10px] text-slate-400">
                      {formatFileSize(attachment.size)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpen(attachment)}
                  disabled={!url}
                  className="h-7 w-7 p-0 text-slate-600 hover:text-[#2c5282] hover:bg-blue-50 rounded"
                  title="عرض المرفق"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(attachment)}
                  disabled={!url}
                  className="h-7 px-2 text-[11px] rounded border-[#FFCB56] text-[#78350f] bg-[#FFD758]/15 hover:bg-[#FFD758]/30 transition-colors duration-200 flex items-center gap-1 font-medium"
                  title="تحميل"
                >
                  <Download className="h-3 w-3" />
                  <span>تحميل</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AttachmentsList;
