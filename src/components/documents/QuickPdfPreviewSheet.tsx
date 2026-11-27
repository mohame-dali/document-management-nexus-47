import React from 'react';
import { ExternalLink, FileText, Calendar } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import PDFViewer from '@/components/documents/PDFViewer';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { formatLongDate } from '@/utils/formatDate';
import type { IncomingDocument, OutgoingDocument } from '@/types';

type AnyDocument = IncomingDocument | OutgoingDocument;

interface QuickPdfPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: AnyDocument | null;
  direction: 'incoming' | 'outgoing';
  onOpenFullDetails?: (docId: string) => void;
}

const QuickPdfPreviewSheet: React.FC<QuickPdfPreviewSheetProps> = ({
  open,
  onOpenChange,
  document,
  direction,
  onOpenFullDetails,
}) => {
  const { t, language } = useLanguage();
  const { isRTL, dir } = useDirection();
  const isFr = language === 'fr';
  const isIncoming = direction === 'incoming';

  const docDate = isIncoming
    ? (document as IncomingDocument | null)?.arrivalDate
    : (document as OutgoingDocument | null)?.issueDate;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? 'left' : 'right'}
        dir={dir}
        className="w-[95vw] sm:max-w-2xl p-0 flex flex-col bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xl"
      >
        <SheetHeader className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 text-start shrink-0 space-y-2">
          <div className="flex items-start justify-between gap-3 pe-8">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  <span>
                    {isIncoming
                      ? t('documents.quickActions.previewIncomingTitle')
                      : t('documents.quickActions.previewOutgoingTitle')}
                  </span>
                  {document && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 tabular-nums">
                      <bdi dir="ltr">#{document.serialNumber} / {document.year}</bdi>
                    </span>
                  )}
                </SheetTitle>
                {document?.subject && (
                  <SheetDescription className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5">
                    {document.subject}
                  </SheetDescription>
                )}
              </div>
            </div>

            {document && onOpenFullDetails && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenFullDetails(document._id);
                }}
                className="h-8 px-2.5 text-xs font-semibold shrink-0 border-blue-200 dark:border-blue-800/70 text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                <ExternalLink className="h-3.5 w-3.5 me-1.5" />
                {t('documents.quickActions.openDetails')}
              </Button>
            )}
          </div>

          {docDate && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <bdi dir={isFr ? 'ltr' : 'rtl'}>
                {formatLongDate(docDate, isFr ? 'fr' : 'ar')}
              </bdi>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950 p-3 sm:p-4">
          {document?.scannedDocument ? (
            <PDFViewer documentPath={document.scannedDocument} expanded />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-600 dark:text-slate-300">
              <FileText className="h-10 w-10 mb-2 opacity-60" />
              <p className="text-sm font-medium">
                {isFr ? 'Aucune pièce jointe PDF disponible' : 'لا يوجد ملف PDF مرفق بهذه الوثيقة'}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickPdfPreviewSheet;
