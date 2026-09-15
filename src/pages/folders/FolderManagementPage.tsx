import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, FolderTree, Building2 } from 'lucide-react';
import FolderManagement from '@/components/folders/FolderManagement';

const FolderManagementPage: React.FC = () => {
  const { currentUser } = useAuth();

  const canViewFolders = currentUser?.role === 'SuperAdmin' || 
                        currentUser?.role === 'Admin' || 
                        currentUser?.role === 'AdminTuningDesk' || 
                        currentUser?.role === 'AdminDepartment' ||
                        currentUser?.role === 'User';

  if (!canViewFolders) {
    return (
      <div className="p-6 sm:p-8 lg:p-10 bg-[#f7fafc] min-h-[calc(100vh-4rem)] flex items-center justify-center" dir="rtl">
        <div className="bg-white border border-[#e2e8f0] rounded p-8 sm:p-10 max-w-lg w-full text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center mx-auto text-gray-500">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c]">ليس لديك صلاحية</h2>
          <p className="text-base text-gray-600 leading-relaxed">
            ليس لديك الصلاحية لعرض إدارة مجلدات الأرشيف في هذا القسم الإداري
          </p>
        </div>
      </div>
    );
  }

  // SuperAdmin, AdminTuningDesk and regular Users can view but not modify folders structure
  const readOnly = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'User';

  return (
    <div className="p-5 sm:p-6 lg:p-8 bg-[#f7fafc] min-h-[calc(100vh-4rem)] space-y-6 max-w-[1600px] mx-auto" dir="rtl">
      {/* Page Header - AdminLTE clean style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] flex items-center gap-3">
            <FolderTree className="h-7 w-7 text-[#2c5282] flex-shrink-0" />
            <span>إدارة المجلدات وتصنيف المستندات</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1.5 leading-relaxed">
            {readOnly 
              ? 'تصفح هيكل المجلدات والوثائق الإدارية المصنفة' 
              : 'إنشاء وتعديل وتنظيم الهيكل الشجري للمجلدات وتصنيف المراسلات'
            }
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded text-sm font-semibold bg-white border border-[#cbd5e1] text-gray-700 shadow-xs">
            <Building2 className="h-4 w-4 text-[#2c5282]" />
            <span>
              {currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'SuperAdmin'
                ? 'جميع الأقسام'
                : currentUser?.activeDepartment?.name || 'القسم النشط'}
            </span>
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded text-sm font-bold bg-[#FFCB56] text-[#78350f] border border-[#FFD758] shadow-xs">
            {readOnly ? 'للعرض فقط' : 'إدارة كاملة'}
          </span>
        </div>
      </div>

      {/* Main Folder Management Component */}
      <FolderManagement readOnly={readOnly} />
    </div>
  );
};

export default FolderManagementPage;
