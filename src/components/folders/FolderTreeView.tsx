
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Archive,
  Circle,
  Grid3X3,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getFolders, createFolder, updateFolder, deleteFolder, getFolderDocuments } from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { Folder as FolderType } from '@/types';
import FolderContextMenu from './FolderContextMenu';
import FolderMoveDialog from './FolderMoveDialog';
import FolderDetailsDialog from './FolderDetailsDialog';
import DragDropWrapper from '@/components/common/DragDropWrapper';

interface FolderTreeViewProps {
  onFolderSelect: (folder: FolderType | null) => void;
  selectedFolderId?: string | null;
  departmentId?: string;
  readOnly?: boolean;
}

const FolderTreeView: React.FC<FolderTreeViewProps> = ({
  onFolderSelect,
  selectedFolderId,
  departmentId,
  readOnly = false
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const targetDepartmentId = departmentId || currentUser?.activeDepartment?._id;
  const canManageFolders = currentUser?.role === 'AdminDepartment' && !readOnly;

  const { data: folders, isLoading } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!targetDepartmentId,
  });

  const createFolderMutation = useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم إنشاء المجلد بنجاح');
      setIsCreateDialogOpen(false);
      setNewFolderName('');
      setParentFolderId(null);
    },
    onError: (error: any) => {
      console.error('Create folder error:', error);
      toast.error(error.response?.data?.message || 'فشل في إنشاء المجلد');
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, folderData }: { id: string; folderData: Partial<FolderType> }) =>
      updateFolder(id, folderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم تحديث المجلد بنجاح');
      setIsEditDialogOpen(false);
      setSelectedFolder(null);
      setNewFolderName('');
    },
    onError: (error: any) => {
      console.error('Update folder error:', error);
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
      if (selectedFolderId === folderToDelete?._id) {
        onFolderSelect(null);
      }
    },
    onError: (error: any) => {
      console.error('Delete folder error:', error);
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
      if (error.response?.status === 400) {
        toast.error('لا يمكن حذف مجلد يحتوي على مجلدات فرعية أو مستندات');
      } else if (error.response?.status === 404) {
        toast.error('المجلد غير موجود أو تم حذفه مسبقاً');
        // Refresh the folders list to reflect the current state
        queryClient.invalidateQueries({ queryKey: ['folders'] });
      } else {
        toast.error(error.response?.data?.message || 'فشل في حذف المجلد');
      }
    },
  });

  React.useEffect(() => {
    if (folders) {
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

  const rootFolders = folders?.filter(folder => !folder.parent) || [];
  const subfolders = folders?.filter(folder => folder.parent) || [];

  const getSubfolders = (parentId: string) => {
    return subfolders.filter(folder => 
      typeof folder.parent === 'string' 
        ? folder.parent === parentId 
        : folder.parent?._id === parentId
    );
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

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('يرجى إدخال اسم المجلد');
      return;
    }

    createFolderMutation.mutate({
      name: newFolderName.trim(),
      parentId: parentFolderId,
      department: targetDepartmentId,
      createdBy: currentUser?._id,
    } as any);
  };

  const handleEditFolder = () => {
    if (!newFolderName.trim() || !selectedFolder) {
      toast.error('يرجى إدخال اسم المجلد');
      return;
    }

    updateFolderMutation.mutate({
      id: selectedFolder._id,
      folderData: { name: newFolderName.trim() }
    });
  };

  const handleDeleteFolder = () => {
    if (!folderToDelete) return;
    deleteFolderMutation.mutate(folderToDelete._id);
  };

  const handleContextMenuEdit = (folder: FolderType) => {
    setSelectedFolder(folder);
    setNewFolderName(folder.name);
    setIsEditDialogOpen(true);
  };

  const handleContextMenuDelete = (folder: FolderType) => {
    setFolderToDelete(folder);
    setIsDeleteDialogOpen(true);
  };

  const handleContextMenuCreateSubfolder = (parentId: string) => {
    setParentFolderId(parentId);
    setNewFolderName('');
    setIsCreateDialogOpen(true);
  };

  const handleContextMenuMove = (folder: FolderType) => {
    setSelectedFolder(folder);
    setIsMoveDialogOpen(true);
  };

  const handleContextMenuToggleStatus = (folder: FolderType) => {
    const newStatus = folder.status === 'En cours' ? 'Fermé' : 'En cours';
    // toggleStatusMutation.mutate({ id: folder._id, status: newStatus });
  };

  const handleContextMenuViewDetails = (folder: FolderType) => {
    setSelectedFolder(folder);
    setIsDetailsDialogOpen(true);
  };

  const openCreateDialog = (parentId: string | null = null) => {
    setParentFolderId(parentId);
    setNewFolderName('');
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (folder: FolderType) => {
    setSelectedFolder(folder);
    setNewFolderName(folder.name);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (folder: FolderType) => {
    setFolderToDelete(folder);
    setIsDeleteDialogOpen(true);
  };

  const getFolderColor = (index: number, status: string) => {
    if (status === 'Fermé') return 'bg-gray-500';
    
    const colors = ['bg-blue-500', 'bg-orange-500', 'bg-green-500', 'bg-purple-500'];
    return colors[index % colors.length];
  };

  const renderFolderCard = (folder: FolderType, index: number = 0) => {
    const documentCount = documentCounts[folder._id] || 0;
    const folderColor = getFolderColor(index, folder.status);
    const isSelected = selectedFolderId === folder._id;
    
    return (
      <FolderContextMenu
        key={folder._id}
        folder={folder}
        onEdit={handleContextMenuEdit}
        onDelete={handleContextMenuDelete}
        onCreateSubfolder={handleContextMenuCreateSubfolder}
        onMove={handleContextMenuMove}
        onToggleStatus={handleContextMenuToggleStatus}
        onViewDetails={handleContextMenuViewDetails}
        readOnly={readOnly}
      >
        <DragDropWrapper
          dragType="folder"
          dragData={folder}
          dropTypes={['folder', 'document']}
          className={`group transition-all duration-200 ${
            isSelected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
          }`}
        >
          <Card 
            className={`cursor-pointer transition-colors duration-200 border rounded ${
              isSelected 
                ? 'border-[#FFCB56] bg-amber-50/50' 
                : 'border-[#e2e8f0] bg-white hover:bg-gray-50'
            }`}
            onClick={() => onFolderSelect(folder)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 bg-blue-50 border border-blue-200 text-[#2c5282] rounded">
                  {folder.status === 'Fermé' ? (
                    <Archive className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Folder className="h-4 w-4 text-[#2c5282]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs truncate text-[#1a202c]">{folder.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-xs font-medium ${
                      folder.status === 'En cours'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {folder.status === 'En cours' ? 'نشط' : 'مؤرشف'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-1 border-t border-[#f1f5f9]">
                <div className="flex items-center gap-1 text-xs text-[#78350f]">
                  <FileText className="h-3 w-3" />
                  <span className="font-semibold px-1 py-0.2 bg-[#FFCB56] text-[#78350f] rounded border border-[#FFD758]">
                    {documentCount} مستند
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(folder.createdAt).toLocaleDateString('ar-EG')}
                </div>
              </div>
            </CardContent>
          </Card>
        </DragDropWrapper>
      </FolderContextMenu>
    );
  };

  const renderFolderList = (folder: FolderType, level: number = 0, index: number = 0) => {
    const hasChildren = getSubfolders(folder._id).length > 0;
    const isExpanded = expandedFolders.has(folder._id);
    const isSelected = selectedFolderId === folder._id;
    const documentCount = documentCounts[folder._id] || 0;
    
    return (
      <div key={folder._id} className="space-y-1">
        <FolderContextMenu
          folder={folder}
          onEdit={handleContextMenuEdit}
          onDelete={handleContextMenuDelete}
          onCreateSubfolder={handleContextMenuCreateSubfolder}
          onMove={handleContextMenuMove}
          onToggleStatus={handleContextMenuToggleStatus}
          onViewDetails={handleContextMenuViewDetails}
          readOnly={readOnly}
        >
          <DragDropWrapper
            dragType="folder"
            dragData={folder}
            dropTypes={['folder', 'document']}
            className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors duration-200 ${
              isSelected 
                ? 'bg-amber-50/60 border-[#FFCB56] text-[#78350f]' 
                : 'hover:bg-gray-50 bg-white border-[#e2e8f0] text-gray-800'
            }`}
          >
            <div 
              className="flex items-center gap-2 w-full"
              style={{ paddingRight: `${level * 20 + 8}px` }}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(folder._id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
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
                className="flex items-center gap-2.5 flex-1 min-w-0"
                onClick={() => onFolderSelect(folder)}
              >
                <div className="text-[#2c5282]">
                  {folder.status === 'Fermé' ? (
                    <Archive className="h-4 w-4 text-gray-400" />
                  ) : isExpanded || hasChildren ? (
                    <FolderOpen className="h-4 w-4 text-[#2c5282]" />
                  ) : (
                    <Folder className="h-4 w-4 text-[#2c5282]" />
                  )}
                </div>
                
                <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
                  <span className="font-semibold text-xs truncate">{folder.name}</span>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-xs font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
                      <FileText className="h-3 w-3" />
                      {documentCount}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-xs font-medium ${
                      folder.status === 'En cours'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {folder.status === 'En cours' ? 'نشط' : 'مؤرشف'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DragDropWrapper>
        </FolderContextMenu>
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1 pr-3 border-r-2 border-[#e2e8f0]">
            {getSubfolders(folder._id).map((subfolder, subIndex) => 
              renderFolderList(subfolder, level + 1, subIndex)
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded p-8 text-center text-xs">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#2c5282] mx-auto mb-3"></div>
        <p className="text-gray-500">جاري تحميل شجرة المجلدات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="bg-white border border-[#e2e8f0] rounded p-3 flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#1a202c]">الهيكل الهرمي للمجلدات</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#cbd5e1] rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-7 px-2 text-xs flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>قائمة</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-7 px-2 text-xs flex items-center gap-1 border-r border-[#cbd5e1] ${
                viewMode === 'grid'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>شبكة</span>
            </button>
          </div>
          {canManageFolders && (
            <Button
              size="sm"
              onClick={() => openCreateDialog()}
              className="h-7 px-2.5 text-xs rounded bg-[#2c5282] hover:bg-[#234269] text-white flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>مجلد جديد</span>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded p-3 min-h-[300px]">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rootFolders.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                <Archive className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium text-gray-600 mb-2">لا توجد مجلدات</p>
                {canManageFolders && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCreateDialog()}
                    className="h-7 text-xs border border-[#FFCB56] bg-amber-50 text-[#78350f]"
                  >
                    إنشاء مجلد جديد
                  </Button>
                )}
              </div>
            ) : (
              rootFolders.map((folder, index) => renderFolderCard(folder, index))
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {rootFolders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Archive className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium text-gray-600 mb-2">لا توجد مجلدات</p>
                {canManageFolders && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCreateDialog()}
                    className="h-7 text-xs border border-[#FFCB56] bg-amber-50 text-[#78350f]"
                  >
                    إنشاء مجلد جديد
                  </Button>
                )}
              </div>
            ) : (
              rootFolders.map((folder, index) => renderFolderList(folder, 0, index))
            )}
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {parentFolderId ? 'إنشاء مجلد فرعي' : 'إنشاء مجلد جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="اسم المجلد"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            {parentFolderId && (
              <p className="text-sm text-gray-600">
                سيتم إنشاء هذا المجلد كمجلد فرعي
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المجلد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="اسم المجلد"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleEditFolder}
              disabled={updateFolderMutation.isPending}
            >
              {updateFolderMutation.isPending ? 'جاري التحديث...' : 'تحديث'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المجلد "{folderToDelete?.name}"؟ 
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteFolder}
              disabled={deleteFolderMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFolderMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FolderMoveDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        folder={selectedFolder}
        departmentId={targetDepartmentId}
      />

      <FolderDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        folder={selectedFolder}
        documentCount={selectedFolder ? documentCounts[selectedFolder._id] || 0 : 0}
      />
    </div>
  );
};

export default FolderTreeView;
