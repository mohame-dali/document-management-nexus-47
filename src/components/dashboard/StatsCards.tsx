import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Users, 
  FolderOpen, 
  TrendingUp,
  CheckCircle,
  Building2
} from 'lucide-react';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';

interface StatsCardsProps {
  currentUser: User;
  currentYear: string;
  stats: {
    totalDocuments: number;
    totalIncoming: number;
    totalOutgoing: number;
    activeUsers: number;
    totalFolders: number;
    totalDepartments: number;
  };
  isLoading: boolean;
}

const StatsCards = ({ currentUser, currentYear, stats, isLoading }: StatsCardsProps) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Total Documents */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-[#2c5282] dark:border-t-blue-500 rounded-lg shadow-sm hover:shadow transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.stats.totalDocuments')}</CardTitle>
          <div className="p-2 bg-blue-50/90 dark:bg-blue-950/50 rounded-lg text-[#2c5282] dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60">
            <FileText className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16 bg-[#edf2f7] dark:bg-slate-800" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.totalDocuments}</div>
          )}
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
            {t('dashboard.stats.forYear', { year: currentYear })}
          </p>
        </CardContent>
      </Card>

      {/* Incoming Documents */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-emerald-500 rounded-lg shadow-sm hover:shadow transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.stats.incomingDocuments')}</CardTitle>
          <div className="p-2 bg-emerald-50/90 dark:bg-emerald-950/50 rounded-lg text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16 bg-[#edf2f7] dark:bg-slate-800" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.totalIncoming}</div>
          )}
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
            {t('dashboard.stats.incomingDocUnit')}
          </p>
        </CardContent>
      </Card>

      {/* Outgoing Documents */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-amber-500 rounded-lg shadow-sm hover:shadow transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.stats.outgoingDocuments')}</CardTitle>
          <div className="p-2 bg-amber-50/90 dark:bg-amber-950/50 rounded-lg text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60">
            <CheckCircle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16 bg-[#edf2f7] dark:bg-slate-800" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.totalOutgoing}</div>
          )}
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
            {t('dashboard.stats.outgoingDocUnit')}
          </p>
        </CardContent>
      </Card>

      {/* Dynamic 4th Card based on role */}
      {(currentUser?.role === 'Director' || currentUser?.role === 'Admin') ? (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-slate-400 dark:border-t-slate-500 rounded-lg shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.stats.departments')}</CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 bg-[#edf2f7] dark:bg-slate-800" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.totalDepartments}</div>
            )}
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
              {t('dashboard.stats.activeDepartmentUnit')}
            </p>
          </CardContent>
        </Card>
      ) : ['Admin', 'AdminDepartment'].includes(currentUser?.role || '') ? (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-emerald-500 rounded-lg shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.stats.activeUsers')}</CardTitle>
            <div className="p-2 bg-emerald-50/90 dark:bg-emerald-950/50 rounded-lg text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 bg-[#edf2f7] dark:bg-slate-800" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.activeUsers}</div>
            )}
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
              {t('dashboard.stats.activeUserUnit')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-indigo-500 rounded-lg shadow-sm hover:shadow transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.stats.folders')}</CardTitle>
            <div className="p-2 bg-indigo-50/90 dark:bg-indigo-950/50 rounded-lg text-indigo-700 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60">
              <FolderOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 bg-[#edf2f7] dark:bg-slate-800" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{stats.totalFolders}</div>
            )}
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
              {t('dashboard.stats.organizedFolderUnit')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsCards;
