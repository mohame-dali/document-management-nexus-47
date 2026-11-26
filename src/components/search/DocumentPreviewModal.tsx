import React from 'react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  Building2, 
  User, 
  ExternalLink, 
  Hash, 
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatShortDate } from '@/utils/formatDate';

interface DocumentPreviewModalProps {
  document: (IncomingDocument | OutgoingDocument) | null;
  documentType: 'incoming' | 'outgoing' | null;
  isOpen: boolean;
  onClose: () => void;
  highlightKeyword?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  documentType,
  isOpen,
  onClose,
  highlightKeyword = ''
}) => {
  const navigate = useNavigate();

  if (!document) return null;

  const isIncoming = documentType === 'incoming' || 'arrivalDate' in document;
  const docDate = isIncoming
    ? (document as IncomingDocument).arrivalDate
    : (document as OutgoingDocument).issueDate;

  const rawOutgoingSource = (document as OutgoingDocument).source;
  const sourceName: string = isIncoming
    ? (document as IncomingDocument).source || ''
    : typeof rawOutgoingSource === 'object' && rawOutgoingSource !== null
      ? rawOutgoingSource.name || ''
      : typeof rawOutgoingSource === 'string'
        ? rawOutgoingSource
        : '';

  const handleOpenFullPage = () => {
    onClose();
    if (isIncoming) {
      navigate(`/dashboard/incoming-documents/${document._id}`);
    } else {
      navigate(`/dashboard/outgoing-documents/${document._id}`);
    }
  };

  const highlightText = (text?: string, keyword?: string) => {
    if (!text) return 'لا يوجد نص مستخرج متاح لهذه الوثيقة.';
    if (!keyword || !keyword.trim()) return text;

    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === keyword.toLowerCase() ? (
            <mark key={index} className="bg-[#FFCB56] text-[#78350f] px-1 py-0.5 rounded font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="w-[95vw] sm:w-[90vw] sm:max-w-4xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-lg"
      >
        <DialogHeader className="pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] dark:text-sky-300 leading-normal">
                  معاينة الوثيقة
                </DialogTitle>
                <p className="text-base text-[#4a5568] dark:text-slate-400 leading-relaxed mt-1">
                  الرقم التسلسلي: <strong className="text-[#1a202c] dark:text-slate-100 tabular-nums"><bdi dir="ltr">#{document.serialNumber} / {document.year}</bdi></strong>
                </p>
              </div>
            </div>

            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-bold bg-[#FFCB56]/90 dark:bg-amber-950/60 text-[#1a202c] dark:text-amber-300 border border-[#FFD758] dark:border-amber-800/70 flex-shrink-0">
              {isIncoming ? 'وثيقة واردة' : 'وثيقة صادرة'}
            </span>
          </div>
        </DialogHeader>

        {/* Details Grid */}
        <div className="space-y-4">
          <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold text-[#1a202c] dark:text-slate-100 min-w-[80px]">الموضوع:</span>
              <span className="text-base text-[#2d3748] dark:text-slate-200 leading-relaxed font-medium">
                {highlightText(document.subject, highlightKeyword)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2 text-base text-[#2d3748] dark:text-slate-200">
                <Calendar className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                <span className="text-sm font-medium text-[#4a5568] dark:text-slate-400">التاريخ:</span>
                <span className="tabular-nums"><bdi dir="ltr">{docDate ? formatShortDate(docDate, '-') : '-'}</bdi></span>
              </div>

              {sourceName && (
                <div className="flex items-center gap-2 text-base text-[#2d3748] dark:text-slate-200">
                  <Building2 className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  <span className="text-sm font-medium text-[#4a5568] dark:text-slate-400">الجهة / المصدر:</span>
                  <span className="truncate">{sourceName}</span>
                </div>
              )}

              {document.typeDocument && (
                <div className="flex items-center gap-2 text-base text-[#2d3748] dark:text-slate-200">
                  <Layers className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  <span className="text-sm font-medium text-[#4a5568] dark:text-slate-400">نوع الوثيقة:</span>
                  <span>{document.typeDocument}</span>
                </div>
              )}

              {isIncoming && (document as IncomingDocument).responsibleUser && (
                <div className="flex items-center gap-2 text-base text-[#2d3748] dark:text-slate-200">
                  <User className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  <span className="text-sm font-medium text-[#4a5568] dark:text-slate-400">المسؤول:</span>
                  <span>
                    {typeof (document as IncomingDocument).responsibleUser === 'object'
                      ? ((document as IncomingDocument).responsibleUser as { username?: string }).username || '-'
                      : '-'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* OCR Extracted Text */}
          {document.ocrText && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1a202c] dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                النص المستخرج عبر القارئ الآلي (OCR)
              </h3>
              <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4 max-h-56 overflow-y-auto">
                <p className="text-base text-[#2d3748] dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {highlightText(document.ocrText, highlightKeyword)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-11 text-base font-medium px-6 rounded-lg border-slate-300 dark:border-slate-700 text-[#2d3748] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
          >
            إغلاق
          </Button>

          <Button
            type="button"
            onClick={handleOpenFullPage}
            className="w-full sm:w-auto h-11 text-base font-semibold px-7 rounded-lg bg-[#2c5282] hover:bg-[#234269] text-white flex items-center justify-center gap-2 transition-colors duration-150 shadow-none"
          >
            <span>عرض الصفحة الكاملة للوثيقة</span>
            <ExternalLink className="h-5 w-5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;
