import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FolderTree,
  Building2,
  FolderPlus,
  Tag,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import PageBreadcrumb from '@/components/common/PageBreadcrumb';
import QuickPdfPreviewSheet from '@/components/documents/QuickPdfPreviewSheet';
import FolderExplorerTree from './FolderExplorerTree';
import FolderDetailPane from './FolderDetailPane';
import FolderMoveDialog from './FolderMoveDialog';
import FolderDetailsDialog from './FolderDetailsDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  changeFolderStatus,
} from '@/services/folderService';
import {
  getIncomingDocumentsList,
  getOutgoingDocumentsList,
} from '@/services/documentService';
import { getDepartments } from '@/services/departmentService';
import {
  Folder as FolderType,
  IncomingDocument,
  OutgoingDocument,
} from '@/types';

interface FolderManagementProps {
  readOnly?: boolean;
}

const getParentId = (folder: FolderType): string | null => {
  if (!folder.parent) return null;
  return typeof folder.parent === 'string' ? folder.parent : folder.parent._id;
};

const FolderManagement: React.FC<FolderManagementProps> = ({ readOnly = false }) => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const { dir } = useDirection();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFr = language === 'fr';

  const isGlobalScopeRole =
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Director' ||
    currentUser?.role === 'AdminTuningDesk';

  const targetDepartmentId = isGlobalScopeRole
    ? undefined
    : currentUser?.activeDepartment?._id;

  const canManageFolders =
    (currentUser?.role === 'AdminDepartment' || currentUser?.role === 'Admin') &&
    !readOnly;

  // Queries
  const {
    data: folders = [],
    isLoading: isFoldersLoading,
    isError: isFoldersError,
    refetch: refetchFolders,
  } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!currentUser,
  });

  const { data: incomingDocs = [] } = useQuery({
    queryKey: ['incomingDocuments', targetDepartmentId],
    queryFn: () => getIncomingDocumentsList({}),
    enabled: !!currentUser,
  });

  const { data: outgoingDocs = [] } = useQuery({
    queryKey: ['outgoingDocuments', targetDepartmentId],
    queryFn: () => getOutgoingDocumentsList({}),
    enabled: !!currentUser,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: canManageFolders && currentUser?.role === 'Admin',
  });

  // UI & Explorer State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    () => searchParams.get('folder')
  );
  const [viewMode, setViewMode] = useState<'folder' | 'classify'>('folder');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [treeSearch, setTreeSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'En cours' | 'Fermé'>('all');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [actionFolder, setActionFolder] = useState<FolderType | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState<string>('');

  // Quick PDF Preview Sheet state
  const [previewDoc, setPreviewDoc] = useState<
    IncomingDocument | OutgoingDocument | null
  >(null);
  const [previewDirection, setPreviewDirection] = useState<'incoming' | 'outgoing'>(
    'incoming'
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Sync URL ?folder= parameter & auto-expand ancestors
  useEffect(() => {
    const urlFolderId = searchParams.get('folder');
    if (urlFolderId !== selectedFolderId) {
      setSelectedFolderId(urlFolderId);
    }
  }, [searchParams, selectedFolderId]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f._id === selectedFolderId) || null,
    [folders, selectedFolderId]
  );

  // Auto-expand ancestor chain whenever selectedFolder changes
  useEffect(() => {
    if (!selectedFolder || folders.length === 0) return;
    const byId = new Map(folders.map((f) => [f._id, f]));
    const ancestorsToExpand: string[] = [];
    let pId = getParentId(selectedFolder);
    const visited = new Set<string>();
    while (pId && !visited.has(pId)) {
      visited.add(pId);
      ancestorsToExpand.push(pId);
      const parent = byId.get(pId);
      pId = parent ? getParentId(parent) : null;
    }
    if (ancestorsToExpand.length > 0) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        ancestorsToExpand.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [selectedFolder, folders]);

  const handleSelectFolder = (folder: FolderType | null) => {
    setViewMode('folder');
    if (folder) {
      setSelectedFolderId(folder._id);
      setSearchParams({ folder: folder._id }, { replace: true });
    } else {
      setSelectedFolderId(null);
      setSearchParams({}, { replace: true });
    }
  };

  // Stats
  const totalClassifiedCount = useMemo(
    () => folders.reduce((sum, f) => sum + (f.documentCount ?? 0), 0),
    [folders]
  );

  const unclassifiedIncomingCount = useMemo(
    () => incomingDocs.filter((d) => !d.folder).length,
    [incomingDocs]
  );
  const unclassifiedOutgoingCount = useMemo(
    () => outgoingDocs.filter((d) => !d.folder).length,
    [outgoingDocs]
  );
  const unclassifiedTotal = unclassifiedIncomingCount + unclassifiedOutgoingCount;

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      parentId: string | null;
      department: string;
    }) => createFolder(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success(isFr ? 'Dossier créé avec succès' : 'تم إنشاء المجلد بنجاح');
      setIsCreateOpen(false);
      setFormName('');
      setFormDescription('');
      setParentFolderId(null);
      if (created?._id) {
        handleSelectFolder(created);
      }
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || (isFr ? 'Échec de la création' : 'فشل في إنشاء المجلد'));
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({
      id,
      folderData,
    }: {
      id: string;
      folderData: Partial<FolderType>;
    }) => updateFolder(id, folderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success(isFr ? 'Dossier mis à jour' : 'تم تحديث بيانات المجلد بنجاح');
      setIsEditOpen(false);
      setActionFolder(null);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || (isFr ? 'Échec de la mise à jour' : 'فشل في تحديث المجلد'));
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success(isFr ? 'Dossier supprimé' : 'تم حذف المجلد بنجاح');
      setIsDeleteOpen(false);
      setActionFolder(null);
      if (selectedFolderId === deletedId) {
        handleSelectFolder(null);
      }
    },
    onError: (error: unknown) => {
      setIsDeleteOpen(false);
      setActionFolder(null);
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || (isFr ? 'Échec de la suppression' : 'فشل في حذف المجلد'));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'En cours' | 'Fermé';
    }) => changeFolderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success(isFr ? 'Statut mis à jour' : 'تم تحديث حالة المجلد بنجاح');
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(
        msg || (isFr ? 'Échec du changement de statut' : 'فشل في تغيير حالة المجلد')
      );
    },
  });

  // Handlers
  const handleOpenCreate = (parentId: string | null = null) => {
    setParentFolderId(parentId);
    setFormName('');
    setFormDescription('');

    if (parentId) {
      const parent = folders.find((f) => f._id === parentId);
      const parentDept = parent
        ? typeof parent.department === 'object'
          ? parent.department._id
          : parent.department
        : '';
      setFormDepartmentId(
        parentDept || currentUser?.activeDepartment?._id || departments[0]?._id || ''
      );
    } else {
      setFormDepartmentId(
        currentUser?.activeDepartment?._id || departments[0]?._id || ''
      );
    }
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error(isFr ? 'Veuillez saisir le nom du dossier' : 'يرجى إدخال اسم المجلد');
      return;
    }
    const resolvedDept =
      formDepartmentId || targetDepartmentId || currentUser?.activeDepartment?._id;
    if (!resolvedDept) {
      toast.error(
        isFr ? 'Veuillez sélectionner un département' : 'يرجى اختيار القسم الإداري'
      );
      return;
    }

    createFolderMutation.mutate({
      name: formName.trim(),
      description: formDescription.trim(),
      parentId: parentFolderId,
      department: resolvedDept,
    });
  };

  const handleOpenEdit = (folder: FolderType) => {
    setActionFolder(folder);
    setFormName(folder.name);
    setFormDescription(folder.description || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionFolder || !formName.trim()) return;
    updateFolderMutation.mutate({
      id: actionFolder._id,
      folderData: {
        name: formName.trim(),
        description: formDescription.trim(),
      },
    });
  };

  const handleToggleStatus = (folder: FolderType) => {
    toggleStatusMutation.mutate({
      id: folder._id,
      status: folder.status === 'En cours' ? 'Fermé' : 'En cours',
    });
  };

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handlePreviewDocument = (
    doc: IncomingDocument | OutgoingDocument,
    direction: 'incoming' | 'outgoing'
  ) => {
    setPreviewDoc(doc);
    setPreviewDirection(direction);
    setIsPreviewOpen(true);
  };

  const scopeLabel = isGlobalScopeRole
    ? t('folders.page.allDepartments')
    : currentUser?.activeDepartment?.name ||
      t('folders.page.activeDepartmentFallback');

  return (
    <div className="space-y-4">
      {/* 1. Single Clean Breadcrumb */}
      <PageBreadcrumb
        showHomeIcon
        homeTo="/dashboard"
        homeLabel={t('common.home')}
        items={[{ label: t('folders.explorer.title') }]}
      />

      {/* 2. Single Compact Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#2c5282]/10 dark:bg-sky-900/40 border border-[#2c5282]/20 dark:border-sky-800/60 flex items-center justify-center text-[#2c5282] dark:text-sky-300 shrink-0">
            <FolderTree className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1a202c] dark:text-slate-100">
                {t('folders.explorer.title')}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                <span>{scopeLabel}</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
                {readOnly
                  ? t('folders.page.badgeReadOnly')
                  : t('folders.page.badgeFullAccess')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {readOnly
                ? t('folders.page.subtitleReadOnly')
                : t('folders.page.subtitleManage')}
            </p>
          </div>
        </div>

        {/* Inline Stats & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 tabular-nums">
            <span>{folders.length}</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {t('folders.explorer.foldersStat')}
            </span>
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 tabular-nums">
            <span>{totalClassifiedCount}</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {t('folders.explorer.classifiedStat')}
            </span>
          </span>

          <Button
            type="button"
            variant={viewMode === 'classify' ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setViewMode((prev) => (prev === 'classify' ? 'folder' : 'classify'))
            }
            className={
              viewMode === 'classify'
                ? 'h-9 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 tabular-nums'
                : 'h-9 px-3.5 rounded-lg border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-semibold gap-1.5 tabular-nums'
            }
          >
            <Tag className="h-4 w-4" />
            <span>
              {t('folders.explorer.classifyUnclassified')} ({unclassifiedTotal})
            </span>
          </Button>

          {canManageFolders && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenCreate(null)}
              className="h-9 px-3.5 rounded-lg bg-[#2c5282] hover:bg-[#1e3a5f] text-white font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>{t('folders.explorer.newFolder')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. Master-Detail Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4">
          <FolderExplorerTree
            folders={folders}
            isLoading={isFoldersLoading}
            isError={isFoldersError}
            onRetry={() => refetchFolders()}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            canManageFolders={canManageFolders}
            expandedFolders={expandedFolders}
            onToggleExpand={handleToggleExpand}
            onExpandAll={() =>
              setExpandedFolders(new Set(folders.map((f) => f._id)))
            }
            onCollapseAll={() => setExpandedFolders(new Set())}
            searchTerm={treeSearch}
            onSearchChange={setTreeSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            showDepartmentBadge={isGlobalScopeRole}
            onCreateSubfolder={(parentId) => handleOpenCreate(parentId)}
            onEdit={handleOpenEdit}
            onMove={(folder) => {
              setActionFolder(folder);
              setIsMoveOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            onDelete={(folder) => {
              setActionFolder(folder);
              setIsDeleteOpen(true);
            }}
            onViewDetails={(folder) => {
              setActionFolder(folder);
              setIsDetailsOpen(true);
            }}
          />
        </div>

        <div className="lg:col-span-8">
          <FolderDetailPane
            folders={folders}
            selectedFolder={selectedFolder}
            onSelectFolder={handleSelectFolder}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            canManageFolders={canManageFolders}
            targetDepartmentId={targetDepartmentId}
            unclassifiedIncomingCount={unclassifiedIncomingCount}
            unclassifiedOutgoingCount={unclassifiedOutgoingCount}
            onCreateSubfolder={(parentId) => handleOpenCreate(parentId)}
            onEditFolder={handleOpenEdit}
            onMoveFolder={(folder) => {
              setActionFolder(folder);
              setIsMoveOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            onDeleteFolder={(folder) => {
              setActionFolder(folder);
              setIsDeleteOpen(true);
            }}
            onPreviewDocument={handlePreviewDocument}
          />
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          dir={dir}
          className="w-[95vw] sm:max-w-[520px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-start">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-[#2c5282] dark:text-sky-300">
              <FolderPlus className="h-5 w-5" />
              <span>
                {parentFolderId
                  ? isFr
                    ? 'Créer un sous-dossier'
                    : 'إنشاء مجلد فرعي'
                  : t('folders.createNewFolder')}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
            {currentUser?.role === 'Admin' && !parentFolderId && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                  {t('folders.department')}
                </label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => setFormDepartmentId(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  required
                >
                  <option value="">{t('folders.selectDepartment')}</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                {t('folders.folderName')} *
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('folders.enterFolderName')}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                {isFr ? 'Description (optionnel)' : 'الوصف (اختياري)'}
              </label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={
                  isFr
                    ? 'Notes ou contenu du dossier...'
                    : 'وصف مختصر لمحتوى المجلد...'
                }
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2 flex flex-row-reverse justify-start gap-2.5">
              <Button
                type="submit"
                disabled={createFolderMutation.isPending}
                className="bg-[#2c5282] hover:bg-[#1e3a5f] text-white"
              >
                {createFolderMutation.isPending
                  ? isFr
                    ? 'Création...'
                    : 'جاري الإنشاء...'
                  : t('folders.create')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                {t('folders.cancel')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          dir={dir}
          className="w-[95vw] sm:max-w-[520px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-start">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-[#2c5282] dark:text-sky-300">
              <Edit3 className="h-5 w-5" />
              <span>{t('folders.editFolderName')}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                {t('folders.folderName')} *
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                {isFr ? 'Description (optionnel)' : 'الوصف (اختياري)'}
              </label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2 flex flex-row-reverse justify-start gap-2.5">
              <Button
                type="submit"
                disabled={updateFolderMutation.isPending}
                className="bg-[#2c5282] hover:bg-[#1e3a5f] text-white"
              >
                {updateFolderMutation.isPending
                  ? isFr
                    ? 'Enregistrement...'
                    : 'جاري الحفظ...'
                  : t('folders.update')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                {t('folders.cancel')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent dir={dir} className="bg-white dark:bg-slate-900">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              <span>{t('folders.delete')}</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('folders.confirmDelete')}{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {actionFolder?.name}
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('folders.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionFolder && deleteFolderMutation.mutate(actionFolder._id)
              }
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('folders.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move & Details Dialogs */}
      <FolderMoveDialog
        open={isMoveOpen}
        onOpenChange={setIsMoveOpen}
        folder={actionFolder}
        departmentId={targetDepartmentId}
      />

      <FolderDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        folder={actionFolder}
        documentCount={actionFolder?.documentCount || 0}
      />

      {/* Quick PDF Preview Drawer */}
      <QuickPdfPreviewSheet
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        document={previewDoc}
        direction={previewDirection}
        onOpenFullDetails={(docId) =>
          navigate(`/dashboard/mail/${previewDirection}/${docId}`)
        }
      />
    </div>
  );
};

export default FolderManagement;
