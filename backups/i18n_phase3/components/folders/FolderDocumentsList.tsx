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
import { formatArabicDate } from '@/utils/arabicDateFormatter';
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
      <div className="bg-white border border-[#e2e8f0] rounded p-8 sm:p-12 text-center shadow-xs" dir="rtl">
        <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
          <FolderOpen className="h-8 w-8" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-[#1a202c] mb-2">اختر مجلداً لعرض محتواه</h3>
        <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-md mx-auto">
          انقر على أي مجلد في الشجرة الهرمية لعرض المستندات الواردة والصادرة المصنفة به
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded p-12 text-center shadow-xs" dir="rtl">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c5282] mx-auto mb-3"></div>
        <p className="text-base text-gray-600 font-medium">جاري تحميل مستندات المجلد...</p>
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
        <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0 border border-[#2c5282]/20">
              <FolderOpen className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-[#1a202c]">
                  {selectedFolder.name}
                </h3>
                <span className={`inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-bold ${
                  selectedFolder.status === 'En cours'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {selectedFolder.status === 'En cours' ? 'نشط' : 'مغلق'}
                </span>
              </div>
              {selectedFolder.description && (
                <p className="text-sm sm:text-base text-gray-600 mt-1.5 leading-relaxed">{selectedFolder.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded text-base font-bold bg-[#FFCB56] text-[#78350f] border border-[#FFD758] shadow-xs">
              <FileText className="h-5 w-5" />
              <span>{totalDocuments} مستند محفوظ</span>
            </span>
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded bg-blue-50 flex items-center justify-center text-[#2c5282] shrink-0 border border-blue-200">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-gray-600 block">المستندات الواردة</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{incomingDocuments.length}</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded text-xs sm:text-sm font-bold bg-blue-50 text-[#2c5282] border border-blue-200">
            وارد
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0 border border-emerald-200">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-gray-600 block">المستندات الصادرة</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{outgoingDocuments.length}</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            صادر
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded bg-amber-50 flex items-center justify-center text-[#d97706] shrink-0 border border-amber-200">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-semibold text-gray-600 block">إجمالي المستندات</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{totalDocuments}</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded text-xs sm:text-sm font-bold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
            المجموع
          </span>
        </div>
      </div>

      {/* Two-column view: Incoming & Outgoing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Incoming Column */}
        <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Inbox className="h-6 w-6 text-[#2c5282]" />
              <span className="font-bold text-base sm:text-lg text-[#2c5282]">المراسلات والوثائق الواردة</span>
            </div>
            <span className="px-3.5 py-1 rounded text-xs sm:text-sm font-bold bg-blue-50 text-[#2c5282] border border-blue-200 shadow-2xs">
              {incomingDocuments.length}
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {incomingDocuments.length === 0 ? (
              <div className="text-center py-12 text-gray-400 space-y-2">
                <Inbox className="h-12 w-12 mx-auto opacity-30 text-gray-400" />
                <p className="text-base font-semibold text-gray-600">لا توجد مستندات واردة في هذا المجلد</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 pl-1 custom-scrollbar">
                {incomingDocuments.map((doc: IncomingDocument) => (
                  <div 
                    key={doc._id} 
                    className="p-4 sm:p-5 bg-white hover:bg-[#f8fafc] rounded border border-[#e2e8f0] hover:border-[#cbd5e1] transition-colors duration-200 min-h-[64px] shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded text-xs sm:text-sm font-bold bg-[#f1f5f9] text-[#2c5282] border border-[#cbd5e1] shadow-2xs">
                          #{doc.serialNumber}/{doc.year}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 font-medium">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {formatArabicDate(doc.arrivalDate)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc._id, 'incoming')}
                          className="h-9 min-h-[36px] px-3.5 text-xs sm:text-sm rounded border border-[#2c5282] text-[#2c5282] hover:bg-[#2c5282] hover:text-white transition-colors duration-200 flex items-center gap-1.5 font-bold shadow-2xs"
                          title="عرض المستند"
                        >
                          <Eye className="h-4 w-4" />
                          <span>عرض</span>
                        </button>
                        {doc.scannedDocument && (
                          <button
                            type="button"
                            onClick={() => handleDownload(doc.scannedDocument!, doc.serialNumber, doc.year, 'incoming')}
                            className="h-9 min-h-[36px] px-3.5 text-xs sm:text-sm rounded border border-[#FFD758] bg-[#FFCB56] text-[#78350f] hover:bg-[#FFD758] transition-colors duration-200 flex items-center gap-1.5 font-bold shadow-2xs"
                            title="تحميل الملف الممسوح"
                          >
                            <Download className="h-4 w-4" />
                            <span>تحميل</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-base sm:text-lg text-[#1a202c] line-clamp-2 leading-relaxed">
                      {doc.subject}
                    </h4>

                    {doc.source && (
                      <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 pt-1 border-t border-gray-100">
                        <Building className="h-4 w-4 text-[#2c5282]" />
                        <span>الجهة المصدرة:</span>
                        <span className="text-gray-900 font-bold">{doc.source}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Outgoing Column */}
        <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="h-6 w-6 text-emerald-700" />
              <span className="font-bold text-base sm:text-lg text-emerald-800">المراسلات والوثائق الصادرة</span>
            </div>
            <span className="px-3.5 py-1 rounded text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              {outgoingDocuments.length}
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {outgoingDocuments.length === 0 ? (
              <div className="text-center py-12 text-gray-400 space-y-2">
                <Send className="h-12 w-12 mx-auto opacity-30 text-gray-400" />
                <p className="text-base font-semibold text-gray-600">لا توجد مستندات صادرة في هذا المجلد</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1 pl-1 custom-scrollbar">
                {outgoingDocuments.map((doc: OutgoingDocument) => (
                  <div 
                    key={doc._id} 
                    className="p-4 sm:p-5 bg-white hover:bg-[#f8fafc] rounded border border-[#e2e8f0] hover:border-[#cbd5e1] transition-colors duration-200 min-h-[64px] shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded text-xs sm:text-sm font-bold bg-[#f1f5f9] text-emerald-800 border border-[#cbd5e1] shadow-2xs">
                          #{doc.serialNumber}/{doc.year}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 font-medium">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {formatArabicDate(doc.issueDate)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc._id, 'outgoing')}
                          className="h-9 min-h-[36px] px-3.5 text-xs sm:text-sm rounded border border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white transition-colors duration-200 flex items-center gap-1.5 font-bold shadow-2xs"
                          title="عرض المستند"
                        >
                          <Eye className="h-4 w-4" />
                          <span>عرض</span>
                        </button>
                        {doc.scannedDocument && (
                          <button
                            type="button"
                            onClick={() => handleDownload(doc.scannedDocument!, doc.serialNumber, doc.year, 'outgoing')}
                            className="h-9 min-h-[36px] px-3.5 text-xs sm:text-sm rounded border border-[#FFD758] bg-[#FFCB56] text-[#78350f] hover:bg-[#FFD758] transition-colors duration-200 flex items-center gap-1.5 font-bold shadow-2xs"
                            title="تحميل الملف الممسوح"
                          >
                            <Download className="h-4 w-4" />
                            <span>تحميل</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-base sm:text-lg text-[#1a202c] line-clamp-2 leading-relaxed">
                      {doc.subject}
                    </h4>

                    {doc.assignedTo && doc.assignedTo.length > 0 && (
                      <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 pt-1 border-t border-gray-100">
                        <UserCheck className="h-4 w-4 text-[#2c5282]" />
                        <span>الجهة الموجه إليها:</span>
                        <span className="text-gray-900 font-bold">{doc.assignedTo.join(', ')}</span>
                      </div>
                    )}
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
