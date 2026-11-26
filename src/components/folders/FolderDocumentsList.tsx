import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, 
  Eye, 
  Download,
  Calendar,
  FileText,
  Inbox,
  Send,
  Building,
  UserCheck
} from 'lucide-react';
import { getFolderDocuments } from '@/services/folderService';
import { downloadDocument } from '@/services/documentService';
import { Folder, IncomingDocument, OutgoingDocument } from '@/types';
import { formatLongDate } from '@/utils/formatDate';
import { useNavigate } from 'react-router-dom';

interface FolderDocumentsListProps {
  selectedFolder: Folder | null;
  canManage: boolean;
  isModal?: boolean;
}

export const FolderDocumentsList: React.FC<FolderDocumentsListProps> = ({
  selectedFolder,
  canManage,
  isModal = false
}) => {
  const navigate = useNavigate();

  const { data: folderDocuments, isLoading } = useQuery({
    queryKey: ['folderDocuments', selectedFolder?._id],
    queryFn: () => getFolderDocuments(selectedFolder!._id),
    enabled: !!selectedFolder,
  });

  const handleViewDocument = (documentId: string, type: 'incoming' | 'outgoing') => {
    navigate(`/dashboard/${type}-documents/${documentId}`);
  };

  const handleDownload = async (scannedDocument: string, serialNumber: number, year: number, type: string) => {
    if (scannedDocument) {
      try {
        await downloadDocument(scannedDocument, `${type}-document-${serialNumber}-${year}.pdf`);
      } catch (error) {
        console.error('Error downloading document:', error);
      }
    }
  };

  if (!selectedFolder) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-8 sm:p-12 text-center shadow-sm" dir="rtl">
        <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-700 dark:text-slate-300">
          <FolderOpen className="h-8 w-8" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-[#1a202c] dark:text-slate-100 mb-2">اختر مجلداً لعرض محتواه</h3>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
          انقر على أي مجلد في الشجرة الهرمية لعرض المستندات الواردة والصادرة المصنفة به
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-12 text-center shadow-sm" dir="rtl">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c5282] dark:border-sky-400 mx-auto mb-3"></div>
        <p className="text-base text-slate-700 dark:text-slate-300 font-medium">جاري تحميل مستندات المجلد...</p>
      </div>
    );
  }

  const incomingDocuments = folderDocuments?.incomingDocuments || [];
  const outgoingDocuments = folderDocuments?.outgoingDocuments || [];
  const totalDocuments = incomingDocuments.length + outgoingDocuments.length;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Folder Header - When not modal */}
      {!isModal && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-[#2c5282]/10 dark:bg-sky-900/40 flex items-center justify-center text-[#2c5282] dark:text-sky-300 shrink-0 border border-[#2c5282]/20 dark:border-sky-800/60">
              <FolderOpen className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-[#1a202c] dark:text-slate-100">
                  {selectedFolder.name}
                </h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                  selectedFolder.status === 'En cours'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}>
                  {selectedFolder.status === 'En cours' ? 'نشط' : 'مغلق'}
                </span>
              </div>
              {selectedFolder.description && (
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">{selectedFolder.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70 shadow-2xs tabular-nums">
              <FileText className="h-5 w-5" />
              <span>{totalDocuments} مستند محفوظ</span>
            </span>
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-[#2c5282] dark:border-t-sky-500 rounded-lg p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 flex items-center justify-center text-[#2c5282] dark:text-blue-300 shrink-0 border border-blue-200/70 dark:border-blue-800/60">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block">المستندات الواردة</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{incomingDocuments.length}</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-blue-50/90 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70">
            وارد
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-emerald-500 dark:border-t-emerald-400 rounded-lg p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0 border border-emerald-200/70 dark:border-emerald-800/60">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block">المستندات الصادرة</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{outgoingDocuments.length}</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
            صادر
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-amber-500 dark:border-t-amber-400 rounded-lg p-4 sm:p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 border border-amber-200/70 dark:border-amber-800/60">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block">إجمالي المستندات</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{totalDocuments}</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
            المجموع
          </span>
        </div>
      </div>

      {/* Two-column view: Incoming & Outgoing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Column */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 sm:p-5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Inbox className="h-6 w-6 text-[#2c5282] dark:text-sky-400" />
              <span className="font-bold text-base sm:text-lg text-[#2c5282] dark:text-sky-300">المراسلات والوثائق الواردة</span>
            </div>
            <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-blue-50/90 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70 shadow-2xs tabular-nums">
              {incomingDocuments.length}
            </span>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            {incomingDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-700 dark:text-slate-300 space-y-2">
                <Inbox className="h-12 w-12 mx-auto opacity-30 text-slate-700 dark:text-slate-300" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">لا توجد مستندات واردة في هذا المجلد</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 pl-1 custom-scrollbar">
                {incomingDocuments.map((doc: IncomingDocument) => (
                  <div 
                    key={doc._id} 
                    className="p-4 bg-white dark:bg-slate-900/90 hover:bg-slate-50/90 dark:hover:bg-slate-800/70 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-150 shadow-2xs flex flex-col justify-between gap-3 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-[#2c5282] dark:text-sky-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs tabular-nums">
                        #{doc.serialNumber}/{doc.year}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium tabular-nums">
                        <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
                        <bdi dir="rtl">{formatLongDate(doc.arrivalDate, 'ar')}</bdi>
                      </span>
                    </div>

                    <h4 
                      className="font-bold text-sm sm:text-base text-[#1a202c] dark:text-slate-100 line-clamp-2 leading-relaxed break-words text-ellipsis overflow-hidden"
                      title={doc.subject}
                    >
                      {doc.subject}
                    </h4>

                    {doc.source && (
                      <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 min-w-0">
                        <Building className="h-4 w-4 text-[#2c5282] dark:text-sky-400 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 shrink-0">الجهة المصدرة:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-bold truncate">{doc.source}</span>
                      </div>
                    )}

                    <div className="flex flex-row items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto w-full">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc._id, 'incoming')}
                        className="flex-1 h-8 px-3 text-xs rounded-lg border border-[#2c5282] dark:border-sky-600 text-[#2c5282] dark:text-sky-300 hover:bg-[#2c5282] hover:text-white dark:hover:bg-sky-700 dark:hover:text-white transition-colors duration-150 flex items-center justify-center gap-1.5 font-semibold shadow-2xs"
                        title="عرض المستند"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>عرض</span>
                      </button>
                      {doc.scannedDocument && (
                        <button
                          type="button"
                          onClick={() => handleDownload(doc.scannedDocument!, doc.serialNumber, doc.year, 'incoming')}
                          className="flex-1 h-8 px-3 text-xs rounded-lg border border-[#FFD758] bg-[#FFCB56] text-[#78350f] hover:bg-[#FFD758] transition-colors duration-150 flex items-center justify-center gap-1.5 font-semibold shadow-2xs"
                          title="تحميل الملف الممسوح"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>تحميل</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Outgoing Column */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 sm:p-5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
              <span className="font-bold text-base sm:text-lg text-emerald-800 dark:text-emerald-300">المراسلات والوثائق الصادرة</span>
            </div>
            <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70 shadow-2xs tabular-nums">
              {outgoingDocuments.length}
            </span>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            {outgoingDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-700 dark:text-slate-300 space-y-2">
                <Send className="h-12 w-12 mx-auto opacity-30 text-slate-700 dark:text-slate-300" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">لا توجد مستندات صادرة في هذا المجلد</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 pl-1 custom-scrollbar">
                {outgoingDocuments.map((doc: OutgoingDocument) => (
                  <div 
                    key={doc._id} 
                    className="p-4 bg-white dark:bg-slate-900/90 hover:bg-slate-50/90 dark:hover:bg-slate-800/70 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-150 shadow-2xs flex flex-col justify-between gap-3 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs tabular-nums">
                        #{doc.serialNumber}/{doc.year}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium tabular-nums">
                        <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
                        <bdi dir="rtl">{formatLongDate(doc.issueDate, 'ar')}</bdi>
                      </span>
                    </div>

                    <h4 
                      className="font-bold text-sm sm:text-base text-[#1a202c] dark:text-slate-100 line-clamp-2 leading-relaxed break-words text-ellipsis overflow-hidden"
                      title={doc.subject}
                    >
                      {doc.subject}
                    </h4>

                    {doc.assignedTo && doc.assignedTo.length > 0 && (
                      <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 min-w-0">
                        <UserCheck className="h-4 w-4 text-[#2c5282] dark:text-sky-400 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 shrink-0">الجهة الموجه إليها:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-bold truncate">{doc.assignedTo.join(', ')}</span>
                      </div>
                    )}

                    <div className="flex flex-row items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto w-full">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc._id, 'outgoing')}
                        className="flex-1 h-8 px-3 text-xs rounded-lg border border-emerald-700 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-700 hover:text-white dark:hover:bg-emerald-700 dark:hover:text-white transition-colors duration-150 flex items-center justify-center gap-1.5 font-semibold shadow-2xs"
                        title="عرض المستند"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>عرض</span>
                      </button>
                      {doc.scannedDocument && (
                        <button
                          type="button"
                          onClick={() => handleDownload(doc.scannedDocument!, doc.serialNumber, doc.year, 'outgoing')}
                          className="flex-1 h-8 px-3 text-xs rounded-lg border border-[#FFD758] bg-[#FFCB56] text-[#78350f] hover:bg-[#FFD758] transition-colors duration-150 flex items-center justify-center gap-1.5 font-semibold shadow-2xs"
                          title="تحميل الملف الممسوح"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>تحميل</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderDocumentsList;
