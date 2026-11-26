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
import { formatLongDate } from '@/utils/formatDate';

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
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'فشل في تصنيف المستند');
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-[#2c5282] dark:border-t-sky-500 rounded-lg p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 block">وارد غير مصنف</span>
            <span className="text-2xl sm:text-3xl font-bold text-[#2c5282] dark:text-sky-400 tabular-nums mt-1 block">{unclassifiedIncoming.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 shrink-0">
            <Inbox className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-emerald-500 dark:border-t-emerald-400 rounded-lg p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 block">صادر غير مصنف</span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1 block">{unclassifiedOutgoing.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 shrink-0">
            <Send className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-amber-500 dark:border-t-amber-400 rounded-lg p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 block">إجمالي غير المصنف</span>
            <span className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400 tabular-nums mt-1 block">
              {unclassifiedIncoming.length + unclassifiedOutgoing.length}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 shrink-0">
            <Tag className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-slate-400 dark:border-t-slate-500 rounded-lg p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 block">المجلدات المتاحة</span>
            <span className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums mt-1 block">{folders.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 shrink-0">
            <FolderOpen className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        {/* Navigation Bar */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('incoming')}
              className={`h-11 min-h-[44px] px-5 rounded-lg text-sm sm:text-base font-bold flex items-center gap-2.5 transition-colors duration-150 shadow-2xs tabular-nums ${
                activeTab === 'incoming'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <Inbox className="h-5 w-5" />
              <span>المراسلات الواردة ({unclassifiedIncoming.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('outgoing')}
              className={`h-11 min-h-[44px] px-5 rounded-lg text-sm sm:text-base font-bold flex items-center gap-2.5 transition-colors duration-150 shadow-2xs tabular-nums ${
                activeTab === 'outgoing'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <Send className="h-5 w-5" />
              <span>المراسلات الصادرة ({unclassifiedOutgoing.length})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="البحث في المراسلات غير المصنفة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 min-h-[44px] pr-11 pl-4 text-sm sm:text-base bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282]"
            />
          </div>
        </div>

        {/* Global Target Folder Selector for quick assignment */}
        {canManage && folders.length > 0 && (
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm sm:text-base text-[#78350f] dark:text-amber-300">
              <FolderPlus className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="font-bold">تحديد مجلد الهدف للتصنيف السريع:</span>
            </div>

            <div className="flex items-center gap-2 flex-1 md:max-w-md">
              <select
                value={selectedTargetFolderId}
                onChange={(e) => setSelectedTargetFolderId(e.target.value)}
                className="h-11 min-h-[44px] px-3.5 text-sm sm:text-base bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700/80 rounded-lg text-[#1a202c] dark:text-slate-100 font-medium flex-1 focus:outline-none focus:ring-2 focus:ring-[#2c5282]/30 shadow-2xs"
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
            <div className="text-center py-16 text-slate-500 dark:text-slate-400 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c5282] dark:border-sky-400 mx-auto"></div>
              <p className="text-base text-slate-600 dark:text-slate-400 font-medium">جاري تحميل المستندات غير المصنفة...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-3">
              <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500 opacity-90" />
              <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                {searchTerm ? 'لا توجد مراسلات مطابقة لمعايير البحث' : 'ممتاز! جميع المراسلات في هذا القسم مصنفة في مجلدات'}
              </p>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
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
                    className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 hover:bg-slate-50/90 dark:hover:bg-slate-800/70 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-150 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs min-h-[64px]"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold border shadow-2xs tabular-nums ${
                          isIncoming 
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/70' 
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/70'
                        }`}>
                          #{doc.serialNumber}/{doc.year}
                        </span>

                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium tabular-nums">
                          <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                          <bdi dir="rtl" className="tabular-nums">{formatLongDate(date, 'ar')}</bdi>
                        </span>

                        {'source' in doc && (doc as IncomingDocument).source && (
                          <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-semibold">
                            <Building className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                            {(doc as IncomingDocument).source}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base sm:text-lg text-[#1a202c] dark:text-slate-100 line-clamp-2 leading-relaxed">
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
                            className="h-10 min-h-[40px] px-4 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold flex items-center gap-2 transition-colors duration-150 shadow-2xs"
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
                          className="h-10 min-h-[40px] px-3 text-sm font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-[#2c5282] focus:outline-none shadow-2xs"
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
