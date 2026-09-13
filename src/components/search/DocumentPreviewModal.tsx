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

  const sourceName = isIncoming
    ? (document as IncomingDocument).source
    : typeof (document as OutgoingDocument).source === 'object'
      ? (document as OutgoingDocument).source.name
      : (document as OutgoingDocument).source;

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
        className="max-w-2xl bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader className="pb-4 border-b border-[#e2e8f0]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-[#1a202c] leading-normal">
                  معاينة الوثيقة
                </DialogTitle>
                <p className="text-base text-[#4a5568] leading-relaxed mt-1">
                  الرقم التسلسلي: #{document.serialNumber} / {document.year}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center px-3 py-1 rounded text-sm font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758] flex-shrink-0">
              {isIncoming ? 'وثيقة واردة' : 'وثيقة صادرة'}
            </span>
          </div>
        </DialogHeader>

        {/* Details Grid */}
        <div className="space-y-4">
          <div className="bg-[#f7fafc] border border-[#e2e8f0] rounded p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-base font-semibold text-[#1a202c] min-w-[80px]">الموضوع:</span>
              <span className="text-base text-[#2d3748] leading-relaxed font-medium">
                {highlightText(document.subject, highlightKeyword)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e2e8f0]">
              <div className="flex items-center gap-2 text-base text-[#2d3748]">
                <Calendar className="h-4 w-4 text-[#2c5282]" />
                <span className="text-sm font-medium text-[#4a5568]">التاريخ:</span>
                <span>{docDate ? new Date(docDate).toLocaleDateString('ar-TN') : '-'}</span>
              </div>

              {sourceName && (
                <div className="flex items-center gap-2 text-base text-[#2d3748]">
                  <Building2 className="h-4 w-4 text-[#2c5282]" />
                  <span className="text-sm font-medium text-[#4a5568]">الجهة / المصدر:</span>
                  <span className="truncate">{sourceName}</span>
                </div>
              )}

              {document.typeDocument && (
                <div className="flex items-center gap-2 text-base text-[#2d3748]">
                  <Layers className="h-4 w-4 text-[#2c5282]" />
                  <span className="text-sm font-medium text-[#4a5568]">نوع الوثيقة:</span>
                  <span>{document.typeDocument}</span>
                </div>
              )}

              {isIncoming && (document as IncomingDocument).responsibleUser && (
                <div className="flex items-center gap-2 text-base text-[#2d3748]">
                  <User className="h-4 w-4 text-[#2c5282]" />
                  <span className="text-sm font-medium text-[#4a5568]">المسؤول:</span>
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
              <h3 className="text-base font-semibold text-[#1a202c] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#2c5282]" />
                النص المستخرج عبر القارئ الآلي (OCR)
              </h3>
              <div className="bg-white border border-[#e2e8f0] rounded p-4 max-h-56 overflow-y-auto">
                <p className="text-base text-[#2d3748] leading-relaxed whitespace-pre-wrap">
                  {highlightText(document.ocrText, highlightKeyword)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto text-base font-medium px-5 py-2.5 rounded border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 transition-colors duration-200"
          >
            إغلاق
          </Button>

          <Button
            type="button"
            onClick={handleOpenFullPage}
            className="w-full sm:w-auto text-base font-medium px-6 py-2.5 rounded bg-[#2c5282] hover:bg-[#234269] text-white flex items-center justify-center gap-2 transition-colors duration-200"
          >
            <span>عرض الصفحة الكاملة للوثيقة</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;
