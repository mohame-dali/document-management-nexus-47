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
import { formatArabicDate } from '@/utils/arabicDateFormatter';
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
      <div className="bg-white border border-[#e2e8f0] rounded p-8 text-center flex flex-col items-center justify-center gap-3" dir="rtl">
        <RefreshCw className="w-7 h-7 animate-spin text-[#2c5282]" />
        <span className="text-base text-gray-600">جاري تحميل الوثائق المرتبطة...</span>
      </div>
    );
  }

  if (isError && propDocuments === undefined) {
    return (
      <div className="bg-white border border-red-200 rounded p-6 text-center" dir="rtl">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-base font-medium text-gray-900 mb-3">
          {error instanceof Error ? error.message : 'تعذر تحميل الوثائق المرتبطة'}
        </p>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="h-10 px-4 text-sm font-medium border-[#cbd5e1] rounded"
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-4" dir="rtl">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-[#ebf4ff] text-[#2c5282]">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#1a202c]">
                الوثائق الإدارية والتدريبية (Formation et Stage)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f1f5f9] text-gray-700">
                {documents.length}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              قائمة الوثائق والمراسلات الإدارية والتكوينية المرتبطة بملفك الشخصي
            </p>
          </div>
        </div>
      </div>

      {/* Content section */}
      {documents.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-[#cbd5e1] rounded bg-[#f8fafc]">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800 mb-1">
            Aucun document associé
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            لا توجد أي وثائق تدريبية أو إدارية أو شواهد مرتبطة بملفك المهني في الوقت الحالي.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#e2e8f0] border border-[#e2e8f0] rounded overflow-hidden">
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
                className="p-4 sm:p-5 hover:bg-[#f8fafc] transition-colors duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[64px] cursor-pointer group"
              >
                {/* Right side in RTL: Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Incoming / Outgoing */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                        isIncoming
                          ? 'bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isIncoming ? <FileInput className="w-3.5 h-3.5" /> : <FileOutput className="w-3.5 h-3.5" />}
                      <span>{isIncoming ? 'مراسلة واردة' : 'مراسلة صادرة'}</span>
                    </span>

                    {/* Serial & Year */}
                    <span className="font-bold text-base text-[#1a202c] group-hover:text-[#2c5282] flex items-center gap-1 font-mono">
                      <span>#{serialDisplay}</span>
                      <span className="text-gray-400">/</span>
                      <span>{yearDisplay}</span>
                    </span>

                    {/* Golden Association Type Badge */}
                    <AssociationTypeBadge type={assoc.typeAssociation} />
                  </div>

                  {/* Subject / Title */}
                  <div className="text-base font-semibold text-gray-800 group-hover:text-[#2c5282] transition-colors line-clamp-1">
                    {doc?.subject || doc?.title || 'بدون موضوع'}
                  </div>

                  {/* Comment if exists */}
                  {assoc.commentaire && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2.5 py-1 max-w-2xl">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{assoc.commentaire}</span>
                    </div>
                  )}

                  {/* Association Date */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>تاريخ الربط: {formatArabicDate(assoc.dateAssociation || assoc.createdAt || '')}</span>
                    </span>

                    {(doc?.entryDate || doc?.issueDate) && (
                      <span className="text-gray-400">
                        • تاريخ الوثيقة: {formatArabicDate(doc.entryDate || doc.issueDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Left side in RTL: Action button */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs font-semibold text-[#2c5282] border-[#cbd5e1] rounded hover:bg-[#ebf4ff] hover:border-[#2c5282] flex items-center gap-1.5"
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
