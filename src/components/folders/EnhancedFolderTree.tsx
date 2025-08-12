import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Archive,
  Circle,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Users,
  Building2,
  Sparkles,
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import FolderBreadcrumb from './FolderBreadcrumb';
import FolderContextMenu from './FolderContextMenu';
import FolderMoveDialog from './FolderMoveDialog';
import FolderDetailsDialog from './FolderDetailsDialog';
import DragDropWrapper from '@/components/common/DragDropWrapper';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface EnhancedFolderTreeProps {
  onFolderSelect: (folder: FolderType | null) => void;
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
  const [currentFolder, setCurrentFolder] = useState<FolderType | null>(null);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const targetDepartmentId = departmentId || currentUser?.activeDepartment?._id;
  
  // AdminDepartment can manage folders in their department, AdminTuningDesk is read-only
  const canManageFolders = currentUser?.role === 'AdminDepartment' && !readOnly;
  
  // SuperAdmin can see everything but cannot perform department-specific actions, others see interface based on role
  const isReadOnlyUser = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'User' || readOnly;

  const { data: folders, isLoading } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!targetDepartmentId,
  });

  // Fetch document counts for folders
  useEffect(() => {
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
      toast.error(error.response?.data?.message || 'فشل في تحديث المجلد');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم حذف المجلد بنجاح');
      if (selectedFolderId === selectedFolder?._id) {
        onFolderSelect(null);
      }
      setSelectedFolder(null);
    },
    onError: (error: any) => {
      if (error.response?.status === 400) {
        toast.error('لا يمكن حذف مجلد يحتوي على مجلدات فرعية أو مستندات');
      } else {
        toast.error(error.response?.data?.message || 'فشل في حذف المجلد');
      }
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'En cours' | 'Fermé' }) =>
      changeFolderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('تم تغيير حالة المجلد بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في تغيير حالة المجلد');
    },
  });

  const rootFolders = folders?.filter(folder => !folder.parent) || [];
  const subfolders = folders?.filter(folder => folder.parent) || [];

  // Filter folders based on search term
  const filteredRootFolders = rootFolders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleContextMenuEdit = (folder: FolderType) => {
    setSelectedFolder(folder);
    setNewFolderName(folder.name);
    setIsEditDialogOpen(true);
  };

  const handleContextMenuDelete = (folder: FolderType) => {
    setSelectedFolder(folder);
    if (window.confirm(`هل أنت متأكد من حذف المجلد "${folder.name}"؟`)) {
      deleteFolderMutation.mutate(folder._id);
    }
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
    toggleStatusMutation.mutate({ id: folder._id, status: newStatus });
  };

  const handleContextMenuViewDetails = (folder: FolderType) => {
    setSelectedFolder(folder);
    setIsDetailsDialogOpen(true);
  };

  const handleFolderClick = (folder: FolderType) => {
    setCurrentFolder(folder);
    onFolderSelect(folder);
  };

  const getFolderColor = (index: number, status: string) => {
    if (status === 'Fermé') return 'bg-gray-500';
    
    const colors = ['bg-blue-500', 'bg-orange-500', 'bg-green-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500'];
    return colors[index % colors.length];
  };

  const getRoleDisplayInfo = () => {
    switch (currentUser?.role) {
      case 'AdminTuningDesk':
        return {
          title: 'مراقبة الأرشيف',
          icon: Eye,
          badge: { text: 'مراقبة شاملة', variant: 'secondary' as const }
        };
      case 'AdminDepartment':
        return {
          title: 'إدارة الأرشيف',
          icon: Users,
          badge: { text: 'إدارة كاملة', variant: 'default' as const }
        };
      case 'User':
        return {
          title: 'عرض الأرشيف',
          icon: Eye,
          badge: { text: 'للعرض فقط', variant: 'secondary' as const }
        };
      default:
        return {
          title: 'إدارة الأرشيف',
          icon: Building2,
          badge: { text: 'إدارة شاملة', variant: 'default' as const }
        };
    }
  };

  const roleInfo = getRoleDisplayInfo();

  const renderFolder = (folder: FolderType, level: number = 0, index: number = 0) => {
    const hasChildren = getSubfolders(folder._id).length > 0;
    const isExpanded = expandedFolders.has(folder._id);
    const isSelected = selectedFolderId === folder._id;
    const documentCount = documentCounts[folder._id] || 0;
    const folderColor = getFolderColor(index, folder.status);
    
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
          readOnly={isReadOnlyUser}
        >
          <DragDropWrapper
            dragType="folder"
            dragData={folder}
            dropTypes={['folder', 'document']}
            className={`group flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
              isSelected 
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg transform scale-[1.02]' 
                : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-transparent hover:border-gray-200 hover:shadow-md'
            }`}
            style={{ paddingRight: `${level * 24 + 16}px` }}
          >
            <div 
              className="flex items-center gap-3 w-full"
              style={{ paddingRight: `${level * 24}px` }}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(folder._id);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-110"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              ) : (
                <div className="w-8" />
              )}
              
              <div
                className="flex items-center gap-4 flex-1 min-w-0"
                onClick={() => handleFolderClick(folder)}
              >
                <div className={`p-3 ${folderColor} rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  {folder.status === 'Fermé' ? (
                    <Archive className="h-5 w-5 text-white" />
                  ) : isExpanded || hasChildren ? (
                    <FolderOpen className="h-5 w-5 text-white" />
                  ) : (
                    <Folder className="h-5 w-5 text-white" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-base text-gray-800 truncate">{folder.name}</span>
                    {documentCount > 0 && (
                      <Badge variant="outline" className="text-xs bg-white/80 border-gray-300">
                        <FileText className="h-3 w-3 mr-1" />
                        {documentCount} مستند
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={folder.status === 'En cours' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      <Circle className="h-2 w-2 mr-1" />
                      {folder.status === 'En cours' ? 'نشط' : 'مؤرشف'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatArabicDate(folder.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {canManageFolders && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenuCreateSubfolder(folder._id);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DragDropWrapper>
        </FolderContextMenu>
        
        {hasChildren && isExpanded && (
          <div className="space-y-1 ml-4 border-r-2 border-gray-100">
            {getSubfolders(folder._id).map((subfolder, subIndex) => 
              renderFolder(subfolder, level + 1, subIndex)
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="shadow-xl border-0">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary mx-auto mb-6"></div>
          <p className="text-lg font-medium text-muted-foreground">جاري تحميل الهيكل الهرمي...</p>
          <p className="text-sm text-muted-foreground mt-2">يرجى الانتظار</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb Navigation */}
      {currentFolder && (
        <FolderBreadcrumb
          currentFolder={currentFolder}
          folders={folders || []}
          onNavigate={(folder) => {
            setCurrentFolder(folder);
            onFolderSelect(folder);
          }}
        />
      )}

      {/* Enhanced Header */}
      <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <roleInfo.icon className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                  {roleInfo.title}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  تصفح وإدارة المجلدات بطريقة هرمية منظمة ومطورة
                </p>
              </div>
            </div>
            <Badge variant={roleInfo.badge.variant} className="flex items-center gap-2 px-4 py-2 text-sm">
              <roleInfo.icon className="h-4 w-4" />
              {roleInfo.badge.text}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="البحث في المجلدات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-12 pl-4 py-3 text-lg border-2 border-gray-200 focus:border-blue-400 rounded-xl"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2 px-6 py-3 border-2 hover:bg-gray-50">
              <Filter className="h-5 w-5" />
              تصفية متقدمة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Folder Tree */}
      <Card className="shadow-xl border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">الهيكل الهرمي للمجلدات</h3>
            {canManageFolders && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setParentFolderId(null);
                  setNewFolderName('');
                  setIsCreateDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                مجلد جديد
              </Button>
            )}
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredRootFolders.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="relative mb-6">
                  <Archive className="h-24 w-24 mx-auto opacity-20" />
                  <div className="absolute inset-0 animate-pulse">
                    <Archive className="h-24 w-24 mx-auto opacity-10" />
                  </div>
                </div>
                <p className="text-xl font-semibold mb-3">
                  {searchTerm ? 'لا توجد مجلدات مطابقة للبحث' : 'لا توجد مجلدات'}
                </p>
                <p className="text-sm text-gray-400">
                  {searchTerm ? 'حاول البحث بكلمات مختلفة' : 'ابدأ بإنشاء مجلد جديد لتنظيم مستنداتك'}
                </p>
              </div>
            ) : (
              filteredRootFolders.map((folder, index) => renderFolder(folder, 0, index))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{rootFolders.length}</div>
            <div className="text-sm font-medium text-blue-800">مجلد رئيسي</div>
            <div className="text-xs text-blue-600 mt-1">المستوى الأول</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{subfolders.length}</div>
            <div className="text-sm font-medium text-green-800">مجلد فرعي</div>
            <div className="text-xs text-green-600 mt-1">المستويات الفرعية</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {Object.values(documentCounts).reduce((sum, count) => sum + count, 0)}
            </div>
            <div className="text-sm font-medium text-purple-800">إجمالي المستندات</div>
            <div className="text-xs text-purple-600 mt-1">جميع المجلدات</div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
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

export default EnhancedFolderTree;
