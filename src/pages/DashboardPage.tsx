import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutDashboard,
  RefreshCw,
  UserPlus,
  UserX,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import {
  DashboardSummaryData,
  ExecutiveFollowUpDocument,
  getDashboardSummaryAPI,
} from '@/services/documentService';
import { formatShortDate, formatDateWithWeekday } from '@/utils/formatDate';
import { isExecutiveDashboardUser } from '@/utils/roleUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const isRTL = language !== 'fr';
  const dir = isRTL ? 'rtl' : 'ltr';
  const currentYear = new Date().getFullYear().toString();
  const formattedToday = formatDateWithWeekday(new Date(), language);
  const DirectionalArrow = isRTL ? ArrowLeft : ArrowRight;
  const RowChevron = isRTL ? ChevronLeft : ChevronRight;

  const canAccess = isExecutiveDashboardUser(currentUser);

  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<DashboardSummaryData>({
    queryKey: ['dashboardSummary', currentYear, currentUser?._id],
    queryFn: () => getDashboardSummaryAPI(currentYear),
    enabled: Boolean(currentUser?._id && canAccess),
    staleTime: 30 * 1000,
  });

  if (!currentUser || !canAccess) return null;

  const executive = summary?.executive;
  const urgentOrOverdueCount = executive?.urgentOrOverdueCount ?? 0;
  const unassignedResponsibleCount = executive?.unassignedResponsibleCount ?? 0;
  const pendingHrRequestsCount = executive?.pendingHrRequestsCount ?? 0;
  const followUpDocuments: ExecutiveFollowUpDocument[] = executive?.followUpDocuments ?? [];

  const getRoleDisplayName = (role?: string) => {
    if (!role) return '';
    const roleKey = `roles.${role}`;
    const translated = t(roleKey);
    return translated !== roleKey ? translated : role;
  };

  const renderStatusPill = (doc: ExecutiveFollowUpDocument) => {
    if (doc.urgencyStatus === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70 whitespace-nowrap">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{t('dashboard.executive.status.overdue')}</span>
        </span>
      );
    }

    if (doc.urgencyStatus === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{t('dashboard.executive.status.urgent')}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 whitespace-nowrap">
        <UserX className="w-3.5 h-3.5 shrink-0" />
        <span>{t('dashboard.executive.status.unassigned')}</span>
      </span>
    );
  };

  const handleRowClick = (docId: string) => {
    navigate(`/dashboard/mail/incoming/${docId}`);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, docId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(docId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950" dir={dir}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Executive Header */}
        <header className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="p-2.5 bg-[#ebf4ff] dark:bg-slate-800 rounded-lg border border-[#bee3f8] dark:border-slate-700 text-[#2c5282] dark:text-blue-400 shrink-0">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {t('dashboard.executive.title')}
                </h1>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {t('dashboard.executive.subtitle')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                  {t('dashboard.header.today')}:{' '}
                  <bdi dir={isRTL ? 'rtl' : 'ltr'}>{formattedToday}</bdi>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="text-xs px-3 py-1.5 bg-[#ebf4ff] dark:bg-slate-800 border-[#bee3f8] dark:border-slate-700 text-[#2c5282] dark:text-blue-300 rounded-full font-medium whitespace-nowrap"
              >
                <Building2 className="h-3.5 w-3.5 me-1.5 shrink-0" />
                {getRoleDisplayName(currentUser.role)}
              </Badge>

              <Badge
                variant="secondary"
                className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-full font-medium tabular-nums whitespace-nowrap"
              >
                <Calendar className="h-3.5 w-3.5 me-1.5 shrink-0" />
                {currentYear}
              </Badge>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 gap-1.5"
              >
                <RefreshCw className={cn('h-3.5 w-3.5 shrink-0', isFetching && 'animate-spin')} />
                <span>{t('dashboard.executive.refresh')}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {isError && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {t('dashboard.executive.errorLoading')}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => refetch()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('common.retry')}</span>
            </Button>
          </div>
        )}

        {/* 3 Decision KPIs */}
        <section aria-label={t('dashboard.executive.title')}>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-9 w-9 rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3.5 w-56" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* KPI 1: Urgent / Overdue Incoming Mail */}
              <button
                type="button"
                onClick={() => navigate('/dashboard/mail/incoming?urgency=true')}
                className={cn(
                  'group bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-xs transition-all text-start flex flex-col justify-between gap-3 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]',
                  urgentOrOverdueCount > 0
                    ? 'border-red-200/90 dark:border-red-900/60 hover:border-red-300 dark:hover:border-red-700'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t('dashboard.executive.kpi.urgentOverdue')}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                      {t('dashboard.executive.kpi.urgentOverdueDesc')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-10 h-10 rounded-lg border shrink-0',
                      urgentOrOverdueCount > 0
                        ? 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    )}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </span>
                </div>
                <div className="flex items-end justify-between w-full pt-1">
                  <span
                    className={cn(
                      'text-3xl font-bold tabular-nums leading-none',
                      urgentOrOverdueCount > 0
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-slate-900 dark:text-slate-100'
                    )}
                  >
                    <bdi dir="ltr">{urgentOrOverdueCount}</bdi>
                  </span>
                  <DirectionalArrow className="w-4 h-4 text-slate-400 group-hover:text-[#2c5282] dark:group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
              </button>

              {/* KPI 2: Unassigned Incoming Mail */}
              <button
                type="button"
                onClick={() => navigate('/dashboard/mail/incoming?status=pending')}
                className={cn(
                  'group bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-xs transition-all text-start flex flex-col justify-between gap-3 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]',
                  unassignedResponsibleCount > 0
                    ? 'border-amber-200/90 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t('dashboard.executive.kpi.unassigned')}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                      {t('dashboard.executive.kpi.unassignedDesc')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-10 h-10 rounded-lg border shrink-0',
                      unassignedResponsibleCount > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    )}
                  >
                    <UserPlus className="w-5 h-5" />
                  </span>
                </div>
                <div className="flex items-end justify-between w-full pt-1">
                  <span
                    className={cn(
                      'text-3xl font-bold tabular-nums leading-none',
                      unassignedResponsibleCount > 0
                        ? 'text-amber-800 dark:text-amber-300'
                        : 'text-slate-900 dark:text-slate-100'
                    )}
                  >
                    <bdi dir="ltr">{unassignedResponsibleCount}</bdi>
                  </span>
                  <DirectionalArrow className="w-4 h-4 text-slate-400 group-hover:text-[#2c5282] dark:group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
              </button>

              {/* KPI 3: Pending HR Notifications / Requests */}
              <button
                type="button"
                onClick={() => navigate('/dashboard/hr/attendance-declarations')}
                className={cn(
                  'group bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-xs transition-all text-start flex flex-col justify-between gap-3 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282]',
                  pendingHrRequestsCount > 0
                    ? 'border-blue-200/90 dark:border-blue-900/60 hover:border-blue-300 dark:hover:border-blue-700'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t('dashboard.executive.kpi.pendingHr')}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                      {t('dashboard.executive.kpi.pendingHrDesc')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-10 h-10 rounded-lg border shrink-0',
                      pendingHrRequestsCount > 0
                        ? 'bg-blue-50 text-[#2c5282] border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    )}
                  >
                    <CalendarClock className="w-5 h-5" />
                  </span>
                </div>
                <div className="flex items-end justify-between w-full pt-1">
                  <span
                    className={cn(
                      'text-3xl font-bold tabular-nums leading-none',
                      pendingHrRequestsCount > 0
                        ? 'text-[#2c5282] dark:text-blue-300'
                        : 'text-slate-900 dark:text-slate-100'
                    )}
                  >
                    <bdi dir="ltr">{pendingHrRequestsCount}</bdi>
                  </span>
                  <DirectionalArrow className="w-4 h-4 text-slate-400 group-hover:text-[#2c5282] dark:group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
              </button>
            </div>
          )}
        </section>

        {/* Actionable Follow-Up Table */}
        <section className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('dashboard.executive.table.title')}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {t('dashboard.executive.table.subtitle')}
              </p>
            </div>

            {!isLoading && (
              <Badge
                variant="outline"
                className="w-fit text-xs font-semibold px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 tabular-nums whitespace-nowrap shrink-0"
              >
                <bdi dir="ltr">{followUpDocuments.length}</bdi>
              </Badge>
            )}
          </div>

          {isLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : followUpDocuments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                className="border-0 py-8"
                icon={<CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                title={t('dashboard.executive.emptyTitle')}
                description={t('dashboard.executive.emptyDesc')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/90 dark:bg-slate-800/70">
                  <TableRow className="border-slate-200/80 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="w-[120px] font-bold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {t('dashboard.executive.table.colReference')}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-700 dark:text-slate-200">
                      {t('dashboard.executive.table.colSubject')}
                    </TableHead>
                    <TableHead className="w-[210px] font-bold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {t('dashboard.executive.table.colDepartment')}
                    </TableHead>
                    <TableHead className="w-[140px] font-bold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {t('dashboard.executive.table.colArrivalDate')}
                    </TableHead>
                    <TableHead className="w-[220px] font-bold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {t('dashboard.executive.table.colStatus')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followUpDocuments.map((doc) => {
                    const deptLabel =
                      doc.departments && doc.departments.length > 0
                        ? doc.departments.join(' · ')
                        : t('dashboard.executive.table.noDepartment');

                    return (
                      <TableRow
                        key={doc._id}
                        tabIndex={0}
                        role="button"
                        onClick={() => handleRowClick(doc._id)}
                        onKeyDown={(e) => handleRowKeyDown(e, doc._id)}
                        className={cn(
                          'cursor-pointer border-slate-100 dark:border-slate-800/80 transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:bg-blue-50/60 dark:focus-visible:bg-blue-950/30',
                          doc.urgencyStatus === 'overdue' && 'border-s-2 border-s-red-500',
                          doc.urgencyStatus === 'urgent' && 'border-s-2 border-s-amber-500'
                        )}
                      >
                        <TableCell className="py-3.5 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 tabular-nums">
                            <bdi dir="ltr">#{doc.serialNumber}/{doc.year}</bdi>
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 align-middle min-w-[220px] max-w-md">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {doc.subject}
                          </p>
                          {doc.activity && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {doc.activity}
                              {doc.dateActivity && (
                                <span className="ms-1.5 tabular-nums">
                                  (<bdi dir="ltr">{formatShortDate(doc.dateActivity)}</bdi>)
                                </span>
                              )}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="py-3.5 align-middle">
                          <span
                            className={cn(
                              'text-xs font-medium line-clamp-1',
                              doc.departments.length > 0
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-500 dark:text-slate-400 italic'
                            )}
                          >
                            {deptLabel}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 align-middle text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          {doc.arrivalDate ? (
                            <bdi dir="ltr">{formatShortDate(doc.arrivalDate)}</bdi>
                          ) : (
                            '—'
                          )}
                        </TableCell>

                        <TableCell className="py-3.5 align-middle">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {renderStatusPill(doc)}
                              {doc.isUrgentOrOverdue && !doc.hasResponsible && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 whitespace-nowrap">
                                  <UserX className="w-3 h-3 shrink-0" />
                                  <span>{t('dashboard.executive.table.noResponsibleBadge')}</span>
                                </span>
                              )}
                            </div>
                            <RowChevron className="w-4 h-4 text-slate-400 shrink-0" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
