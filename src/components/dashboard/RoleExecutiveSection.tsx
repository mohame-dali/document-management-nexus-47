import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Cpu,
  Database,
  FileInput,
  FileOutput,
  GraduationCap,
  Mail,
  Network,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import {
  DashboardStatsData,
  DashboardSummaryData,
  getDashboardStatsAPI,
  getDashboardSummaryAPI,
  getSystemHealthAPI,
  triggerReindexFailedAPI,
} from '@/services/documentService';
import { getStages } from '@/services/rhStageService';
import { getPersonnelBalance } from '@/services/attendanceService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime as formatLocalizedDateTime } from '@/utils/formatDate';

interface RoleExecutiveSectionProps {
  currentUser: User;
  currentYear: string;
}

const RoleExecutiveSection: React.FC<RoleExecutiveSectionProps> = ({
  currentUser,
  currentYear,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const isRTL = language !== 'fr';
  const DirectionalArrow = isRTL ? ArrowLeft : ArrowRight;

  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useQuery<DashboardSummaryData>({
    queryKey: ['dashboardSummary', currentYear, currentUser._id, currentUser.activeDepartment?._id || 'none'],
    queryFn: () => getDashboardSummaryAPI(currentYear),
    enabled: Boolean(currentUser?._id),
    staleTime: 30 * 1000,
  });

  const { data: healthData } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: getSystemHealthAPI,
    enabled: currentUser?.role === 'Admin',
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });

  const myPersonnelId =
    summary?.department?.myPersonnelId ||
    (typeof currentUser?.personnelId === 'string'
      ? currentUser.personnelId
      : (currentUser?.personnelId as { _id?: string } | undefined)?._id) ||
    null;

  const showDepartmentSection =
    Boolean(summary?.department) ||
    (currentUser?.role === 'User') ||
    (currentUser?.role === 'AdminDepartment' && summary?.isRHAdmin === false);

  const { data: myBalance } = useQuery({
    queryKey: ['myAttendanceBalance', myPersonnelId, currentYear],
    queryFn: () => getPersonnelBalance(myPersonnelId as string, currentYear),
    enabled: Boolean(myPersonnelId) && showDepartmentSection,
    staleTime: 60 * 1000,
    retry: false,
  });

  const { data: boDocStats } = useQuery<DashboardStatsData>({
    queryKey: ['dashboardStats', currentYear],
    queryFn: () => getDashboardStatsAPI(currentYear),
    enabled: summary?.role === 'AdminTuningDesk',
    staleTime: 30 * 1000,
    retry: false,
  });

  const { data: activeStagesResponse } = useQuery({
    queryKey: ['rhStages', 'expiring-summary'],
    queryFn: () => getStages({ statut: 'en_cours', limit: 100 }),
    enabled: Boolean(summary?.isRHAdmin && summary?.hr),
    staleTime: 60 * 1000,
    retry: false,
  });

  const expiringStagesCount = React.useMemo(() => {
    const stages = activeStagesResponse?.data || [];
    if (!Array.isArray(stages) || stages.length === 0) return 0;
    const threshold = new Date();
    threshold.setHours(23, 59, 59, 999);
    threshold.setDate(threshold.getDate() + 14);
    return stages.filter((stage) => {
      if (!stage.dateFin) return false;
      const endDate = new Date(stage.dateFin);
      return !Number.isNaN(endDate.getTime()) && endDate <= threshold;
    }).length;
  }, [activeStagesResponse]);

  const reindexMutation = useMutation({
    mutationFn: triggerReindexFailedAPI,
    onSuccess: (res) => {
      const succeeded = res?.data?.totalSucceeded ?? 0;
      toast.success(t('dashboard.exec.reindexSuccess', { succeeded }));
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('dashboard.exec.reindexError');
      toast.error(message);
    },
  });

  const formatDateTime = (dateInput: string | Date) => {
    return formatLocalizedDateTime(dateInput, language);
  };

  const getAuditActionLabel = (action: string) => {
    const map: Record<string, string> = {
      document_delete: t('dashboard.audit.action.documentDelete'),
      user_create: t('dashboard.audit.action.userCreate'),
      user_update: t('dashboard.audit.action.userUpdate'),
      user_delete: t('dashboard.audit.action.userDelete'),
    };
    return map[action] || action.replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-5 space-y-4">
        <Skeleton className="h-6 w-56 bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <Skeleton key={idx} className="h-20 w-full bg-slate-100 dark:bg-slate-800/70" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t('dashboard.error.serverConnection')}</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="whitespace-nowrap shrink-0 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
        >
          <RefreshCw className="h-3.5 w-3.5 me-1.5" />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  // 1. SYSTEM ADMIN (Admin)
  if (summary.role === 'Admin' && summary.admin) {
    const { system, pendingPersonnelCount, recentCriticalAudit } = summary.admin;
    const dbConnected = (healthData?.database || system.mongodb) === 'connected';
    const workerAlive = system.aiWorker.alive;
    const modelsReady = system.aiWorker.modelsReady;
    const failedDocs = system.semanticIndex.failedDocs;

    return (
      <section className="space-y-5">
        {/* System & AI Health Strip */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('dashboard.exec.systemHealthTitle')}
              </h2>
            </div>
            {failedDocs > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => reindexMutation.mutate()}
                disabled={reindexMutation.isPending}
                className="h-8 px-3 bg-[#2c5282] hover:bg-[#1e3a5f] text-white text-xs font-medium whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 me-1.5 ${reindexMutation.isPending ? 'animate-spin' : ''}`}
                />
                {reindexMutation.isPending
                  ? t('dashboard.exec.reindexing')
                  : t('dashboard.exec.reindexFailed')}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x rtl:md:divide-x-reverse divide-slate-200 dark:divide-slate-800">
            {/* MongoDB */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Database className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                  {t('dashboard.exec.mongodbLabel')}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                  dbConnected
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {dbConnected ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {dbConnected ? t('dashboard.exec.connected') : t('dashboard.exec.disconnected')}
              </span>
            </div>

            {/* Isolated AI Worker */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Cpu className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                  {t('dashboard.exec.aiWorkerLabel')}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                  workerAlive
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : modelsReady
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-red-700 dark:text-red-400'
                }`}
              >
                {workerAlive ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('dashboard.exec.workerRunning')}
                  </>
                ) : modelsReady ? (
                  t('dashboard.exec.workerStandby')
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('dashboard.exec.modelsMissing')}
                  </>
                )}
              </span>
            </div>

            {/* Semantic Index */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                  {t('dashboard.exec.ragIndexLabel')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs tabular-nums whitespace-nowrap shrink-0">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {system.semanticIndex.indexedDocs} {t('dashboard.exec.indexedUnit')}
                </span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span
                  className={
                    failedDocs > 0
                      ? 'font-semibold text-red-700 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  {failedDocs} {t('dashboard.exec.failedUnit')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Provisioning + Critical Audit 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* Pending Account Provisioning */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t('dashboard.exec.pendingAccountsTitle')}
                </span>
                <UserPlus className="h-4 w-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {pendingPersonnelCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {pendingPersonnelCount > 0
                  ? t('dashboard.exec.pendingAccountsDesc')
                  : t('dashboard.exec.pendingAccountsEmpty')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/dashboard/admin/users/create')}
                className="flex-1 h-9 bg-[#2c5282] hover:bg-[#1e3a5f] text-white text-xs font-medium whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5 me-1.5" />
                {t('dashboard.exec.createAccountAction')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => navigate('/dashboard/hr/personnel')}
                className="h-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap"
              >
                {t('dashboard.exec.viewPersonnelAction')}
              </Button>
            </div>
          </div>

          {/* Latest 5 Critical Audit Entries */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('dashboard.exec.criticalAuditTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/audit-trail')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2c5282] dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>{t('dashboard.audit.viewAll')}</span>
                <DirectionalArrow className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentCriticalAudit.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {recentCriticalAudit.map((item) => (
                  <div
                    key={item._id}
                    className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {getAuditActionLabel(item.action)}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-300 truncate">
                        {item.username}
                      </span>
                      <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
                      <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                        {item.entityType}
                      </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                      <bdi dir={isRTL ? 'rtl' : 'ltr'}>{formatDateTime(item.createdAt)}</bdi>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.exec.criticalAuditEmpty')}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // 2. BUREAU D'ORDRE (AdminTuningDesk)
  if (summary.role === 'AdminTuningDesk' && summary.bureauOrdre) {
    const bo = summary.bureauOrdre;
    return (
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileInput className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('dashboard.exec.boPulseTitle')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/dashboard/mail/incoming/create')}
              className="h-9 px-3 bg-[#2c5282] hover:bg-[#1e3a5f] text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              <FileInput className="h-3.5 w-3.5 me-1.5" />
              {t('dashboard.exec.newIncoming')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate('/dashboard/mail/outgoing/create')}
              className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <FileOutput className="h-3.5 w-3.5 me-1.5" />
              {t('dashboard.exec.newOutgoing')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate('/dashboard/scan')}
              className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <ScanLine className="h-3.5 w-3.5 me-1.5" />
              {t('dashboard.exec.scanDocument')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 dark:divide-slate-800">
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.todayIncoming')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {bo.todayIncoming}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.todayOutgoing')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {bo.todayOutgoing}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.unroutedIncoming')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/mail/incoming')}
              className={`mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold hover:underline tabular-nums ${
                bo.unroutedIncoming > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              <span>{bo.unroutedIncoming}</span>
              <DirectionalArrow className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.unansweredIncoming')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/mail/incoming?status=pending')}
              className={`mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold hover:underline tabular-nums ${
                (boDocStats?.pending ?? 0) > 0
                  ? 'text-[#2c5282] dark:text-blue-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              <span>{boDocStats?.pending ?? 0}</span>
              <DirectionalArrow className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.activeOcrJobs')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {bo.activeOcrJobs}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // 3. HR ADMIN (AdminDepartment with activeDepartment === rhDepartmentId)
  if (summary.isRHAdmin && summary.hr) {
    const hr = summary.hr;
    return (
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('dashboard.exec.hrOverviewTitle')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/dashboard/hr/personnel/new')}
              className="h-9 px-3 bg-[#2c5282] hover:bg-[#1e3a5f] text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5 me-1.5" />
              {t('dashboard.exec.addPersonnel')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate('/dashboard/hr/attendance/report')}
              className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <CalendarCheck className="h-3.5 w-3.5 me-1.5" />
              {t('dashboard.exec.monthlyAttendance')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 dark:divide-slate-800">
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.activePersonnel')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {hr.activePersonnel}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.awaitingAccounts')}
            </p>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 ${
                hr.pendingAccounts > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {hr.pendingAccounts}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.todayAttendance')}
            </p>
            <div className="flex items-baseline gap-2 mt-1 tabular-nums">
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {hr.todayAttendance.present}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.exec.presentUnit')}
              </span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                {hr.todayAttendance.absent} {t('dashboard.exec.absentUnit')}
              </span>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.pendingDeclarations')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/hr/attendance-declarations')}
              className={`mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold hover:underline tabular-nums ${
                hr.pendingDeclarations > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-[#2c5282] dark:text-blue-400'
              }`}
            >
              <span>{hr.pendingDeclarations}</span>
              <DirectionalArrow className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{t('dashboard.exec.expiringInternships')}</span>
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/hr/stages')}
              className={`mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold hover:underline tabular-nums ${
                expiringStagesCount > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              <span>{expiringStagesCount}</span>
              <DirectionalArrow className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  // 4. GENERAL DIRECTOR (Director)
  if (summary.role === 'Director' && summary.director) {
    const dir = summary.director;
    return (
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('dashboard.exec.directorTitle')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/dashboard/admin/organization-chart')}
              className="h-9 px-3 bg-[#2c5282] hover:bg-[#1e3a5f] text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              <Network className="h-3.5 w-3.5 me-1.5" />
              {t('dashboard.exec.openOrgChart')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate('/dashboard/mail/incoming?status=urgent')}
              className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <AlertTriangle className="h-3.5 w-3.5 me-1.5" />
              {t('dashboard.exec.viewUrgentMail')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 dark:divide-slate-800">
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.totalIncomingYear')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {dir.incomingTotal}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.totalOutgoingYear')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {dir.outgoingTotal}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.unansweredIncoming')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/mail/incoming?status=pending')}
              className={`mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold hover:underline tabular-nums ${
                dir.unansweredIncoming > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              <span>{dir.unansweredIncoming}</span>
              <DirectionalArrow className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.unansweredUrgent')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/mail/incoming?status=urgent')}
              className={`mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold hover:underline tabular-nums ${
                dir.unansweredUrgentIncoming > 0
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              <span>{dir.unansweredUrgentIncoming}</span>
              <DirectionalArrow className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.activeDepartmentsCount')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {dir.activeDepartments}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // 5. DEPARTMENT ADMIN (non-RH) & USER
  if (summary.department) {
    const dept = summary.department;
    return (
      <section className="space-y-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-4 w-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {t('dashboard.exec.deptPulseTitle')}
                {dept.departmentName ? ` · ${dept.departmentName}` : ''}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/dashboard/messages')}
                className="h-9 px-3 bg-[#2c5282] hover:bg-[#1e3a5f] text-white text-xs font-medium whitespace-nowrap shrink-0"
              >
                <Mail className="h-3.5 w-3.5 me-1.5" />
                {t('dashboard.exec.openMessages')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => navigate('/dashboard/profile/my-attendance')}
                className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <CalendarCheck className="h-3.5 w-3.5 me-1.5" />
                {t('dashboard.exec.openMyAttendance')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 dark:divide-slate-800">
            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.exec.deptUnansweredIncoming')}
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/mail/incoming?status=pending')}
                className="mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100 hover:text-[#2c5282] dark:hover:text-blue-400 tabular-nums"
              >
                <span>{dept.unansweredIncoming}</span>
                <DirectionalArrow className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.exec.deptUrgentIncoming')}
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/mail/incoming?status=urgent')}
                className={`mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold hover:underline tabular-nums ${
                  dept.urgentIncoming > 0
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                <span>{dept.urgentIncoming}</span>
                <DirectionalArrow className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.exec.unreadMessages')}
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard/messages')}
                className="mt-1 inline-flex items-baseline gap-1.5 text-2xl font-bold text-[#2c5282] dark:text-blue-400 hover:underline tabular-nums"
              >
                <span>{dept.unreadMessagesCount}</span>
                <DirectionalArrow className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dashboard.exec.myLeaveBalance')}
              </p>
              {myBalance?.data ? (
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
                  {myBalance.data.soldeRestant}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {t('dashboard.exec.daysUnit')}
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/profile/my-attendance')}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2c5282] dark:text-blue-400 hover:underline"
                >
                  <span>{t('dashboard.exec.openMyAttendance')}</span>
                  <DirectionalArrow className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Internal Messages */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('dashboard.exec.recentMessagesTitle')}
            </h3>
            <button
              type="button"
              onClick={() => navigate('/dashboard/messages')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2c5282] dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              <span>{t('dashboard.audit.viewAll')}</span>
              <DirectionalArrow className="h-3.5 w-3.5" />
            </button>
          </div>

          {dept.recentMessages.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {dept.recentMessages.map((msg) => (
                <button
                  key={msg._id}
                  type="button"
                  onClick={() => navigate('/dashboard/messages')}
                  className="w-full px-5 py-3 flex items-center justify-between gap-3 text-start hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm truncate ${
                        msg.read
                          ? 'font-medium text-slate-700 dark:text-slate-300'
                          : 'font-bold text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {msg.subject}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{msg.senderUsername}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {msg.read ? t('dashboard.exec.readLabel') : t('dashboard.exec.unreadLabel')}
                      </span>
                      {msg.priority === 'urgent' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-red-700 dark:text-red-400">
                            {t('dashboard.exec.urgentPriority')}
                          </span>
                        </>
                      )}
                      {msg.priority === 'high' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            {t('dashboard.exec.highPriority')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                    <bdi dir={isRTL ? 'rtl' : 'ltr'}>{formatDateTime(msg.createdAt)}</bdi>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.exec.noRecentMessages')}
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
};

export default RoleExecutiveSection;
