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
      <div className="bg-white border border-[#e2e8f0] rounded p-8 text-center text-xs" dir="rtl">
        <ShieldCheck className="h-10 w-10 text-gray-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-gray-800 mb-1">غير مصرح بالوصول</h3>
        <p className="text-gray-500">ليس لديك الصلاحية لعرض نظام تصنيف المجلدات في هذا القسم.</p>
      </div>
    );
  }

  const roleBadge = getRoleBadge();

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Block - AdminLTE Institutional Header */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#2c5282]/10 border border-[#2c5282]/20 flex items-center justify-center flex-shrink-0 text-[#2c5282]">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1a202c]">
                نظام تصنيف وأرشفة المجلدات
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${roleBadge.className}`}>
                {roleBadge.text}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              تنظيم وتصنيف المراسلات الإدارية الرسمية بطريقة هرمية آمنة ومنهجية
            </p>
          </div>
        </div>

        {/* Department Info & Date Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f8fafc] border border-[#e2e8f0] text-xs text-gray-600">
            <Building2 className="h-3.5 w-3.5 text-[#2c5282]" />
            <span>
              {currentUser?.role === 'AdminTuningDesk'
                ? 'جميع الأقسام الإدارية'
                : currentUser?.activeDepartment?.name || 'القسم الإداري'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f8fafc] border border-[#e2e8f0] text-xs text-gray-600">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span>{formatArabicDate(new Date())}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded p-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('tree')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-200 ${
            activeTab === 'tree'
              ? 'bg-[#2c5282] text-white shadow-none'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#2c5282]'
          }`}
        >
          <FolderTree className="h-4 w-4" />
          <span>الهيكل الهرمي للمجلدات</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
            activeTab === 'tree' 
              ? 'bg-[#FFCB56] text-[#78350f] font-bold' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {folders?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categorization')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-200 ${
            activeTab === 'categorization'
              ? 'bg-[#2c5282] text-white shadow-none'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#2c5282]'
          }`}
        >
          <Tag className="h-4 w-4" />
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
