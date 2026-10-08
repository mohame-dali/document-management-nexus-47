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
    <div className="space-y-5" dir="rtl">
      {/* Header and Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 shadow-xs space-y-2">
          <span className="text-xs sm:text-sm font-semibold text-gray-600 block">وارد غير مصنف</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#2c5282]">{unclassifiedIncoming.length}</span>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-[#2c5282] border border-blue-200">
              مراسلة
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 shadow-xs space-y-2">
          <span className="text-xs sm:text-sm font-semibold text-gray-600 block">صادر غير مصنف</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-700">{unclassifiedOutgoing.length}</span>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              مراسلة
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 shadow-xs space-y-2">
          <span className="text-xs sm:text-sm font-semibold text-gray-600 block">إجمالي غير المصنف</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#78350f]">
              {unclassifiedIncoming.length + unclassifiedOutgoing.length}
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
              قيد التصنيف
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 shadow-xs space-y-2">
          <span className="text-xs sm:text-sm font-semibold text-gray-600 block">المجلدات المتاحة</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{folders.length}</span>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
              مجلد
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden shadow-xs">
        {/* Navigation Bar */}
        <div className="p-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('incoming')}
              className={`h-11 min-h-[44px] px-5 rounded text-sm sm:text-base font-bold flex items-center gap-2.5 transition-colors duration-200 shadow-2xs ${
                activeTab === 'incoming'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#cbd5e1]'
              }`}
            >
              <Inbox className="h-5 w-5" />
              <span>المراسلات الواردة ({unclassifiedIncoming.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('outgoing')}
              className={`h-11 min-h-[44px] px-5 rounded text-sm sm:text-base font-bold flex items-center gap-2.5 transition-colors duration-200 shadow-2xs ${
                activeTab === 'outgoing'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#cbd5e1]'
              }`}
            >
              <Send className="h-5 w-5" />
              <span>المراسلات الصادرة ({unclassifiedOutgoing.length})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="البحث في المراسلات غير المصنفة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 min-h-[44px] pr-11 pl-4 text-sm sm:text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282]"
            />
          </div>
        </div>

        {/* Global Target Folder Selector for quick assignment */}
        {canManage && folders.length > 0 && (
          <div className="p-4 bg-amber-50/60 border-b border-[#e2e8f0] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm sm:text-base text-[#78350f]">
              <FolderPlus className="h-5 w-5 text-[#d97706] flex-shrink-0" />
              <span className="font-bold">تحديد مجلد الهدف للتصنيف السريع:</span>
            </div>

            <div className="flex items-center gap-2 flex-1 md:max-w-md">
              <select
                value={selectedTargetFolderId}
                onChange={(e) => setSelectedTargetFolderId(e.target.value)}
                className="h-11 min-h-[44px] px-3.5 text-sm sm:text-base bg-white border border-[#FFCB56] rounded text-[#1a202c] font-medium flex-1 focus:outline-none focus:ring-2 focus:ring-[#2c5282]/30 shadow-2xs"
              >
                <option value="">-- اختر مجلداً من القائمة للتصنيف الفوري --</option>
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
        <div className="p-4 sm:p-6">
          {isLoadingIncoming || isLoadingOutgoing ? (
            <div className="text-center py-16 text-gray-500 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c5282] mx-auto"></div>
              <p className="text-base text-gray-600 font-medium">جاري تحميل المستندات غير المصنفة...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-3">
              <CheckCircle2 className="h-14 w-14 mx-auto text-green-500 opacity-90" />
              <p className="text-base sm:text-lg font-bold text-gray-800">
                {searchTerm ? 'لا توجد مراسلات مطابقة لمعايير البحث' : 'ممتاز! جميع المراسلات في هذا القسم مصنفة في مجلدات'}
              </p>
              <p className="text-sm sm:text-base text-gray-500">
                يمكنك مراجعة المجلدات وتصفح مستنداتها من خلال تبويب الهيكل الهرمي للمجلدات
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 pl-1 custom-scrollbar">
              {filteredDocuments.map(doc => {
                const date = activeTab === 'incoming' 
                  ? (doc as IncomingDocument).arrivalDate 
                  : (doc as OutgoingDocument).issueDate;
                
                const isIncoming = activeTab === 'incoming';

                return (
                  <div
                    key={doc._id}
                    className="p-4 sm:p-5 bg-white hover:bg-[#f8fafc] rounded border border-[#e2e8f0] hover:border-[#cbd5e1] transition-colors duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs min-h-[64px]"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded text-xs sm:text-sm font-bold border shadow-2xs ${
                          isIncoming 
                            ? 'bg-blue-50 text-[#2c5282] border-blue-200' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          #{doc.serialNumber}/{doc.year}
                        </span>

                        <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 font-medium">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {formatArabicDate(date)}
                        </span>

                        {'source' in doc && (doc as IncomingDocument).source && (
                          <span className="text-xs sm:text-sm text-gray-700 flex items-center gap-1.5 font-semibold">
                            <Building className="h-4 w-4 text-[#2c5282]" />
                            {(doc as IncomingDocument).source}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base sm:text-lg text-[#1a202c] line-clamp-2 leading-relaxed">
                        {doc.subject}
                      </h4>
                    </div>

                    {/* Assignment Controls */}
                    {canManage && (
                      <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
                        {selectedTargetFolderId && (
                          <Button
                            type="button"
                            onClick={() => handleDocumentAssign(doc._id, selectedTargetFolderId, activeTab)}
                            disabled={assignMutation.isPending}
                            className="h-10 min-h-[40px] px-4 text-sm rounded border border-[#FFCB56] bg-[#FFD758]/20 text-[#78350f] hover:bg-[#FFD758]/40 font-bold flex items-center gap-2 transition-colors duration-200 shadow-xs"
                          >
                            <Check className="h-4 w-4" />
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
                          className="h-10 min-h-[40px] px-3 text-sm font-medium bg-white border border-[#cbd5e1] rounded text-gray-700 hover:border-[#2c5282] focus:outline-none shadow-2xs"
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
