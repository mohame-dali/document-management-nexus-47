import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FolderOpen,
  FileText,
  FileInput,
  FileOutput,
  ExternalLink,
  Calendar,
  MessageSquare,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

import { PersonnelDocument } from '@/types/hr';
import { getMyDocuments } from '@/services/hr/personnelApi';
import { formatLongDate } from '@/utils/formatDate';
import { useDirection } from '@/i18n/useDirection';
import AssociationTypeBadge from './AssociationTypeBadge';
import { Button } from '@/components/ui/button';

interface MyDocumentsListProps {
  documents?: PersonnelDocument[];
  isLoading?: boolean;
}

export const MyDocumentsList: React.FC<MyDocumentsListProps> = ({
  documents: propDocuments,
  isLoading: propIsLoading,
}) => {
  const navigate = useNavigate();
  const { dir, isRTL } = useDirection();

  // If documents not passed as prop, fetch them autonomously
  const {
    data: fetchedDocuments = [],
    isLoading: isQueryLoading,
    isError,
    error,
    refetch
  } = useQuery<PersonnelDocument[]>({
    queryKey: ['hr', 'my-documents'],
    queryFn: getMyDocuments,
    enabled: propDocuments === undefined,
  });

  const documents = propDocuments !== undefined ? propDocuments : fetchedDocuments;
  const isLoading = propIsLoading !== undefined ? propIsLoading : isQueryLoading;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-lg p-8 text-center flex flex-col items-center justify-center gap-3" dir={dir}>
        <RefreshCw className="w-7 h-7 animate-spin text-[#2c5282] dark:text-blue-400" />
        <span className="text-base text-slate-600 dark:text-slate-300">جاري تحميل الوثائق المرتبطة...</span>
      </div>
    );
  }

  if (isError && propDocuments === undefined) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-lg p-6 text-center" dir={dir}>
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-base font-medium text-slate-900 dark:text-slate-100 mb-3">
          {error instanceof Error ? error.message : 'تعذر تحميل الوثائق المرتبطة'}
        </p>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="h-10 px-4 text-sm font-medium border-[#cbd5e1] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg"
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4" dir={dir}>
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#ebf4ff] dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#1a202c] dark:text-slate-100">
                الوثائق الإدارية والتدريبية (Formation et Stage)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f1f5f9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 tabular-nums">
                {documents.length}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
              قائمة الوثائق والمراسلات الإدارية والتكوينية المرتبطة بملفك الشخصي
            </p>
          </div>
        </div>
      </div>

      {/* Content section */}
      {documents.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-[#cbd5e1] dark:border-slate-700 rounded-lg bg-[#f8fafc] dark:bg-slate-950/40">
          <FileText className="w-12 h-12 text-slate-700 dark:text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            {isRTL ? 'لا توجد وثائق مرتبطة' : 'Aucun document associé'}
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 max-w-md mx-auto">
            لا توجد أي وثائق تدريبية أو إدارية أو شواهد مرتبطة بملفك المهني في الوقت الحالي.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#e2e8f0] dark:divide-slate-800 border border-[#e2e8f0] dark:border-slate-800 rounded-lg overflow-hidden">
          {documents.map((assoc) => {
            const doc = assoc.document;
            const isIncoming = assoc.documentType === 'IncomingDocument';
            
            // Primary path per specification: /dashboard/documents/incoming/:id or /dashboard/documents/outgoing/:id
            // (both alias and direct routes are supported in App.tsx)
            const targetUrl = isIncoming
              ? `/dashboard/documents/incoming/${assoc.documentId}`
              : `/dashboard/documents/outgoing/${assoc.documentId}`;

            const serialDisplay = doc?.serialNumber || '—';
            const yearDisplay = doc?.year || new Date().getFullYear();

            return (
              <div
                key={assoc._id}
                onClick={() => navigate(targetUrl)}
                className="p-4 sm:p-5 hover:bg-[#f8fafc] dark:hover:bg-slate-800/60 transition-colors duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[64px] cursor-pointer group"
              >
                {/* Right side in RTL: Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Incoming / Outgoing */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        isIncoming
                          ? 'bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8] dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/70'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/70'
                      }`}
                    >
                      {isIncoming ? <FileInput className="w-3.5 h-3.5" /> : <FileOutput className="w-3.5 h-3.5" />}
                      <span>{isIncoming ? 'مراسلة واردة' : 'مراسلة صادرة'}</span>
                    </span>

                    {/* Serial & Year */}
                    <span className="font-bold text-base text-[#1a202c] dark:text-slate-100 group-hover:text-[#2c5282] dark:group-hover:text-blue-300 flex items-center gap-1 font-mono tabular-nums">
                      <span>#{serialDisplay}</span>
                      <span className="text-slate-700 dark:text-slate-300">/</span>
                      <span>{yearDisplay}</span>
                    </span>

                    {/* Golden Association Type Badge */}
                    <AssociationTypeBadge type={assoc.typeAssociation} />
                  </div>

                  {/* Subject / Title */}
                  <div className="text-base font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#2c5282] dark:group-hover:text-blue-300 transition-colors line-clamp-1">
                    {doc?.subject || doc?.title || 'بدون موضوع'}
                  </div>

                  {/* Comment if exists */}
                  {assoc.commentaire && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-md px-2.5 py-1 max-w-2xl">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
                      <span>{assoc.commentaire}</span>
                    </div>
                  )}

                  {/* Association Date */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-300 pt-0.5 tabular-nums">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                      <span>تاريخ الربط: <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">{formatLongDate(assoc.dateAssociation || assoc.createdAt || '', isRTL ? 'ar' : 'fr')}</bdi></span>
                    </span>

                    {(doc?.entryDate || doc?.issueDate) && (
                      <span className="text-slate-700 dark:text-slate-300">
                        • تاريخ الوثيقة: <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">{formatLongDate(doc.entryDate || doc.issueDate, isRTL ? 'ar' : 'fr')}</bdi>
                      </span>
                    )}
                  </div>
                </div>

                {/* Left side in RTL: Action button */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 px-3.5 text-xs font-semibold text-[#2c5282] dark:text-blue-300 border-[#cbd5e1] dark:border-slate-700 dark:bg-slate-800 rounded-lg hover:bg-[#ebf4ff] dark:hover:bg-slate-700 hover:border-[#2c5282] flex items-center gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(targetUrl);
                    }}
                  >
                    <span>فتح الوثيقة</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyDocumentsList;
