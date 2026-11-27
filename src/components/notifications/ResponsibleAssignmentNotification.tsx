import React from 'react';
import { toast } from 'sonner';
import { FileText, User } from 'lucide-react';
import { formatLongDate } from '@/utils/formatDate';

interface ResponsibleAssignmentNotificationProps {
  documentId: string;
  documentSubject: string;
  assignedBy: string;
  onMarkAsRead?: () => void;
  onOpenDocument?: () => void;
}

export const showResponsibleAssignmentNotification = ({
  documentId,
  documentSubject,
  assignedBy,
  onMarkAsRead,
  onOpenDocument
}: ResponsibleAssignmentNotificationProps) => {
  const docDir: 'rtl' | 'ltr' = typeof document !== 'undefined' && document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl';
  const isFr = docDir === 'ltr';

  toast.success(
    isFr ? 'Désigné responsable d’un document' : 'تم تعيينك كمسؤول عن وثيقة',
    {
      description: (
        <div
          className="space-y-2"
          dir={docDir}
          data-document-id={documentId}
        >
          <div
            onClick={onOpenDocument}
            className={`flex items-center gap-2 ${onOpenDocument ? 'cursor-pointer hover:text-[#2c5282] dark:hover:text-blue-300 transition-colors' : ''}`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="font-medium">{documentSubject}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {isFr ? 'Assigné par : ' : 'تم التعيين بواسطة: '}{assignedBy}
            </span>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
            <bdi dir={docDir} className="tabular-nums">{formatLongDate(new Date(), isFr ? 'fr' : 'ar')}</bdi>
          </div>
        </div>
      ),
      icon: <FileText className="h-5 w-5 text-green-500" />,
      duration: 10000,
      action: onOpenDocument
        ? {
            label: isFr ? 'Ouvrir le document' : 'فتح الوثيقة',
            onClick: () => {
              onMarkAsRead?.();
              onOpenDocument();
            }
          }
        : {
            label: isFr ? 'Marquer comme lu' : 'تم الاطلاع',
            onClick: onMarkAsRead || (() => {})
          },
      className: 'text-start',
      style: { direction: docDir }
    }
  );
};

export default showResponsibleAssignmentNotification;
