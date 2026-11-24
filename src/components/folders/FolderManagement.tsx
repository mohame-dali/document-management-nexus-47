import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getFolders } from '@/services/folderService';
import { 
  FolderTree, 
  Tag, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  Folder,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import EnhancedFolderTree from './EnhancedFolderTree';
import DocumentCategoryManager from './DocumentCategoryManager';
import { FolderDocumentsModal } from './FolderDocumentsModal';
import { Folder as FolderType } from '@/types';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface FolderManagementProps {
  readOnly?: boolean;
}

const FOLDER_TABS: Array<'tree' | 'categorization'> = ['tree', 'categorization'];

const FolderManagement: React.FC<FolderManagementProps> = ({ readOnly = false }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { dir } = useDirection();
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'categorization'>('tree');
  const tabRefs = useRef<Record<'tree' | 'categorization', HTMLButtonElement | null>>({
    tree: null,
    categorization: null,
  });

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const isRtl = dir === 'rtl';
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = isRtl
        ? (currentIndex - 1 + FOLDER_TABS.length) % FOLDER_TABS.length
        : (currentIndex + 1) % FOLDER_TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = isRtl
        ? (currentIndex + 1) % FOLDER_TABS.length
        : (currentIndex - 1 + FOLDER_TABS.length) % FOLDER_TABS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = FOLDER_TABS.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = FOLDER_TABS[nextIndex];
      setActiveTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  };
  
  // AdminTuningDesk and Director see all departments, others see their active department
  const targetDepartmentId = (currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'Director')
    ? undefined 
    : currentUser?.activeDepartment?._id;

  const { data: folders, isLoading: isFoldersLoading, isError: isFoldersError, refetch: refetchFolders } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!currentUser,
  });

  // Role permissions: only AdminDepartment and Admin can manage folders when not in readOnly
  const canManageFolders = (currentUser?.role === 'AdminDepartment' || currentUser?.role === 'Admin') && !readOnly;
  
  const canViewFolders = currentUser?.role === 'Director' ||
                        currentUser?.role === 'Admin' || 
                        currentUser?.role === 'AdminTuningDesk' || 
                        currentUser?.role === 'AdminDepartment' ||
                        currentUser?.role === 'User';

  const handleFolderSelect = (folder: FolderType | null) => {
    if (folder) {
      setSelectedFolder(folder);
      setIsDocumentsModalOpen(true);
    }
  };

  const handleCloseDocumentsModal = () => {
    setIsDocumentsModalOpen(false);
    setSelectedFolder(null);
  };

  const getRoleBadge = () => {
    switch (currentUser?.role) {
      case 'AdminDepartment':
        return {
          text: t('folders.badge.manageDepartment'),
          className: 'bg-[#FFCB56] text-[#78350f] border border-[#FFD758]'
        };
      case 'Director':
        return {
          text: t('folders.badge.director'),
          className: 'bg-[#FFD758] text-[#1a202c] border border-[#FFCB56]'
        };
      case 'AdminTuningDesk':
        return {
          text: t('folders.badge.allDepartmentsMonitoring'),
          className: 'bg-blue-50 text-[#2c5282] border border-blue-200'
        };
      case 'User':
        return {
          text: t('folders.badge.readOnly'),
          className: 'bg-gray-100 text-gray-700 border border-gray-200'
        };
      default:
        return {
          text: t('folders.badge.leadership'),
          className: 'bg-slate-100 text-slate-800 border border-slate-200'
        };
    }
  };

  if (!canViewFolders) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded p-8 sm:p-10 text-center shadow-xs space-y-3">
        <ShieldCheck className="h-14 w-14 text-gray-400 mx-auto mb-2" />
        <h3 className="text-xl font-bold text-[#1a202c]">{t('folders.accessDenied.title')}</h3>
        <p className="text-base text-gray-600 leading-relaxed">{t('folders.accessDenied.description')}</p>
      </div>
    );
  }

  const roleBadge = getRoleBadge();

  return (
    <div className="space-y-5">
      {/* Header Block - AdminLTE Institutional Header */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded bg-[#2c5282]/10 border border-[#2c5282]/20 flex items-center justify-center flex-shrink-0 text-[#2c5282]">
            <Folder className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-[#1a202c]">
                {t('folders.banner.title')}
              </h2>
              <span className={`px-3 py-1 rounded text-xs sm:text-sm font-bold ${roleBadge.className}`}>
                {roleBadge.text}
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-1 leading-relaxed">
              {t('folders.banner.subtitle')}
            </p>
          </div>
        </div>

        {/* Department Info & Date Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-sm font-semibold text-gray-700 shadow-xs">
            <Building2 className="h-4 w-4 text-[#2c5282]" />
            <span>
              {currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'Director'
                ? t('folders.allDepartments')
                : currentUser?.activeDepartment?.name || t('folders.activeDepartmentFallback')}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-sm font-semibold text-gray-700 shadow-xs">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{formatArabicDate(new Date())}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div
        role="tablist"
        aria-label={t('folders.banner.title')}
        className="bg-white border border-[#e2e8f0] rounded p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-xs"
      >
        <button
          ref={(el) => { tabRefs.current.tree = el; }}
          id="folders-tab-tree"
          type="button"
          role="tab"
          aria-selected={activeTab === 'tree'}
          aria-controls="folders-tabpanel"
          tabIndex={activeTab === 'tree' ? 0 : -1}
          onClick={() => setActiveTab('tree')}
          onKeyDown={(e) => handleTabKeyDown(e, 0)}
          className={`h-11 min-h-[44px] px-5 py-2.5 rounded text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 transition-colors duration-200 ${
            activeTab === 'tree'
              ? 'bg-[#2c5282] text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-100 hover:text-[#2c5282]'
          }`}
        >
          <FolderTree className="h-5 w-5" />
          <span>{t('folders.tab.tree')}</span>
          <span className={`px-2.5 py-0.5 rounded text-xs sm:text-sm font-bold ${
            activeTab === 'tree' 
              ? 'bg-[#FFCB56] text-[#78350f]' 
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            {folders?.length || 0}
          </span>
        </button>

        <button
          ref={(el) => { tabRefs.current.categorization = el; }}
          id="folders-tab-categorization"
          type="button"
          role="tab"
          aria-selected={activeTab === 'categorization'}
          aria-controls="folders-tabpanel"
          tabIndex={activeTab === 'categorization' ? 0 : -1}
          onClick={() => setActiveTab('categorization')}
          onKeyDown={(e) => handleTabKeyDown(e, 1)}
          className={`h-11 min-h-[44px] px-5 py-2.5 rounded text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 transition-colors duration-200 ${
            activeTab === 'categorization'
              ? 'bg-[#2c5282] text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-100 hover:text-[#2c5282]'
          }`}
        >
          <Tag className="h-5 w-5" />
          <span>{t('folders.tab.categorization')}</span>
        </button>
      </div>

      {/* Tab Panel */}
      <div
        id="folders-tabpanel"
        role="tabpanel"
        aria-labelledby={activeTab === 'tree' ? 'folders-tab-tree' : 'folders-tab-categorization'}
      >
        {activeTab === 'tree' ? (
          <EnhancedFolderTree
            onFolderSelect={handleFolderSelect}
            selectedFolderId={selectedFolder?._id}
            departmentId={targetDepartmentId}
            readOnly={!canManageFolders}
          />
        ) : isFoldersLoading ? (
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full" />
            ))}
          </div>
        ) : isFoldersError ? (
          <EmptyState
            icon={<AlertCircle className="h-6 w-6 text-[#b91c1c]" />}
            title={t('folders.error.title')}
            description={t('folders.error.description')}
            className="border-red-200 bg-red-50/40"
            action={
              <Button
                type="button"
                onClick={() => refetchFolders()}
                className="h-11 px-5 bg-[#2c5282] hover:bg-[#1e3a5f] text-white text-base font-semibold rounded inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>{t('common.retry')}</span>
              </Button>
            }
          />
        ) : (
          <DocumentCategoryManager
            folders={folders || []}
            canManage={canManageFolders}
            departmentId={targetDepartmentId}
          />
        )}
      </div>

      {/* Documents Modal */}
      <FolderDocumentsModal
        selectedFolder={selectedFolder}
        isOpen={isDocumentsModalOpen}
        onClose={handleCloseDocumentsModal}
        canManage={canManageFolders}
      />
    </div>
  );
};

export default FolderManagement;
