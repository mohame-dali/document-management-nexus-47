
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Image, File } from 'lucide-react';
import { Message } from '@/types';

interface AttachmentsListProps {
  attachments: Message['attachments'];
}

const AttachmentsList: React.FC<AttachmentsListProps> = ({ attachments }) => {
  const getFileIcon = (filename: string) => {
    const extension = filename?.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension || '')) {
      return <Image className="h-5 w-5" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="h-5 w-5" />;
    } else {
      return <File className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '';
    
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
  };

  const getAttachmentUrl = (attachment: any): string => {
    // Check if attachment has a full URL
    if (attachment.url && attachment.url.startsWith('http')) {
      return attachment.url;
    }
    
    // If path exists, construct the proper URL
    if (attachment.path) {
      // Remove any Windows-style absolute paths and use only the filename
      const filename = attachment.path.split(/[\/\\]/).pop();
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      return `${apiBaseUrl}/uploads/attachments/${filename}`;
    }
    
    // Fallback: try to construct URL from filename
    if (attachment.filename) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      return `${apiBaseUrl}/uploads/attachments/${attachment.filename}`;
    }
    
    return '';
  };

  const handleDownloadAttachment = (attachment: any) => {
    const downloadUrl = getAttachmentUrl(attachment);
    
    if (!downloadUrl) {
      console.error('لا يوجد رابط تحميل للمرفق');
      return;
    }

    console.log('تحميل المرفق من:', downloadUrl);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = attachment.filename || 'مرفق';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAttachment = (attachment: any) => {
    const openUrl = getAttachmentUrl(attachment);
    
    if (!openUrl) {
      console.error('لا يوجد رابط لفتح المرفق');
      return;
    }

    console.log('فتح المرفق من:', openUrl);
    window.open(openUrl, '_blank');
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-3">المرفقات ({attachments.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attachments.map((attachment, index) => {
            if (!attachment || typeof attachment !== 'object') {
              return (
                <div key={index} className="p-3 border rounded-lg bg-gray-50">
                  <div className="text-sm">مرفق بدون اسم</div>
                </div>
              );
            }

            const attachmentUrl = getAttachmentUrl(attachment);

            return (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getFileIcon(attachment.filename)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {attachment.filename || 'ملف بدون اسم'}
                      </div>
                      {attachment.size && (
                        <div className="text-xs text-gray-500">
                          {formatFileSize(attachment.size)}
                        </div>
                      )}
                      {!attachmentUrl && (
                        <div className="text-xs text-red-500">
                          رابط المرفق غير متوفر
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {attachment.priority && (
                      <Badge 
                        variant={
                          attachment.priority === 'high' ? 'destructive' :
                          attachment.priority === 'medium' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {attachment.priority === 'high' ? 'عالية' :
                         attachment.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </Badge>
                    )}
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAttachment(attachment)}
                        className="h-8 w-8 p-0"
                        title="فتح المرفق"
                        disabled={!attachmentUrl}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                        className="h-8 w-8 p-0"
                        title="تحميل المرفق"
                        disabled={!attachmentUrl}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AttachmentsList;
