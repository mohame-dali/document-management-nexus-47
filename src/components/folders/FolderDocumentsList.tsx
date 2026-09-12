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
      <div className="bg-white border border-[#e2e8f0] rounded p-8 text-center" dir="rtl">
        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
          <FolderOpen className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-[#1a202c] mb-1">اختر مجلداً لعرض محتواه</h3>
        <p className="text-xs text-gray-500">انقر على أي مجلد في الشجرة لعرض المستندات الواردة والصادرة المصنفة به</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded p-8 text-center" dir="rtl">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#2c5282] mx-auto mb-3"></div>
        <p className="text-xs text-gray-500">جاري تحميل مستندات المجلد...</p>
      </div>
    );
  }

  const incomingDocuments = folderDocuments?.incomingDocuments || [];
  const outgoingDocuments = folderDocuments?.outgoingDocuments || [];
  const totalDocuments = incomingDocuments.length + outgoingDocuments.length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Folder Header - When not modal */}
      {!isModal && (
        <div className="bg-white border border-[#e2e8f0] rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1a202c] flex items-center gap-2">
                {selectedFolder.name}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                  selectedFolder.status === 'En cours'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {selectedFolder.status === 'En cours' ? 'نشط' : 'مغلق'}
                </span>
              </h3>
              {selectedFolder.description && (
                <p className="text-xs text-gray-500 mt-0.5">{selectedFolder.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
              <FileText className="h-3.5 w-3.5" />
              {totalDocuments} مستند محفوظ
            </span>
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-[#2c5282]">
              <Inbox className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block">المستندات الواردة</span>
              <span className="text-base font-bold text-[#1a202c]">{incomingDocuments.length}</span>
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
            وارد
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block">المستندات الصادرة</span>
              <span className="text-base font-bold text-[#1a202c]">{outgoingDocuments.length}</span>
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            صادر
          </span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-[#78350f]">
              <FileText className="h-4 w-4 text-[#d97706]" />
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block">إجمالي المستندات</span>
              <span className="text-base font-bold text-[#1a202c]">{totalDocuments}</span>
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
            المجموع
          </span>
        </div>
      </div>

      {/* Two-column view: Incoming & Outgoing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Incoming Column */}
        <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden">
          <div className="p-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-[#2c5282]" />
              <span className="font-bold text-xs text-[#2c5282]">المراسلات والوثائق الواردة</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
              {incomingDocuments.length}
            </span>
          </div>

          <div className="p-3">
            {incomingDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">لا توجد مستندات واردة في هذا المجلد</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {incomingDocuments.map((doc: IncomingDocument) => (
                  <div 
                    key={doc._id} 
                    className="p-3 bg-white hover:bg-[#f8fafc] rounded border border-[#e2e8f0] hover:border-[#cbd5e1] transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f1f5f9] text-[#2c5282] border border-[#cbd5e1]">
                          #{doc.serialNumber}/{doc.year}
                        </span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {formatArabicDate(doc.arrivalDate)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc._id, 'incoming')}
                          className="h-6 px-2 text-[11px] rounded border border-[#2c5282] text-[#2c5282] hover:bg-[#2c5282] hover:text-white transition-colors duration-200 flex items-center gap-1"
                          title="عرض المستند"
                        >
                          <Eye className="h-3 w-3" />
                          <span>عرض</span>
                        </button>
                        {doc.scannedDocument && (
                          <button
                            type="button"
                            onClick={() => handleDownload(doc.scannedDocument!, doc.serialNumber, doc.year, 'incoming')}
                            className="h-6 px-2 text-[11px] rounded border border-[#FFCB56] bg-[#FFD758]/15 text-[#78350f] hover:bg-[#FFD758]/30 transition-colors duration-200 flex items-center gap-1 font-medium"
                            title="تحميل الملف الممسوح"
                          >
                            <Download className="h-3 w-3" />
                            <span>تحميل</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-semibold text-xs text-[#1a202c] mb-1 line-clamp-2 leading-relaxed">
                      {doc.subject}
                    </h4>

                    {doc.source && (
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                        <Building className="h-3 w-3 text-gray-400" />
                        <span>الجهة المصدرة:</span>
                        <span className="text-gray-700 font-medium">{doc.source}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Outgoing Column */}
        <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden">
          <div className="p-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-700" />
              <span className="font-bold text-xs text-emerald-800">المراسلات والوثائق الصادرة</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {outgoingDocuments.length}
            </span>
          </div>

          <div className="p-3">
            {outgoingDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Send className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">لا توجد مستندات صادرة في هذا المجلد</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {outgoingDocuments.map((doc: OutgoingDocument) => (
                  <div 
                    key={doc._id} 
                    className="p-3 bg-white hover:bg-[#f8fafc] rounded border border-[#e2e8f0] hover:border-[#cbd5e1] transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f1f5f9] text-emerald-800 border border-[#cbd5e1]">
                          #{doc.serialNumber}/{doc.year}
                        </span>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {formatArabicDate(doc.issueDate)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(doc._id, 'outgoing')}
                          className="h-6 px-2 text-[11px] rounded border border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white transition-colors duration-200 flex items-center gap-1"
                          title="عرض المستند"
                        >
                          <Eye className="h-3 w-3" />
                          <span>عرض</span>
                        </button>
                        {doc.scannedDocument && (
                          <button
                            type="button"
                            onClick={() => handleDownload(doc.scannedDocument!, doc.serialNumber, doc.year, 'outgoing')}
                            className="h-6 px-2 text-[11px] rounded border border-[#FFCB56] bg-[#FFD758]/15 text-[#78350f] hover:bg-[#FFD758]/30 transition-colors duration-200 flex items-center gap-1 font-medium"
                            title="تحميل الملف الممسوح"
                          >
                            <Download className="h-3 w-3" />
                            <span>تحميل</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-semibold text-xs text-[#1a202c] mb-1 line-clamp-2 leading-relaxed">
                      {doc.subject}
                    </h4>

                    {doc.assignedTo && doc.assignedTo.length > 0 && (
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                        <UserCheck className="h-3 w-3 text-gray-400" />
                        <span>الجهة الموجه إليها:</span>
                        <span className="text-gray-700 font-medium">{doc.assignedTo.join(', ')}</span>
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
