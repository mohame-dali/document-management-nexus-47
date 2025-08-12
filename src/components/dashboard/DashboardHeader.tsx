
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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 card-responsive animate-fade-in-up" dir="rtl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
        <div className="flex-1 space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {t('sidebar.dashboard')}
              </h1>
              <p className="text-responsive-base text-slate-600 mt-1 leading-relaxed">
                {getWelcomeMessage()}
              </p>
              {!isMobile && (
                <p className="text-responsive-sm text-slate-500 mt-1">
                  اليوم: {formatArabicDate(currentDate)}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Badge 
            variant="outline" 
            className="text-responsive-sm px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 w-full sm:w-auto justify-center sm:justify-start"
          >
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            {getRoleDisplayName(currentUser?.role)}
          </Badge>
          
          <Badge 
            variant="secondary" 
            className="text-responsive-xs px-2 py-1 sm:px-3 sm:py-1 w-full sm:w-auto justify-center sm:justify-start"
          >
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            {currentYear}
          </Badge>
          
          {isMobile && (
            <Badge 
              variant="outline" 
              className="text-responsive-xs px-2 py-1 w-full justify-center border-slate-200"
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
