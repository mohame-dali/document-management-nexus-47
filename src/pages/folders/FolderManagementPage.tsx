import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, FolderTree, Building2 } from 'lucide-react';
import FolderManagement from '@/components/folders/FolderManagement';
import { useLanguage } from '@/contexts/LanguageProvider';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';

const FolderManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const canViewFolders = currentUser?.role === 'Director' || 
                        currentUser?.role === 'Admin' || 
                        currentUser?.role === 'AdminTuningDesk' || 
                        currentUser?.role === 'AdminDepartment' ||
                        currentUser?.role === 'User';

  if (!canViewFolders) {
    return (
      <div className="p-6 sm:p-8 lg:p-10 bg-slate-50/70 dark:bg-slate-950 min-h-[calc(100vh-4rem)] flex items-center justify-center">
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

  // Director, AdminTuningDesk and regular Users can view but not modify folders structure
  const readOnly = currentUser?.role === 'Director' || currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'User';

  return (
    <div className="p-5 sm:p-6 lg:p-8 bg-slate-50/70 dark:bg-slate-950 min-h-[calc(100vh-4rem)] space-y-5 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <PageBreadcrumb
        showHomeIcon
        homeTo="/dashboard"
        homeLabel={t('common.home')}
        items={[
          { label: t('documents.viewIncoming.breadcrumb.mailHub'), to: '/dashboard/mail/incoming' },
          { label: t('folders.page.title') },
        ]}
      />

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] dark:text-sky-300 flex items-center gap-3">
            <FolderTree className="h-7 w-7 text-[#2c5282] dark:text-sky-400 flex-shrink-0" />
            <span>{t('folders.page.title')}</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
            {readOnly 
              ? t('folders.page.subtitleReadOnly')
              : t('folders.page.subtitleManage')
            }
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            <Building2 className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
            <span>
              {currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'Director'
                ? t('folders.page.allDepartments')
                : currentUser?.activeDepartment?.name || t('folders.page.activeDepartmentFallback')}
            </span>
          </span>
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
            {readOnly ? t('folders.page.badgeReadOnly') : t('folders.page.badgeFullAccess')}
          </span>
        </div>
      </div>

      {/* Main Folder Management Component */}
      <FolderManagement readOnly={readOnly} />
    </div>
  );
};

export default FolderManagementPage;
