import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Crown, 
  Shield
} from 'lucide-react';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';

interface UserStatisticsProps {
  currentUser: User;
  stats: {
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    adminDeptUsers: number;
    adminTuningUsers: number;
    regularUsers: number;
  };
  isLoading: boolean;
}

const UserStatistics = ({ currentUser, stats, isLoading }: UserStatisticsProps) => {
  const { t } = useLanguage();

  if (!['Admin', 'AdminDepartment'].includes(currentUser?.role || '')) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="bg-slate-50/90 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ebf4ff] dark:bg-slate-800 rounded-lg border border-[#bee3f8] dark:border-slate-700 text-[#2c5282] dark:text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#1a202c] dark:text-slate-100">
            {t('dashboard.userStats.title')}
          </h2>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Active Users */}
          <Card className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-emerald-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-xs font-medium text-[#22543d] dark:text-emerald-300">
                {t('dashboard.stats.activeUsers')}
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60">
                <UserCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#22543d] dark:text-emerald-400 tabular-nums">{stats.activeUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Inactive Users */}
          <Card className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-red-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-xs font-medium text-[#742a2a] dark:text-red-300">
                {t('dashboard.userStats.inactiveUsers')}
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-red-50/90 dark:bg-red-950/50 border border-red-200/70 dark:border-red-800/60">
                <UserX className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#742a2a] dark:text-red-400 tabular-nums">{stats.inactiveUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Admin Users */}
          <Card className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-[#2c5282] dark:border-t-blue-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-xs font-medium text-[#2c5282] dark:text-blue-300">
                {t('dashboard.userStats.admins')}
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60">
                <Crown className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#2c5282] dark:text-blue-400 tabular-nums">{stats.adminUsers}</div>
              )}
            </CardContent>
          </Card>

          {/* Department Admins */}
          <Card className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-slate-400 dark:border-t-slate-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-1">
              <CardTitle className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t('dashboard.userStats.departmentAdmins')}
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <Shield className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.adminDeptUsers}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Roles Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('dashboard.userStats.tuningDeskAdmins')}
            </span>
            <span className="text-base font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.adminTuningUsers}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('dashboard.userStats.regularUsers')}
            </span>
            <span className="text-base font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.regularUsers}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {t('dashboard.userStats.totalActive')}
            </span>
            <span className="text-base font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.activeUsers}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatistics;
