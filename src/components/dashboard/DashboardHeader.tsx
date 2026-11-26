import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageProvider';
import { BarChart3, Building2, Calendar } from 'lucide-react';
import { User } from '@/types';
import { formatDateWithWeekday } from '@/utils/formatDate';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardHeaderProps {
  currentUser: User;
  currentYear: string;
}

const DashboardHeader = ({ currentUser, currentYear }: DashboardHeaderProps) => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const currentDate = new Date();

  const formattedDate = formatDateWithWeekday(currentDate, language);
  const dateDir = language === 'fr' ? 'ltr' : 'rtl';

  const getWelcomeMessage = () => {
    const role = currentUser?.role;
    switch (role) {
      case 'Admin':
        return t('dashboard.header.welcomeAdmin');
      case 'Director':
        return t('dashboard.header.welcomeDirector');
      case 'AdminTuningDesk':
        return t('dashboard.header.welcomeBureauOrdre');
      case 'AdminDepartment':
        return t('dashboard.header.welcomeDepartmentHead', {
          name: currentUser?.activeDepartment?.name || t('dashboard.header.defaultDepartment'),
        });
      case 'User':
        return t('dashboard.header.welcomeUser', {
          name: currentUser?.activeDepartment?.name || t('dashboard.header.yourDepartment'),
        });
      default:
        return t('dashboard.header.welcomeDefault');
    }
  };

  const getRoleDisplayName = (role?: string) => {
    if (!role) return '';
    const roleKey = `roles.${role}`;
    const translated = t(roleKey);
    return translated !== roleKey ? translated : role;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2.5 bg-[#ebf4ff] dark:bg-slate-800 rounded-lg border border-[#bee3f8] dark:border-slate-700 text-[#2c5282] dark:text-blue-400 shadow-xs">
              <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100">
                {t('sidebar.dashboard')}
              </h1>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                {getWelcomeMessage()}
              </p>
              {!isMobile && (
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 tabular-nums">
                  {t('dashboard.header.today')}: <bdi dir={dateDir}>{formattedDate}</bdi>
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Badge 
            variant="outline" 
            className="text-xs px-3 py-1.5 bg-[#ebf4ff] dark:bg-slate-800 border-[#bee3f8] dark:border-slate-700 text-[#2c5282] dark:text-blue-300 rounded-full w-full sm:w-auto justify-center sm:justify-start font-medium"
          >
            <Building2 className="h-3.5 w-3.5 me-1.5" />
            {getRoleDisplayName(currentUser?.role)}
          </Badge>
          
          <Badge 
            variant="secondary" 
            className="text-xs px-3 py-1.5 bg-[#edf2f7] dark:bg-slate-800 text-[#1a202c] dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-full w-full sm:w-auto justify-center sm:justify-start font-medium tabular-nums"
          >
            <Calendar className="h-3.5 w-3.5 me-1.5" />
            {currentYear}
          </Badge>
          
          {isMobile && (
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-1 w-full justify-center border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-full tabular-nums"
            >
              <bdi dir={dateDir}>{formattedDate}</bdi>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
