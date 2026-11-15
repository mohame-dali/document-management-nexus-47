import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageProvider';
import { BarChart3, Building2, Calendar } from 'lucide-react';
import { User } from '@/types';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardHeaderProps {
  currentUser: User;
  currentYear: string;
}

const DashboardHeader = ({ currentUser, currentYear }: DashboardHeaderProps) => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const currentDate = new Date();

  const formattedDate = language === 'fr'
    ? currentDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : formatArabicDate(currentDate);

  const getWelcomeMessage = () => {
    const role = currentUser?.role;
    switch (role) {
      case 'Admin':
        return t('dashboard.header.welcomeAdmin');
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
    <div className="bg-white rounded border border-[#e2e8f0] p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2.5 bg-[#ebf4ff] rounded border border-[#bee3f8] text-[#2c5282] shadow-xs">
              <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">
                {t('sidebar.dashboard')}
              </h1>
              <p className="text-sm text-[#4a5568] mt-1 leading-relaxed">
                {getWelcomeMessage()}
              </p>
              {!isMobile && (
                <p className="text-xs text-[#718096] mt-1">
                  {t('dashboard.header.today')}: {formattedDate}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Badge 
            variant="outline" 
            className="text-xs px-3 py-1.5 bg-[#ebf4ff] border-[#bee3f8] text-[#2c5282] rounded w-full sm:w-auto justify-center sm:justify-start font-medium"
          >
            <Building2 className="h-3.5 w-3.5 me-1.5" />
            {getRoleDisplayName(currentUser?.role)}
          </Badge>
          
          <Badge 
            variant="secondary" 
            className="text-xs px-3 py-1.5 bg-[#edf2f7] text-[#1a202c] border border-[#e2e8f0] rounded w-full sm:w-auto justify-center sm:justify-start font-medium"
          >
            <Calendar className="h-3.5 w-3.5 me-1.5" />
            {currentYear}
          </Badge>
          
          {isMobile && (
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-1 w-full justify-center border-[#e2e8f0] text-[#718096] rounded"
            >
              {formattedDate}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
