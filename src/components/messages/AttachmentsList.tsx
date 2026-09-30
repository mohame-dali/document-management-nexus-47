import React, { useState } from 'react';
import { Download, FileText, Image as ImageIcon, File, ExternalLink, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types';
import { downloadAttachment } from '@/services/messageService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorMessages';

interface AttachmentsListProps {
  attachments: Message['attachments'];
}

const AttachmentsList: React.FC<AttachmentsListProps> = ({ attachments }) => {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const getFileIcon = (filename?: string) => {
    const extension = filename?.split('.').pop()?.toLowerCase();
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
      return <FileText className="h-4 w-4 text-[#2c5282]" />;
    }
    return <File className="h-4 w-4 text-slate-500" />;
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

  const isAttachmentImage = (att: any) => {
    const name = att.originalName || att.filename || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return att.mimetype?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  };

  const imageAttachments = attachments.filter(isAttachmentImage);
  const otherAttachments = attachments.filter(att => !isAttachmentImage(att));

  const apiBaseUrl = import.meta.env.VITE_API_URL || '';

  const getDiskName = (att: any) => {
    return (att.path?.split(/[\/\\]/).pop()) || att.filename || '';
  };

  return (
    <div className="space-y-2 mt-1" dir="rtl">
      {/* 1. Images multiples (grid 2 colonnes style Messenger) */}
      {imageAttachments.length > 1 && (
        <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden max-w-[240px]">
          {imageAttachments.map((img, idx) => {
            const diskName = getDiskName(img);
            const imgSrc = `${apiBaseUrl}/api/messages/attachments/${diskName}`;
            const displayName = img.originalName || img.filename || 'صورة';
            return (
              <div key={idx} className="relative group overflow-hidden bg-slate-200">
                <img
                  src={imgSrc}
                  alt={displayName}
                  className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => downloadAttachment(img, true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Image seule (arrondie, max-w-[220px]) */}
      {imageAttachments.length === 1 && (
        <div className="rounded-xl overflow-hidden max-w-[220px] max-h-[220px] bg-slate-200 shadow-xs">
          {(() => {
            const img = imageAttachments[0];
            const diskName = getDiskName(img);
            const imgSrc = `${apiBaseUrl}/api/messages/attachments/${diskName}`;
            const displayName = img.originalName || img.filename || 'صورة';
            return (
              <img
                src={imgSrc}
                alt={displayName}
                className="w-full h-auto max-h-[220px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => downloadAttachment(img, true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            );
          })()}
        </div>
      )}

      {/* 3. Documents (PDF, Word, etc.) */}
      {otherAttachments.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {otherAttachments.map((att, idx) => {
            const globalIndex = attachments.indexOf(att);
            const isCurrentDownloading = downloadingIndex === globalIndex;
            const displayName = att.originalName || att.filename || 'ملف مرفق';

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-white/90 border border-slate-200/80 rounded-lg text-xs shadow-2xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1 bg-slate-100 rounded shrink-0">
                    {getFileIcon(displayName)}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="font-medium text-slate-800 truncate" title={displayName}>
                      {displayName}
                    </p>
                    {att.size ? (
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(att.size)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(att, globalIndex, true)}
                    disabled={isCurrentDownloading}
                    className="p-1 text-slate-500 hover:text-[#2c5282] hover:bg-slate-100 rounded"
                    title="عرض"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(att, globalIndex, false)}
                    disabled={isCurrentDownloading}
                    className="p-1 text-[#2c5282] hover:bg-slate-100 rounded"
                    title="تحميل"
                  >
                    {isCurrentDownloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttachmentsList;
