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
      <div className="p-4 sm:p-6 bg-[#f7fafc] min-h-[calc(100vh-4rem)] flex items-center justify-center" dir="rtl">
        <div className="bg-white border border-[#e2e8f0] rounded p-8 max-w-md w-full text-center space-y-3">
          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center mx-auto text-gray-500">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-[#1a202c]">ليس لديك صلاحية</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            ليس لديك الصلاحية لعرض إدارة مجلدات الأرشيف
          </p>
        </div>
      </div>
    );
  }

  // SuperAdmin, AdminTuningDesk and regular Users can view but not modify folders structure
  const readOnly = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'User';

  return (
    <div className="p-4 sm:p-6 bg-[#f7fafc] min-h-[calc(100vh-4rem)] space-y-4" dir="rtl">
      {/* Page Header - AdminLTE clean style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#e2e8f0]">
        <div>
          <h1 className="text-xl font-bold text-[#2c5282] flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-[#2c5282]" />
            إدارة المجلدات وتصنيف المستندات
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {readOnly 
              ? 'تصفح هيكل المجلدات والوثائق الإدارية المصنفة' 
              : 'إنشاء وتعديل وتنظيم الهيكل الشجري للمجلدات وتصنيف المراسلات'
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white border border-[#cbd5e1] text-gray-700">
            <Building2 className="h-3.5 w-3.5 text-[#2c5282]" />
            {currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'SuperAdmin'
              ? 'جميع الأقسام'
              : currentUser?.activeDepartment?.name || 'القسم النشط'}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
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
