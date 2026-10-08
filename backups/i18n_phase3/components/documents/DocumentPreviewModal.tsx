import { Dialog, DialogContent, DialogHeader, 
         DialogTitle, DialogDescription, 
         DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PDFViewer from './PDFViewer';
import type { IncomingDocument, OutgoingDocument } from '@/types';

type AnyDocument = IncomingDocument | OutgoingDocument;

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  document: AnyDocument | null;
  direction: 'incoming' | 'outgoing';
}

const DocumentPreviewModal = ({
  open,
  onClose,
  document,
  direction,
}: DocumentPreviewModalProps) => {
  const isIncoming = direction === 'incoming';
  const title = isIncoming 
    ? 'معاينة الوثيقة الواردة' 
    : 'معاينة الوثيقة الصادرة';

  const docDate = isIncoming
    ? (document as IncomingDocument)?.arrivalDate
    : (document as OutgoingDocument)?.issueDate;

  const hasAttachment = Boolean(document?.scannedDocument);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white 
                   max-h-[92vh] flex flex-col rounded-lg"
        dir="rtl"
      >
        {/* HEADER */}
        <DialogHeader className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg font-bold text-[#2c5282] flex items-center gap-2">
              <span>{title}</span>
              {document && (
                <span className="text-xs font-semibold px-2.5 py-0.5 
                                 rounded bg-blue-100 text-[#2c5282]">
                  #{document.serialNumber} / {document.year}
                </span>
              )}
            </DialogTitle>
          </div>
          {document?.subject && (
            <DialogDescription className="text-sm text-slate-700 
                                         font-medium text-right 
                                         line-clamp-2 mt-1">
              {document.subject}
            </DialogDescription>
          )}
          {docDate && (
            <p className="text-xs text-slate-500 mt-1">
              📅 {new Date(docDate).toLocaleDateString('ar-TN')}
            </p>
          )}
        </DialogHeader>

        {/* BODY */}
        <div className="p-4 overflow-y-auto flex-1">
          {hasAttachment ? (
            <PDFViewer documentPath={document?.scannedDocument} />
          ) : (
            <div className="flex flex-col items-center justify-center 
                            py-12 text-slate-500">
              <span className="text-4xl mb-3">📄</span>
              <p className="text-sm font-medium">
                لا يوجد ملف مرفق بهذه الوثيقة
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-3 bg-slate-50 border-t 
                                 border-slate-200 flex justify-end">
          <Button variant="outline" onClick={onClose} className="px-5">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;
