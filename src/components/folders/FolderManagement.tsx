import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getFolders } from '@/services/folderService';
import { 
  FolderTree, 
  Tag, 
  Building2, 
  Calendar, 
  FileText, 
  ShieldCheck,
  Eye,
  Settings,
  Folder
} from 'lucide-react';
import EnhancedFolderTree from './EnhancedFolderTree';
import DocumentCategoryManager from './DocumentCategoryManager';
import { FolderDocumentsModal } from './FolderDocumentsModal';
import { Folder as FolderType } from '@/types';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface FolderManagementProps {
  readOnly?: boolean;
}

const FolderManagement: React.FC<FolderManagementProps> = ({ readOnly = false }) => {
  const { currentUser } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'categorization'>('tree');
  
  // AdminTuningDesk sees all departments, others see their active department
  const targetDepartmentId = currentUser?.role === 'AdminTuningDesk' 
    ? undefined 
    : currentUser?.activeDepartment?._id;

  const { data: folders } = useQuery({
    queryKey: ['folders', targetDepartmentId],
    queryFn: () => getFolders(targetDepartmentId),
    enabled: !!currentUser,
  });

  // Role permissions
  const canManageFolders = currentUser?.role === 'AdminDepartment' && !readOnly;
  
  const canViewFolders = currentUser?.role === 'SuperAdmin' ||
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
          text: 'إدارة كاملة للقسم',
          className: 'bg-[#FFCB56] text-[#78350f] border border-[#FFD758]'
        };
      case 'AdminTuningDesk':
        return {
          text: 'مراقبة شاملة للأقسام',
          className: 'bg-blue-50 text-[#2c5282] border border-blue-200'
        };
      case 'User':
        return {
          text: 'عرض واستعلام فقط',
          className: 'bg-gray-100 text-gray-700 border border-gray-200'
        };
      default:
        return {
          text: 'صلاحيات قيادية',
          className: 'bg-slate-100 text-slate-800 border border-slate-200'
        };
    }
  };

  if (!canViewFolders) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded p-8 sm:p-10 text-center shadow-xs space-y-3" dir="rtl">
        <ShieldCheck className="h-14 w-14 text-gray-400 mx-auto mb-2" />
        <h3 className="text-xl font-bold text-[#1a202c]">غير مصرح بالوصول</h3>
        <p className="text-base text-gray-600 leading-relaxed">ليس لديك الصلاحية لعرض نظام تصنيف المجلدات في هذا القسم.</p>
      </div>
    );
  }

  const roleBadge = getRoleBadge();

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Block - AdminLTE Institutional Header */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded bg-[#2c5282]/10 border border-[#2c5282]/20 flex items-center justify-center flex-shrink-0 text-[#2c5282]">
            <Folder className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-[#1a202c]">
                نظام تصنيف وأرشفة المجلدات
              </h2>
              <span className={`px-3 py-1 rounded text-xs sm:text-sm font-bold ${roleBadge.className}`}>
                {roleBadge.text}
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-1 leading-relaxed">
              تنظيم وتصنيف المراسلات الإدارية الرسمية بطريقة هرمية آمنة ومنهجية
            </p>
          </div>
        </div>

        {/* Department Info & Date Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-sm font-semibold text-gray-700 shadow-xs">
            <Building2 className="h-4 w-4 text-[#2c5282]" />
            <span>
              {currentUser?.role === 'AdminTuningDesk'
                ? 'جميع الأقسام الإدارية'
                : currentUser?.activeDepartment?.name || 'القسم الإداري'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-sm font-semibold text-gray-700 shadow-xs">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{formatArabicDate(new Date())}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('tree')}
          className={`h-11 min-h-[44px] px-5 py-2.5 rounded text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 transition-colors duration-200 ${
            activeTab === 'tree'
              ? 'bg-[#2c5282] text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-100 hover:text-[#2c5282]'
          }`}
        >
          <FolderTree className="h-5 w-5" />
          <span>الهيكل الهرمي للمجلدات</span>
          <span className={`px-2.5 py-0.5 rounded text-xs sm:text-sm font-bold ${
            activeTab === 'tree' 
              ? 'bg-[#FFCB56] text-[#78350f]' 
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}>
            {folders?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categorization')}
          className={`h-11 min-h-[44px] px-5 py-2.5 rounded text-sm sm:text-base font-bold flex items-center justify-center gap-2.5 transition-colors duration-200 ${
            activeTab === 'categorization'
              ? 'bg-[#2c5282] text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-100 hover:text-[#2c5282]'
          }`}
        >
          <Tag className="h-5 w-5" />
          <span>تصنيف المراسلات غير المصنفة</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'tree' ? (
        <EnhancedFolderTree
          onFolderSelect={handleFolderSelect}
          selectedFolderId={selectedFolder?._id}
          departmentId={targetDepartmentId}
          readOnly={!canManageFolders}
        />
      ) : (
        <DocumentCategoryManager
          folders={folders || []}
          canManage={canManageFolders}
          departmentId={targetDepartmentId}
        />
      )}

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
