import React from 'react';
import { X, FileText, User, Calendar, ExternalLink, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatLongDate } from '@/utils/formatDate';
import { useDirection } from '@/i18n/useDirection';

interface ResponsibleNotificationPopupProps {
  documentId: string;
  documentType?: 'IncomingDocument' | 'OutgoingDocument' | string;
  documentSubject: string;
  documentSerialNumber: number;
  documentYear: number;
  assignedBy: string;
  assignedAt: string;
  onOpenDocument?: () => void;
  onMarkAsRead: () => void;
  onTemporaryDismiss: () => void;
}

const ResponsibleNotificationPopup: React.FC<ResponsibleNotificationPopupProps> = ({
  documentId,
  documentSubject,
  documentSerialNumber,
  documentYear,
  assignedBy,
  assignedAt,
  onOpenDocument,
  onMarkAsRead,
  onTemporaryDismiss
}) => {
  const { dir, isRTL } = useDirection();
  const isFr = !isRTL;

  const handleOpen = () => {
    if (onOpenDocument) {
      onOpenDocument();
    } else {
      onMarkAsRead();
    }
  };

  return (
    <div
      data-responsible-overlay="true"
      data-document-id={documentId}
      className={`fixed top-4 end-4 z-[9999] print:hidden animate-in ${dir === 'rtl' ? 'slide-in-from-left-full' : 'slide-in-from-right-full'} duration-200`}
      dir={dir}
    >
      <Card className="w-[26rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border-2 border-[#2c5282] dark:border-blue-500/80 shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="pb-3 bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-5 w-5 text-[#2c5282] dark:text-blue-400 shrink-0" />
              <CardTitle className="text-base sm:text-lg text-[#1e3a5f] dark:text-blue-200 truncate">
                {isFr ? 'Vous avez été désigné responsable' : 'تم تعيينك كمسؤول'}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTemporaryDismiss}
              aria-label={isFr ? 'Fermer la notification' : 'إغلاق الإشعار'}
              className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge
            variant="secondary"
            className="w-fit bg-blue-50 text-[#2c5282] border border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60"
          >
            {isFr ? 'Notification importante' : 'إشعار مهم'}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Interactive Document Card Body */}
          <div className="space-y-3">
            <div
              role="button"
              tabIndex={0}
              onClick={handleOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpen();
                }
              }}
              aria-label={isFr ? `Ouvrir le document ${documentSerialNumber}/${documentYear}` : `فتح الوثيقة ${documentSerialNumber}/${documentYear}`}
              className="group rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 p-3 cursor-pointer transition-colors hover:bg-blue-50/80 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]"
            >
              <div className="flex items-start gap-2.5">
                <FileText className="h-4 w-4 mt-1 text-[#2c5282] dark:text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#2c5282] dark:group-hover:text-blue-300 leading-relaxed transition-colors">
                      {documentSubject}
                    </p>
                    <ExternalLink className="h-4 w-4 mt-1 text-slate-400 group-hover:text-[#2c5282] dark:group-hover:text-blue-300 shrink-0 transition-colors" />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 tabular-nums">
                    {isFr ? 'N° du document : ' : 'رقم الوثيقة: '}
                    <bdi dir="ltr" className="font-semibold text-[#2c5282] dark:text-blue-300">
                      {documentSerialNumber}/{documentYear}
                    </bdi>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <User className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {isFr ? 'Assigné par : ' : 'تم التعيين بواسطة: '}
                <span className="font-medium text-slate-900 dark:text-slate-100">{assignedBy}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 px-1">
              <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                <bdi dir={dir} className="tabular-nums">
                  {formatLongDate(assignedAt, isFr ? 'fr' : 'ar')}
                </bdi>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <Button
              onClick={handleOpen}
              className="flex-1 min-w-[130px] bg-[#2c5282] hover:bg-[#234269] text-white font-medium"
              size="sm"
            >
              <ExternalLink className="h-3.5 w-3.5 me-1.5" />
              {isFr ? 'Ouvrir le document' : 'فتح الوثيقة'}
            </Button>
            <Button
              variant="outline"
              onClick={onMarkAsRead}
              size="sm"
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Check className="h-3.5 w-3.5 me-1" />
              {isFr ? 'Marquer comme lu' : 'تم الاطلاع'}
            </Button>
            <Button
              variant="ghost"
              onClick={onTemporaryDismiss}
              size="sm"
              title={isFr ? 'Masquer temporairement' : 'إخفاء مؤقت'}
              className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isFr ? 'Masquer' : 'إخفاء مؤقت'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponsibleNotificationPopup;
