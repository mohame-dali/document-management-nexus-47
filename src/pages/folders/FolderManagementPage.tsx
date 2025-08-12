
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import FolderManagement from '@/components/folders/FolderManagement';
import { useIsMobile } from '@/hooks/use-mobile';

const FolderManagementPage = () => {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();

  const canViewFolders = currentUser?.role === 'SuperAdmin' || 
                        currentUser?.role === 'Admin' || 
                        currentUser?.role === 'AdminTuningDesk' || 
                        currentUser?.role === 'AdminDepartment' ||
                        currentUser?.role === 'User';

  if (!canViewFolders) {
    return (
      <div className="container-responsive padding-responsive animate-fade-in-up" dir="rtl">
        <Card className="enhanced-card">
          <CardContent className="padding-responsive-lg text-center space-y-4">
            <Lock className="h-12 w-12 mx-auto text-gray-400" />
            <div className="space-y-2">
              <h2 className="text-responsive-lg font-medium text-gray-600">ليس لديك صلاحية</h2>
              <p className="text-responsive-sm text-gray-500 leading-relaxed">
                ليس لديك الصلاحية لعرض إدارة المجلدات
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SuperAdmin and AdminTuningDesk can view but not modify folders
  const readOnly = currentUser?.role === 'SuperAdmin' || currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'User';

  return (
    <div className="container-responsive padding-responsive-sm animate-fade-in-up" dir="rtl">
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-responsive-xl font-bold gradient-text">
            إدارة المجلدات
          </h1>
          <p className="text-responsive-sm text-muted-foreground">
            {readOnly 
              ? 'عرض المجلدات والوثائق المصنفة' 
              : 'إنشاء وتعديل وإدارة هيكل المجلدات'
            }
          </p>
        </div>

        {/* Folder Management Component */}
        <div className="animate-scale-in">
          <FolderManagement readOnly={readOnly} />
        </div>
      </div>
    </div>
  );
};

export default FolderManagementPage;
