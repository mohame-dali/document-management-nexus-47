import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image, File, ExternalLink, Paperclip, Loader2 } from 'lucide-react';
import { Message } from '@/types';
import { downloadAttachment } from '@/services/messageService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorMessages';

interface AttachmentsListProps {
  attachments: Message['attachments'];
}

const AttachmentsList: React.FC<AttachmentsListProps> = ({ attachments }) => {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

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

  const handleDownload = async (attachment: any, index: number, openInNewTab = false) => {
    try {
      setDownloadingIndex(index);
      await downloadAttachment(attachment, openInNewTab);
    } catch (error) {
      console.error('Erreur téléchargement pièce jointe:', error);
      toast.error(getErrorMessage(error, 'تعذر تحميل الملف المرفق'));
    } finally {
      setDownloadingIndex(null);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {attachments.map((attachment, index) => {
          if (!attachment) return null;
          const isCurrentDownloading = downloadingIndex === index;
          const ext = attachment.filename?.split('.').pop()?.toLowerCase() || '';
          const isImage = attachment.mimetype?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);

          if (isImage) {
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
            const imgSrc = `${apiBaseUrl}/api/messages/attachments/${attachment.filename}`;

            return (
              <div
                key={index}
                className="relative group/img rounded border border-[#e2e8f0] bg-[#f8fafc] p-2 flex flex-col items-center gap-1.5 overflow-hidden transition-colors hover:border-[#cbd5e1] hover:bg-white"
              >
                <div className="relative w-full h-36 flex items-center justify-center bg-slate-100 rounded overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={attachment.filename || 'صورة مرفقة'}
                    className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover/img:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDownload(attachment, index, true)}
                    disabled={isCurrentDownloading}
                    className="absolute inset-0 bg-black/45 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded gap-2 text-white"
                    title="تكبير / عرض الصورة"
                  >
                    {isCurrentDownloading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-xs font-medium">عرض الصورة</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="w-full flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div className="min-w-0 flex-1 pl-2">
                    <p className="font-medium text-slate-800 truncate" title={attachment.filename}>
                      {attachment.filename || 'صورة'}
                    </p>
                    {attachment.size ? (
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(attachment.size)}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(attachment, index, false)}
                    disabled={isCurrentDownloading}
                    className="h-6 px-2 text-[10px] rounded border-[#FFCB56] text-[#78350f] bg-[#FFD758]/15 hover:bg-[#FFD758]/30 flex items-center gap-1"
                    title="تحميل"
                  >
                    <Download className="h-3 w-3" />
                    <span>تحميل</span>
                  </Button>
                </div>
              </div>
            );
          }

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
                  onClick={() => handleDownload(attachment, index, true)}
                  disabled={isCurrentDownloading}
                  className="h-7 w-7 p-0 text-slate-600 hover:text-[#2c5282] hover:bg-blue-50 rounded"
                  title="عرض المرفق في نافذة جديدة"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(attachment, index, false)}
                  disabled={isCurrentDownloading}
                  className="h-7 px-2 text-[11px] rounded border-[#FFCB56] text-[#78350f] bg-[#FFD758]/15 hover:bg-[#FFD758]/30 transition-colors duration-200 flex items-center gap-1 font-medium"
                  title="تحميل المرفق"
                >
                  {isCurrentDownloading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-[#78350f]" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  <span>{isCurrentDownloading ? 'جاري التحميل...' : 'تحميل'}</span>
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
