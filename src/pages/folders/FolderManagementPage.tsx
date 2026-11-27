import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { extractDeptMeta, isBureauOrdreUserAccount } from '@/utils/departmentScope';
import FolderManagement from '@/components/folders/FolderManagement';

const FolderManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { dir } = useDirection();

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
    enabled: !!currentUser,
  });

  const canViewFolders =
    currentUser?.role === 'Director' ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'AdminTuningDesk' ||
    currentUser?.role === 'AdminDepartment' ||
    currentUser?.role === 'User';

  if (!canViewFolders) {
    return (
      <div
        dir={dir}
        className="p-6 sm:p-8 lg:p-10 bg-slate-50/70 dark:bg-slate-950 min-h-[calc(100vh-4rem)] flex items-center justify-center"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-8 sm:p-10 max-w-lg w-full text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-700 dark:text-slate-300">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c] dark:text-slate-100">
            {t('folders.page.accessDenied.title')}
          </h2>
          <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            {t('folders.page.accessDenied.description')}
          </p>
        </div>
      </div>
    );
  }

  const bureauOrdreDeptId = extractDeptMeta(orgSettings?.bureauOrdreDepartmentId).id;
  const isBureauOrdreUser = isBureauOrdreUserAccount(currentUser, bureauOrdreDeptId);

  // Director, AdminTuningDesk, Bureau d'Ordre (bo), and regular Users have strict read-only access
  const readOnly =
    currentUser?.role === 'Director' ||
    currentUser?.role === 'AdminTuningDesk' ||
    currentUser?.role === 'User' ||
    isBureauOrdreUser;

  return (
    <div
      dir={dir}
      className="p-4 sm:p-6 lg:p-8 bg-slate-50/70 dark:bg-slate-950 min-h-[calc(100vh-4rem)] max-w-[1600px] mx-auto"
    >
      <FolderManagement readOnly={readOnly} />
    </div>
  );
};

export default FolderManagementPage;
