
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
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const currentDate = new Date();

  const getWelcomeMessage = () => {
    const role = currentUser?.role;
    switch (role) {
      case 'Admin':
        return 'مرحباً بك في لوحة تحكم الإدارة. لديك وصول كامل للنظام.';
      case 'AdminTuningDesk':
        return 'مرحباً بك في مركز رقمنة الوثائق. إدارة رقمنة الوثائق عبر جميع الأقسام.';
      case 'AdminDepartment':
        return `مرحباً بك في لوحة تحكم ${currentUser?.activeDepartment?.name || 'القسم'}. إدارة وثائق ومستخدمي قسمك.`;
      case 'User':
        return `مرحباً بك! يمكنك عرض الوثائق المخصصة لـ${currentUser?.activeDepartment?.name || 'قسمك'}.`;
      default:
        return 'مرحباً بك في نظام إدارة الوثائق.';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'مدير النظام';
      case 'AdminTuningDesk':
        return 'مدير مكتب الضبط';
      case 'AdminDepartment':
        return 'مدير القسم';
      case 'User':
        return 'مستخدم';
      default:
        return role;
    }
  };

  return (
    <div className="bg-white rounded border border-[#e2e8f0] p-6 shadow-sm" dir="rtl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-3 bg-[#ebf4ff] rounded border border-[#bee3f8] text-[#2c5282] shadow-xs">
              <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">
                {t('sidebar.dashboard')}
              </h1>
              <p className="text-base text-[#4a5568] mt-1 leading-relaxed">
                {getWelcomeMessage()}
              </p>
              {!isMobile && (
                <p className="text-sm text-[#718096] mt-1">
                  اليوم: {formatArabicDate(currentDate)}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Badge 
            variant="outline" 
            className="text-sm px-3 py-1.5 bg-[#ebf4ff] border-[#bee3f8] text-[#2c5282] rounded w-full sm:w-auto justify-center sm:justify-start font-medium"
          >
            <Building2 className="h-4 w-4 ml-1.5" />
            {getRoleDisplayName(currentUser?.role)}
          </Badge>
          
          <Badge 
            variant="secondary" 
            className="text-sm px-3 py-1.5 bg-[#edf2f7] text-[#1a202c] border border-[#e2e8f0] rounded w-full sm:w-auto justify-center sm:justify-start font-medium"
          >
            <Calendar className="h-4 w-4 ml-1.5" />
            {currentYear}
          </Badge>
          
          {isMobile && (
            <Badge 
              variant="outline" 
              className="text-sm px-3 py-1 w-full justify-center border-[#e2e8f0] text-[#718096] rounded"
            >
              {formatArabicDate(currentDate)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
