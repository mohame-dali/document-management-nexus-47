import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  FolderOpen, 
  FileText, 
  Search, 
  Calendar, 
  Tag, 
  Inbox, 
  Send, 
  ArrowRight,
  CheckCircle2,
  FolderPlus,
  Building,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, IncomingDocument, OutgoingDocument } from '@/types';
import { assignDocumentToFolder } from '@/services/folderService';
import { getIncomingDocumentsList, getOutgoingDocumentsList } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface DocumentCategoryManagerProps {
  folders: Folder[];
  canManage: boolean;
  departmentId?: string;
}

const DocumentCategoryManager: React.FC<DocumentCategoryManagerProps> = ({
  folders,
  canManage,
  departmentId
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargetFolderId, setSelectedTargetFolderId] = useState<string>('');
  
  const targetDepartmentId = departmentId || currentUser?.activeDepartment?._id;

  // Fetch incoming & outgoing documents
  const { data: incomingDocs, isLoading: isLoadingIncoming } = useQuery({
    queryKey: ['incomingDocuments', targetDepartmentId],
    queryFn: () => getIncomingDocumentsList({}),
    enabled: !!targetDepartmentId,
  });

  const { data: outgoingDocs, isLoading: isLoadingOutgoing } = useQuery({
    queryKey: ['outgoingDocuments', targetDepartmentId],
    queryFn: () => getOutgoingDocumentsList({}),
    enabled: !!targetDepartmentId,
  });

  const assignMutation = useMutation({
    mutationFn: ({ documentId, folderId, type }: { 
      documentId: string; 
      folderId: string | null; 
      type: 'incoming' | 'outgoing';
    }) => assignDocumentToFolder(documentId, folderId, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folderDocuments'] });
      toast.success(variables.folderId ? 'تم تصنيف المستند في المجلد بنجاح' : 'تمت إزالة المستند من المجلد');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في تصنيف المستند');
    }
  });

  const handleDocumentAssign = (documentId: string, folderId: string | null, type: 'incoming' | 'outgoing') => {
    if (!canManage) return;
    assignMutation.mutate({ documentId, folderId, type });
  };

  // Filter unclassified documents
  const unclassifiedIncoming = (incomingDocs || []).filter(doc => !doc.folder);
  const classifiedIncoming = (incomingDocs || []).filter(doc => !!doc.folder);

  const unclassifiedOutgoing = (outgoingDocs || []).filter(doc => !doc.folder);
  const classifiedOutgoing = (outgoingDocs || []).filter(doc => !!doc.folder);

  const currentUnclassified = activeTab === 'incoming' ? unclassifiedIncoming : unclassifiedOutgoing;

  const filteredDocuments = currentUnclassified.filter(doc => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      doc.subject?.toLowerCase().includes(term) ||
      doc.serialNumber?.toString().includes(term) ||
      ('source' in doc && (doc as IncomingDocument).source?.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header and Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <span className="text-[11px] text-gray-500 block mb-0.5">وارد غير مصنف</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#2c5282]">{unclassifiedIncoming.length}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
              مراسلة
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <span className="text-[11px] text-gray-500 block mb-0.5">صادر غير مصنف</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-700">{unclassifiedOutgoing.length}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              مراسلة
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <span className="text-[11px] text-gray-500 block mb-0.5">إجمالي غير المصنف</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#78350f]">
              {unclassifiedIncoming.length + unclassifiedOutgoing.length}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
              قيد التصنيف
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <span className="text-[11px] text-gray-500 block mb-0.5">المجلدات المتاحة</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#1a202c]">{folders.length}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              مجلد
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden">
        {/* Navigation Bar */}
        <div className="p-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('incoming')}
              className={`h-8 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors duration-200 ${
                activeTab === 'incoming'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#cbd5e1]'
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>المراسلات الواردة ({unclassifiedIncoming.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('outgoing')}
              className={`h-8 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors duration-200 ${
                activeTab === 'outgoing'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#cbd5e1]'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>المراسلات الصادرة ({unclassifiedOutgoing.length})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="البحث في المراسلات غير المصنفة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pr-8 pl-3 text-xs bg-white border-[#cbd5e1] rounded"
            />
          </div>
        </div>

        {/* Global Target Folder Selector for quick assignment */}
        {canManage && folders.length > 0 && (
          <div className="p-3 bg-amber-50/40 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-[#78350f]">
              <FolderPlus className="h-4 w-4 text-[#d97706]" />
              <span className="font-semibold">تحديد مجلد الهدف للتصنيف السريع:</span>
            </div>

            <div className="flex items-center gap-2 flex-1 sm:max-w-md">
              <select
                value={selectedTargetFolderId}
                onChange={(e) => setSelectedTargetFolderId(e.target.value)}
                className="h-8 px-2.5 text-xs bg-white border border-[#FFCB56] rounded text-[#1a202c] flex-1 focus:outline-none focus:ring-1 focus:ring-[#2c5282]"
              >
                <option value="">-- اختر مجلداً من القائمة --</option>
                {folders.map(folder => (
                  <option key={folder._id} value={folder._id}>
                    {folder.parent ? `↳ ${folder.name}` : folder.name} {folder.status === 'Fermé' ? '(مغلق)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* List of Uncategorized Documents */}
        <div className="p-4">
          {isLoadingIncoming || isLoadingOutgoing ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#2c5282] mx-auto mb-2"></div>
              <p className="text-xs">جاري تحميل المستندات غير المصنفة...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 opacity-80" />
              <p className="text-sm font-semibold text-gray-700">
                {searchTerm ? 'لا توجد مراسلات مطابقة لمعايير البحث' : 'ممتاز! جميع المراسلات في هذا القسم مصنفة في مجلدات'}
              </p>
              <p className="text-xs text-gray-400">
                يمكنك مراجعة المجلدات وتصفح مستنداتها من خلال تبويب شجرة المجلدات
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredDocuments.map(doc => {
                const date = activeTab === 'incoming' 
                  ? (doc as IncomingDocument).arrivalDate 
                  : (doc as OutgoingDocument).issueDate;
                
                const isIncoming = activeTab === 'incoming';

                return (
                  <div
                    key={doc._id}
                    className="p-3 bg-white hover:bg-[#f8fafc] rounded border border-[#e2e8f0] hover:border-[#cbd5e1] transition-colors duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          isIncoming 
                            ? 'bg-blue-50 text-[#2c5282] border-blue-200' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          #{doc.serialNumber}/{doc.year}
                        </span>

                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {formatArabicDate(date)}
                        </span>

                        {'source' in doc && (doc as IncomingDocument).source && (
                          <span className="text-[11px] text-gray-600 flex items-center gap-1">
                            <Building className="h-3 w-3 text-gray-400" />
                            {(doc as IncomingDocument).source}
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-xs text-[#1a202c] line-clamp-1 leading-relaxed">
                        {doc.subject}
                      </h4>
                    </div>

                    {/* Assignment Controls */}
                    {canManage && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {selectedTargetFolderId && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDocumentAssign(doc._id, selectedTargetFolderId, activeTab)}
                            disabled={assignMutation.isPending}
                            className="h-7 px-3 text-xs rounded border border-[#FFCB56] bg-[#FFD758]/20 text-[#78350f] hover:bg-[#FFD758]/40 font-medium flex items-center gap-1 transition-colors duration-200"
                          >
                            <Check className="h-3 w-3" />
                            <span>تصنيف في المجلد المحدد</span>
                          </Button>
                        )}

                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleDocumentAssign(doc._id, e.target.value, activeTab);
                            }
                          }}
                          disabled={assignMutation.isPending}
                          className="h-7 px-2 text-xs bg-white border border-[#cbd5e1] rounded text-gray-700 hover:border-[#2c5282] focus:outline-none"
                        >
                          <option value="">نقل إلى مجلد...</option>
                          {folders.map(f => (
                            <option key={f._id} value={f._id}>
                              {f.name} {f.status === 'Fermé' ? '(مغلق)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentCategoryManager;
