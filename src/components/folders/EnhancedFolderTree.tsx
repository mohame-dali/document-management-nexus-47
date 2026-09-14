import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Archive, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  MoveRight, 
  Info, 
  ExternalLink,
  ChevronsDown,
  ChevronsUp,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  getFolders, 
  getFolderDocuments, 
  createFolder, 
  updateFolder, 
  deleteFolder, 
  changeFolderStatus 
} from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { Folder as FolderType } from '@/types';
import FolderContextMenu from './FolderContextMenu';
import FolderMoveDialog from './FolderMoveDialog';
import FolderDetailsDialog from './FolderDetailsDialog';
import { FolderDocumentsModal } from './FolderDocumentsModal';
import DragDropWrapper from '@/components/common/DragDropWrapper';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface EnhancedFolderTreeProps {
  onFolderSelect?: (folder: FolderType | null) => void;
  selectedFolderId?: string | null;
  departmentId?: string;
  readOnly?: boolean;
}

const EnhancedFolderTree: React.FC<EnhancedFolderTreeProps> = ({
  onFolderSelect,
  selectedFolderId,
  departmentId,
  readOnly = false
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'En cours' | 'Fermé'>('all');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const targetDepartmentId = departmentId || currentUser?.activeDepartment?._id;
  const canManageFolders = currentUser?.role === 'AdminDepartment' && !readOnly;

  const { data: folders, isLoading } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!targetDepartmentId,
  });

  // Fetch document counts for all folders
  useEffect(() => {
    if (folders && folders.length > 0) {
      folders.forEach(async (folder) => {
        try {
          const documents = await getFolderDocuments(folder._id);
          const count = (documents.incomingDocuments?.length || 0) + (documents.outgoingDocuments?.length || 0);
          setDocumentCounts(prev => ({ ...prev, [folder._id]: count }));
        } catch (error) {
          console.error(`Error fetching documents for folder ${folder._id}:`, error);
        }
      });
    }
  }, [folders]);

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; description: string; parentId: string | null; department: string }) =>
      createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم إنشاء المجلد بنجاح');
      setIsCreateDialogOpen(false);
      setFormName('');
      setFormDescription('');
      setParentFolderId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في إنشاء المجلد');
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, folderData }: { id: string; folderData: Partial<FolderType> }) =>
      updateFolder(id, folderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم تحديث بيانات المجلد بنجاح');
      setIsEditDialogOpen(false);
      setSelectedFolder(null);
      setFormName('');
      setFormDescription('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في تحديث المجلد');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم حذف المجلد بنجاح');
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
      if (selectedFolderId === folderToDelete?._id && onFolderSelect) {
        onFolderSelect(null);
      }
    },
    onError: (error: any) => {
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
      toast.error(error.response?.data?.message || 'فشل في حذف المجلد');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'En cours' | 'Fermé' }) =>
      changeFolderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم تحديث حالة المجلد بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في تغيير حالة المجلد');
    },
  });

  const rootFolders = useMemo(() => {
    return folders?.filter(folder => !folder.parent) || [];
  }, [folders]);

  const subfolders = useMemo(() => {
    return folders?.filter(folder => folder.parent) || [];
  }, [folders]);

  const getSubfolders = (parentId: string) => {
    return subfolders.filter(folder => {
      const pId = typeof folder.parent === 'string' ? folder.parent : folder.parent?._id;
      return pId === parentId;
    });
  };

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const expandAll = () => {
    if (folders) {
      setExpandedFolders(new Set(folders.map(f => f._id)));
    }
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const handleOpenCreate = (parentId: string | null = null) => {
    setParentFolderId(parentId);
    setFormName('');
    setFormDescription('');
    setIsCreateDialogOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('يرجى إدخال اسم المجلد');
      return;
    }
    if (!targetDepartmentId) {
      toast.error('لم يتم العثور على القسم الإداري');
      return;
    }

    createFolderMutation.mutate({
      name: formName.trim(),
      description: formDescription.trim(),
      parentId: parentFolderId,
      department: targetDepartmentId
    });
  };

  const handleOpenEdit = (folder: FolderType) => {
    setSelectedFolder(folder);
    setFormName(folder.name);
    setFormDescription(folder.description || '');
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder || !formName.trim()) {
      toast.error('يرجى إدخال اسم المجلد');
      return;
    }

    updateFolderMutation.mutate({
      id: selectedFolder._id,
      folderData: {
        name: formName.trim(),
        description: formDescription.trim()
      }
    });
  };

  const handleOpenDelete = (folder: FolderType) => {
    setFolderToDelete(folder);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (folderToDelete) {
      deleteFolderMutation.mutate(folderToDelete._id);
    }
  };

  const handleOpenDocuments = (folder: FolderType) => {
    setSelectedFolder(folder);
    setIsDocsModalOpen(true);
    if (onFolderSelect) {
      onFolderSelect(folder);
    }
  };

  const handleToggleStatus = (folder: FolderType) => {
    const nextStatus = folder.status === 'En cours' ? 'Fermé' : 'En cours';
    toggleStatusMutation.mutate({ id: folder._id, status: nextStatus });
  };

  // Filter root folders
  const filteredRootFolders = useMemo(() => {
    return rootFolders.filter(folder => {
      const matchesSearch = !searchTerm.trim() || 
        folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (folder.description && folder.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || folder.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rootFolders, searchTerm, statusFilter]);

  const totalDocumentsAll = useMemo(() => {
    return Object.values(documentCounts).reduce((acc, curr) => acc + curr, 0);
  }, [documentCounts]);

  const renderFolderNode = (folder: FolderType, level: number = 0) => {
    const children = getSubfolders(folder._id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder._id);
    const isSelected = selectedFolderId === folder._id;
    const docCount = documentCounts[folder._id] || 0;

    return (
      <div key={folder._id} className="select-none">
        <FolderContextMenu
          folder={folder}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          onCreateSubfolder={(pId) => handleOpenCreate(pId)}
          onMove={(f) => { setSelectedFolder(f); setIsMoveDialogOpen(true); }}
          onToggleStatus={handleToggleStatus}
          onViewDetails={(f) => { setSelectedFolder(f); setIsDetailsDialogOpen(true); }}
          onOpenDocuments={handleOpenDocuments}
          readOnly={!canManageFolders}
        >
          <DragDropWrapper
            dragType="folder"
            dragData={folder}
            dropTypes={['folder', 'document']}
            className={`flex items-center justify-between gap-2 p-2 rounded border text-xs transition-colors duration-200 ${
              isSelected 
                ? 'bg-amber-50/60 border-[#FFCB56] text-[#78350f]' 
                : 'bg-white hover:bg-gray-50/90 border-[#e2e8f0] text-gray-800'
            }`}
            style={{ marginRight: `${level * 20}px` }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(folder._id);
                  }}
                  className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors duration-200"
                  title={isExpanded ? 'طي المجلد' : 'توسيع المجلد'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[#2c5282]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-500 rotate-180" />
                  )}
                </button>
              ) : (
                <div className="w-5" />
              )}

              <div 
                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                onClick={() => handleOpenDocuments(folder)}
              >
                {folder.status === 'Fermé' ? (
                  <Archive className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : isExpanded || hasChildren ? (
                  <FolderOpen className="h-4 w-4 text-[#2c5282] flex-shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 text-[#2c5282] flex-shrink-0" />
                )}

                <span className="font-semibold text-xs truncate max-w-[260px] sm:max-w-md">
                  {folder.name}
                </span>

                {folder.description && (
                  <span className="text-[11px] text-gray-400 truncate hidden md:inline">
                    — {folder.description}
                  </span>
                )}
              </div>
            </div>

            {/* Badges and Quick Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Document count badge */}
              <button
                type="button"
                onClick={() => handleOpenDocuments(folder)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758] hover:bg-[#FFD758] transition-colors duration-200"
                title="عرض المستندات المصنفة"
              >
                <FileText className="h-3 w-3" />
                <span>{docCount}</span>
              </button>

              {/* Status badge */}
              <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                folder.status === 'En cours'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {folder.status === 'En cours' ? 'نشط' : 'مغلق'}
              </span>

              {/* Action buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleOpenDocuments(folder)}
                  className="p-1 rounded text-gray-500 hover:text-[#2c5282] hover:bg-gray-100 transition-colors duration-200"
                  title="عرض المستندات"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>

                {canManageFolders && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenCreate(folder._id)}
                      className="p-1 rounded text-gray-500 hover:text-[#2c5282] hover:bg-gray-100 transition-colors duration-200"
                      title="إنشاء مجلد فرعي"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(folder)}
                      className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-200"
                      title="تعديل المجلد"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDelete(folder)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                      title="حذف المجلد"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </DragDropWrapper>
        </FolderContextMenu>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1 pr-3 border-r-2 border-[#e2e8f0]">
            {children.map(child => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Metrics Row - AdminLTE clean style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <span className="text-[11px] text-gray-500 block mb-0.5">إجمالي المجلدات</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#1a202c]">{folders?.length || 0}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              مجلد
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <span className="text-[11px] text-gray-500 block mb-0.5">المجلدات الرئيسية</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#2c5282]">{rootFolders.length}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
              جذر
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <span className="text-[11px] text-gray-500 block mb-0.5">المجلدات الفرعية</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-700">{subfolders.length}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
              فرعي
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <span className="text-[11px] text-gray-500 block mb-0.5">المستندات المصنفة</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#78350f]">{totalDocumentsAll}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
              مستند
            </span>
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="البحث بالاسم أو الوصف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pr-8 pl-3 text-xs bg-white border-[#cbd5e1] rounded"
            />
          </div>

          <div className="flex items-center border border-[#cbd5e1] rounded overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`h-8 px-2 text-[11px] font-medium transition-colors duration-200 ${
                statusFilter === 'all'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('En cours')}
              className={`h-8 px-2 text-[11px] font-medium transition-colors duration-200 border-x border-[#cbd5e1] ${
                statusFilter === 'En cours'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              نشط
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Fermé')}
              className={`h-8 px-2 text-[11px] font-medium transition-colors duration-200 ${
                statusFilter === 'Fermé'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              مغلق
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="h-8 px-2.5 text-xs rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-50 flex items-center gap-1"
            title="توسيع جميع المجلدات"
          >
            <ChevronsDown className="h-3.5 w-3.5 text-gray-500" />
            <span>توسيع الكل</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="h-8 px-2.5 text-xs rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-50 flex items-center gap-1"
            title="طي جميع المجلدات"
          >
            <ChevronsUp className="h-3.5 w-3.5 text-gray-500" />
            <span>طي الكل</span>
          </Button>

          {canManageFolders && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenCreate(null)}
              className="h-8 px-3 text-xs rounded bg-[#2c5282] hover:bg-[#234269] text-white font-medium flex items-center gap-1.5 transition-colors duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إنشاء مجلد رئيسي</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tree Content Area */}
      <div className="bg-white border border-[#e2e8f0] rounded p-3 min-h-[350px]">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#2c5282] mx-auto mb-2"></div>
            <p className="text-xs">جاري تحميل هيكل المجلدات...</p>
          </div>
        ) : filteredRootFolders.length === 0 ? (
          <div className="text-center py-12 text-gray-400 space-y-2">
            <Folder className="h-10 w-10 mx-auto opacity-30 text-gray-400" />
            <p className="text-xs font-medium text-gray-600">
              {searchTerm ? 'لا توجد مجلدات مطابقة لمعايير البحث' : 'لا توجد مجلدات مسجلة في هذا القسم'}
            </p>
            {canManageFolders && !searchTerm && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenCreate(null)}
                className="h-8 px-3 text-xs rounded border border-[#FFCB56] bg-[#FFD758]/15 text-[#78350f] hover:bg-[#FFD758]/30 font-medium inline-flex items-center gap-1.5 transition-colors duration-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إنشاء المجلد الأول الآن</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pl-1">
            {filteredRootFolders.map(folder => renderFolderNode(folder, 0))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-0 overflow-hidden shadow-xl text-base" dir="rtl">
          <DialogHeader className="p-6 bg-[#f8fafc] border-b border-[#e2e8f0] text-right">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282]">
              <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
                <FolderPlus className="h-5 w-5" />
              </div>
              <span>{parentFolderId ? 'إنشاء مجلد فرعي' : 'إنشاء مجلد رئيسي جديد'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-base font-bold text-[#1a202c] mb-2">
                اسم المجلد <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="أدخل اسم المجلد الإداري..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-12 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282]"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-base font-bold text-[#1a202c] mb-2">
                وصف المجلد (اختياري)
              </label>
              <Textarea
                placeholder="وصف مختصر لمحتوى هذا المجلد أو طبيعة الوثائق المودعة به..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-base bg-white border-[#cbd5e1] rounded min-h-[100px] p-3 focus:border-[#2c5282]"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-[#e2e8f0] flex-row-reverse justify-start gap-3">
              <Button
                type="submit"
                disabled={createFolderMutation.isPending}
                className="h-11 px-7 rounded bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold shadow-none"
              >
                {createFolderMutation.isPending ? 'جاري الإنشاء...' : 'حفظ وإنشاء'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="h-11 px-6 rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-100 text-base font-medium"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-0 overflow-hidden shadow-xl text-base" dir="rtl">
          <DialogHeader className="p-6 bg-[#f8fafc] border-b border-[#e2e8f0] text-right">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282]">
              <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
                <Edit3 className="h-5 w-5" />
              </div>
              <span>تعديل المجلد: {selectedFolder?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-base font-bold text-[#1a202c] mb-2">
                اسم المجلد <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="اسم المجلد..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-12 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282]"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-base font-bold text-[#1a202c] mb-2">
                الوصف
              </label>
              <Textarea
                placeholder="وصف محتوى المجلد..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-base bg-white border-[#cbd5e1] rounded min-h-[100px] p-3 focus:border-[#2c5282]"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-[#e2e8f0] flex-row-reverse justify-start gap-3">
              <Button
                type="submit"
                disabled={updateFolderMutation.isPending}
                className="h-11 px-7 rounded bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold shadow-none"
              >
                {updateFolderMutation.isPending ? 'جاري التحديث...' : 'حفظ التعديلات'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="h-11 px-6 rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-100 text-base font-medium"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-0 overflow-hidden shadow-xl text-base" dir="rtl">
          <AlertDialogHeader className="p-6 bg-[#f8fafc] border-b border-[#e2e8f0] text-right">
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-red-600 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <span>تأكيد حذف المجلد</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-700 leading-relaxed mt-3">
              هل أنت متأكد من حذف المجلد <span className="font-bold text-[#1a202c]">"{folderToDelete?.name}"</span>؟
              <br />
              <span className="text-sm text-gray-500 font-medium mt-1 block">
                ملاحظة: لا يمكن حذف المجلد إذا كان يحتوي على مستندات أو مجلدات فرعية.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-4 sm:p-6 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-row-reverse justify-start gap-3">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteFolderMutation.isPending}
              className="h-11 px-7 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-base shadow-none"
            >
              {deleteFolderMutation.isPending ? 'جاري الحذف...' : 'نعم، احذف المجلد'}
            </AlertDialogAction>
            <AlertDialogCancel 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="h-11 px-6 rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-100 text-base font-medium"
            >
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Dialog */}
      <FolderMoveDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        folder={selectedFolder}
        departmentId={targetDepartmentId}
      />

      {/* Details Dialog */}
      <FolderDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        folder={selectedFolder}
        documentCount={selectedFolder ? documentCounts[selectedFolder._id] || 0 : 0}
      />

      {/* Documents Modal */}
      <FolderDocumentsModal
        selectedFolder={selectedFolder}
        isOpen={isDocsModalOpen}
        onClose={() => { setIsDocsModalOpen(false); setSelectedFolder(null); }}
        canManage={canManageFolders}
      />
    </div>
  );
};

export default EnhancedFolderTree;
