import React from 'react';
import { FileText } from 'lucide-react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { formatLongDate } from '@/utils/formatDate';
import { useDirection } from '@/i18n/useDirection';
import { useLanguage } from '@/contexts/LanguageProvider';
import { EmptyState } from '@/components/ui/empty-state';

interface DocumentListProps {
  documents: (IncomingDocument | OutgoingDocument)[] | { incomingDocuments?: IncomingDocument[]; outgoingDocuments?: OutgoingDocument[] };
}

const DocumentList: React.FC<DocumentListProps> = ({ documents }) => {
  const { dir } = useDirection();
  const { language } = useLanguage();
  const isFr = language === 'fr';

  // Handle the case where documents is an object from getFolderDocuments API
  let documentArray: (IncomingDocument | OutgoingDocument)[] = [];
  
  if (Array.isArray(documents)) {
    documentArray = documents;
  } else if (documents && typeof documents === 'object') {
    // Handle API response format with separate arrays
    const { incomingDocuments = [], outgoingDocuments = [] } = documents;
    documentArray = [...incomingDocuments, ...outgoingDocuments];
  }

  if (!documentArray || documentArray.length === 0) {
    return (
      <EmptyState
        dir={dir}
        icon={<FileText className="h-5 w-5 text-[#2c5282] dark:text-sky-400" />}
        title={isFr ? 'Aucun document dans ce dossier' : 'لا توجد مستندات في هذا المجلد'}
        description={
          isFr
            ? 'Les courriers classés dans ce dossier apparaîtront ici.'
            : 'ستظهر هنا المراسلات المصنفة داخل هذا المجلد.'
        }
        className="py-8 rounded-xl bg-slate-50/50 dark:bg-slate-800/30"
      />
    );
  }

  const isIncomingDocument = (doc: IncomingDocument | OutgoingDocument): doc is IncomingDocument => {
    return 'arrivalDate' in doc;
  };

  return (
    <div className="space-y-2.5" dir={dir}>
      {documentArray.map((doc) => (
        <div
          key={doc._id}
          className="p-3.5 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                {doc.subject}
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                {isFr ? 'N° d’ordre : ' : 'الرقم التسلسلي: '}
                <bdi dir="ltr" className="font-medium">
                  {doc.serialNumber}/{doc.year}
                </bdi>
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                {isIncomingDocument(doc) ? (
                  <>
                    {isFr ? 'Date d’arrivée : ' : 'تاريخ الوصول: '}
                    <bdi dir={isFr ? 'ltr' : 'rtl'} className="tabular-nums">
                      {formatLongDate(doc.arrivalDate, isFr ? 'fr' : 'ar')}
                    </bdi>
                  </>
                ) : (
                  <>
                    {isFr ? 'Date d’émission : ' : 'تاريخ الإصدار: '}
                    <bdi dir={isFr ? 'ltr' : 'rtl'} className="tabular-nums">
                      {formatLongDate(doc.issueDate, isFr ? 'fr' : 'ar')}
                    </bdi>
                  </>
                )}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shrink-0">
              {isIncomingDocument(doc) ? (isFr ? 'Entrant' : 'وارد') : (isFr ? 'Sortant' : 'صادر')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentList;
