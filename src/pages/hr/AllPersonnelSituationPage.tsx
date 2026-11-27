import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useDirection } from '@/i18n/useDirection';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  FileDown,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getDailyAttendance,
  getMonthlyReport,
  getYearlyReport,
  AttendanceRecord,
} from '@/services/attendanceService';
import { getDepartments } from '@/services/departmentService';
import { getLeaveReasons, LeaveReason } from '@/services/leaveReasonService';
import { Department } from '@/types';
import { useAttendanceExport } from '@/hooks/useAttendanceExport';

import AllPersonnelKPICards, { KPICounts } from '@/components/attendance/AllPersonnelKPICards';
import AllPersonnelDayView, { DayPersonnelItem } from '@/components/attendance/AllPersonnelDayView';
import AllPersonnelWeekView, { WeekPersonnelSummary } from '@/components/attendance/AllPersonnelWeekView';
import AllPersonnelMonthView, { MonthPersonnelRecord } from '@/components/attendance/AllPersonnelMonthView';
import AllPersonnelYearView, { YearPersonnelRecord } from '@/components/attendance/AllPersonnelYearView';
import MyAttendanceLegend from '@/components/attendance/MyAttendanceLegend';

type ViewMode = 'day' | 'week' | 'month' | 'year';

export const AllPersonnelSituationPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { dir, isRTL } = useDirection();
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const now = useMemo(() => new Date(), []);

  const canManageLeaveReasons = ['Admin', 'AdminDepartment'].includes(currentUser?.role || '');

  // États principaux
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);

  // Filtres globaux
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reportPage, setReportPage] = useState<number>(1);

  useEffect(() => {
    setReportPage(1);
  }, [viewMode, selectedDepartment, currentYear, currentMonth]);

  const {
    isExporting,
    exportDailyReport,
    exportMonthlyReport,
    exportYearlyReport,
  } = useAttendanceExport();

  // 1. Départements
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
    staleTime: 10 * 60 * 1000,
  });

  // 2. Motifs de congé actifs
  const { data: leaveReasons = [] } = useQuery<LeaveReason[]>({
    queryKey: ['leave-reasons-active'],
    queryFn: async () => await getLeaveReasons({ isActive: true }),
    staleTime: 5 * 60 * 1000,
  });

  // 3. Vue Jour
  const {
    data: dayData,
    isLoading: isLoadingDay,
    refetch: refetchDay,
  } = useQuery({
    queryKey: ['attendance-all-daily', selectedDate, selectedDepartment],
    queryFn: () =>
      getDailyAttendance(
        selectedDate,
        selectedDepartment === 'all' ? undefined : selectedDepartment
      ),
    enabled: viewMode === 'day',
    staleTime: 60 * 1000,
  });

  // 4. Vue Semaine
  const weekDates = useMemo(() => {
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      dates.push(day.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedDate]);

  const {
    data: weekResults,
    isLoading: isLoadingWeek,
    refetch: refetchWeek,
  } = useQuery({
    queryKey: ['attendance-all-week', weekDates.join(','), selectedDepartment],
    queryFn: async () => {
      const dept = selectedDepartment === 'all' ? undefined : selectedDepartment;
      const promises = weekDates.map((d) => getDailyAttendance(d, dept));
      return await Promise.all(promises);
    },
    enabled: viewMode === 'week',
    staleTime: 60 * 1000,
  });

  // 5. Vue Mois
  const {
    data: monthReportData,
    isLoading: isLoadingMonth,
    refetch: refetchMonth,
  } = useQuery({
    queryKey: ['attendance-all-monthly-report', currentYear, currentMonth, selectedDepartment, reportPage],
    queryFn: () =>
      getMonthlyReport(
        currentYear,
        currentMonth,
        selectedDepartment === 'all' ? undefined : selectedDepartment,
        reportPage
      ),
    enabled: viewMode === 'month',
    staleTime: 2 * 60 * 1000,
  });

  // 6. Vue Année
  const {
    data: yearReportData,
    isLoading: isLoadingYear,
    refetch: refetchYear,
  } = useQuery({
    queryKey: ['attendance-all-yearly-report', currentYear, selectedDepartment, reportPage],
    queryFn: () =>
      getYearlyReport(
        currentYear,
        selectedDepartment === 'all' ? undefined : selectedDepartment,
        reportPage
      ),
    enabled: viewMode === 'year',
    staleTime: 5 * 60 * 1000,
  });

  const isFormationAtt = (att?: AttendanceRecord | null) => {
    if (!att || att.statut !== 'absent') return false;
    const m = (att.motif || '').toLowerCase();
    return Boolean(
      m === 'formation' ||
        m.includes('formation') ||
        att.detailsMotif?.intituleFormation ||
        att.detailsMotif?.formationIntitule
    );
  };

  const isServiceOrMissionAtt = (att?: AttendanceRecord | null) => {
    if (!att || att.statut !== 'absent') return false;
    const m = (att.motif || '').toLowerCase();
    return Boolean(
      m === 'mission' ||
        m === 'service' ||
        att.detailsMotif?.nomService ||
        att.detailsMotif?.serviceNom ||
        att.detailsMotif?.lieuMission ||
        att.detailsMotif?.missionLieu
    );
  };

  // A. Vue Jour filtrée
  const filteredDayRecords = useMemo((): DayPersonnelItem[] => {
    const items: DayPersonnelItem[] = dayData?.data || [];
    return items.filter((item) => {
      const p = item.personnel;
      const att = item.attendance;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${p.nom} ${p.prenom}`.toLowerCase();
        const cin = (p.cin || '').toLowerCase();
        const poste = (p.poste || '').toLowerCase();
        if (!fullName.includes(q) && !cin.includes(q) && !poste.includes(q)) {
          return false;
        }
      }

      if (selectedStatus !== 'all') {
        if (selectedStatus === 'present') return att?.statut === 'present';
        if (selectedStatus === 'absent') return att?.statut === 'absent';
        if (selectedStatus === 'unrecorded') return !att || String(att.statut) === 'unrecorded';
        if (selectedStatus === 'formation') return isFormationAtt(att);
        if (selectedStatus === 'service') return isServiceOrMissionAtt(att);
      }

      return true;
    });
  }, [dayData, searchQuery, selectedStatus]);

  // B. Vue Semaine
  const { weekPersonnelList, weekAttendanceMap } = useMemo(() => {
    const pMap = new Map<string, WeekPersonnelSummary>();
    const aMap = new Map<string, AttendanceRecord>();

    if (weekResults && Array.isArray(weekResults)) {
      weekResults.forEach((dayRes, dayIdx) => {
        const dayDate = weekDates[dayIdx];
        const dayItems: DayPersonnelItem[] = dayRes?.data || [];

        dayItems.forEach((item) => {
          const p = item.personnel;
          if (!pMap.has(p._id)) {
            pMap.set(p._id, {
              _id: p._id,
              nom: p.nom,
              prenom: p.prenom,
              cin: p.cin,
              poste: p.poste,
              photo: p.photo,
              activeDepartment: p.activeDepartment,
            });
          }
          if (item.attendance) {
            aMap.set(`${p._id}_${dayDate}`, item.attendance);
          }
        });
      });
    }

    let list = Array.from(pMap.values());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const fullName = `${p.nom} ${p.prenom}`.toLowerCase();
        const cin = (p.cin || '').toLowerCase();
        return fullName.includes(q) || cin.includes(q);
      });
    }

    return { weekPersonnelList: list, weekAttendanceMap: aMap };
  }, [weekResults, weekDates, searchQuery]);

  // C. Vue Mois
  const filteredMonthRecords = useMemo((): MonthPersonnelRecord[] => {
    const raw = (monthReportData as { data?: { records?: MonthPersonnelRecord[] } })?.data?.records || [];
    if (!searchQuery.trim()) return raw;

    const q = searchQuery.toLowerCase().trim();
    return raw.filter((r) => {
      const fullName = `${r.personnel.nom} ${r.personnel.prenom}`.toLowerCase();
      const cin = (r.personnel.cin || '').toLowerCase();
      return fullName.includes(q) || cin.includes(q);
    });
  }, [monthReportData, searchQuery]);

  // D. Vue Année
  const filteredYearRecords = useMemo((): YearPersonnelRecord[] => {
    const raw = (yearReportData as { data?: { records?: YearPersonnelRecord[] } })?.data?.records || [];
    if (!searchQuery.trim()) return raw;

    const q = searchQuery.toLowerCase().trim();
    return raw.filter((r) => {
      const fullName = `${r.personnel.nom} ${r.personnel.prenom}`.toLowerCase();
      const cin = (r.personnel.cin || '').toLowerCase();
      return fullName.includes(q) || cin.includes(q);
    });
  }, [yearReportData, searchQuery]);

  // Compteurs KPI
  const kpiCounts = useMemo((): KPICounts => {
    if (viewMode === 'day') {
      const items: DayPersonnelItem[] = dayData?.data || [];
      let presents = 0;
      let absents = 0;
      let formation = 0;
      let service = 0;
      let unrecorded = 0;

      items.forEach((item) => {
        const att = item.attendance;
        if (!att || String(att.statut) === 'unrecorded') {
          unrecorded++;
        } else if (att.statut === 'present') {
          presents++;
        } else if (att.statut === 'absent') {
          absents++;
          if (isFormationAtt(att)) formation++;
          else if (isServiceOrMissionAtt(att)) service++;
        }
      });

      return { total: items.length, presents, absents, formation, service, unrecorded };
    }

    if (viewMode === 'week') {
      const total = weekPersonnelList.length;
      let presents = 0;
      let absents = 0;
      let formation = 0;
      let service = 0;

      weekAttendanceMap.forEach((att) => {
        if (att.statut === 'present') presents++;
        else if (att.statut === 'absent') {
          absents++;
          if (isFormationAtt(att)) formation++;
          else if (isServiceOrMissionAtt(att)) service++;
        }
      });

      const unrecorded = Math.max(0, total * 7 - (presents + absents));
      return { total, presents, absents, formation, service, unrecorded };
    }

    if (viewMode === 'month') {
      const recs = (monthReportData as { data?: { records?: MonthPersonnelRecord[] } })?.data?.records || [];
      let totalPresents = 0;
      let totalAbsents = 0;
      let formation = 0;
      let service = 0;

      recs.forEach((r) => {
        totalPresents += r.joursPresents || 0;
        totalAbsents += r.joursAbsents || 0;
        if (r.parMotif) {
          Object.entries(r.parMotif).forEach(([code, count]) => {
            const c = code.toLowerCase();
            if (c.includes('formation')) formation += count;
            if (c.includes('mission') || c.includes('service')) service += count;
          });
        }
      });

      return { total: recs.length, presents: totalPresents, absents: totalAbsents, formation, service, unrecorded: 0 };
    }

    const recs = (yearReportData as { data?: { records?: YearPersonnelRecord[] } })?.data?.records || [];
    let totalPresents = 0;
    let totalAbsents = 0;
    let formation = 0;
    let service = 0;

    recs.forEach((r) => {
      totalPresents += r.joursPresents || 0;
      totalAbsents += r.joursAbsents || 0;
      if (r.parMotif) {
        Object.entries(r.parMotif).forEach(([code, count]) => {
          const c = code.toLowerCase();
          if (c.includes('formation')) formation += count;
          if (c.includes('mission') || c.includes('service')) service += count;
        });
      }
    });

    return { total: recs.length, presents: totalPresents, absents: totalAbsents, formation, service, unrecorded: 0 };
  }, [viewMode, dayData, weekPersonnelList, weekAttendanceMap, monthReportData, yearReportData]);

  const handleRefresh = () => {
    if (viewMode === 'day') refetchDay();
    else if (viewMode === 'week') refetchWeek();
    else if (viewMode === 'month') refetchMonth();
    else if (viewMode === 'year') refetchYear();
  };

  const handleExport = async () => {
    const currentDeptObj = departments.find((d) => d._id === selectedDepartment);
    const departmentName = currentDeptObj ? currentDeptObj.name : undefined;

    if (viewMode === 'day' || viewMode === 'week') {
      const recordsToExport = filteredDayRecords;
      const presents = recordsToExport
        .filter((r) => r.attendance?.statut === 'present')
        .map((r) => ({ personnel: r.personnel, attendance: r.attendance || undefined }));
      const absents = recordsToExport
        .filter((r) => r.attendance?.statut === 'absent')
        .map((r) => ({ personnel: r.personnel, attendance: r.attendance || undefined }));
      const nonSaisis = recordsToExport
        .filter((r) => !r.attendance || String(r.attendance.statut) === 'unrecorded')
        .map((r) => ({ personnel: r.personnel }));

      await exportDailyReport(
        {
          date: selectedDate,
          departmentId: selectedDepartment === 'all' ? undefined : selectedDepartment,
          totalCount: recordsToExport.length,
          presentsCount: presents.length,
          absentsCount: absents.length,
          nonSaisisCount: nonSaisis.length,
          presents,
          absents,
          nonSaisis,
        },
        { departmentName }
      );
    } else if (viewMode === 'month') {
      const rawRecords = (monthReportData as { data?: { records?: MonthPersonnelRecord[] } })?.data?.records || [];
      const recordsToExport = filteredMonthRecords.length > 0 ? filteredMonthRecords : rawRecords;

      await exportMonthlyReport(
        {
          year: currentYear,
          month: currentMonth,
          departmentId: selectedDepartment === 'all' ? undefined : selectedDepartment,
          totalPersonnel: recordsToExport.length,
          records: recordsToExport,
        },
        { departmentName }
      );
    } else if (viewMode === 'year') {
      const rawRecords = (yearReportData as { data?: { records?: YearPersonnelRecord[] } })?.data?.records || [];
      const recordsToExport = filteredYearRecords.length > 0 ? filteredYearRecords : rawRecords;

      await exportYearlyReport(
        {
          year: currentYear,
          departmentId: selectedDepartment === 'all' ? undefined : selectedDepartment,
          totalPersonnel: recordsToExport.length,
          records: recordsToExport,
        },
        { departmentName }
      );
    }
  };

  const handleKPIClick = (filterKey: string | null) => {
    if (viewMode === 'day') {
      setSelectedStatus(filterKey || 'all');
    }
  };

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-3.5 pb-6 text-start" dir={dir}>
      {/* 1. Compact View Switcher + Secondary Settings / Export / Refresh */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`h-9 px-4 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'day'
                ? 'bg-[#2c5282] dark:bg-sky-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{isRTL ? 'عرض اليوم' : 'Jour'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`h-9 px-4 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'week'
                ? 'bg-[#2c5282] dark:bg-sky-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{isRTL ? 'عرض الأسبوع' : 'Semaine'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`h-9 px-4 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'month'
                ? 'bg-[#2c5282] dark:bg-sky-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            <span>{isRTL ? 'عرض الشهر' : 'Mois'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('year')}
            className={`h-9 px-4 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              viewMode === 'year'
                ? 'bg-[#2c5282] dark:bg-sky-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>{isRTL ? 'عرض السنة' : 'Année'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canManageLeaveReasons && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-3 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0"
            >
              <Link to="/dashboard/hr/leave-reasons">
                <SlidersHorizontal className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>{isRTL ? 'أنواع الغياب' : "Types d'absence"}</span>
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="h-9 px-3 border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            <span>
              {isExporting
                ? isRTL
                  ? 'جاري التصدير...'
                  : 'Export...'
                : isRTL
                ? 'تصدير PDF'
                : 'Exporter PDF'}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 px-3 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0"
            title={isRTL ? 'تحديث البيانات' : 'Actualiser'}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{isRTL ? 'تحديث' : 'Actualiser'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Single-Row Compact KPI Strip */}
      <AllPersonnelKPICards
        counts={kpiCounts}
        isLoading={
          viewMode === 'day'
            ? isLoadingDay
            : viewMode === 'week'
            ? isLoadingWeek
            : viewMode === 'month'
            ? isLoadingMonth
            : isLoadingYear
        }
        activeFilter={viewMode === 'day' ? selectedStatus : null}
        onFilterClick={viewMode === 'day' ? handleKPIClick : undefined}
      />

      {/* 3. Active View */}
      {viewMode === 'day' && (
        <AllPersonnelDayView
          date={selectedDate}
          onDateChange={setSelectedDate}
          records={filteredDayRecords}
          leaveReasons={leaveReasons}
          isLoading={isLoadingDay}
          departments={departments}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {viewMode === 'week' && (
        <AllPersonnelWeekView
          currentDate={selectedDate}
          onDateChange={setSelectedDate}
          personnelList={weekPersonnelList}
          attendanceMap={weekAttendanceMap}
          leaveReasons={leaveReasons}
          isLoading={isLoadingWeek}
          departments={departments}
          selectedDepartment={selectedDepartment}
          onDepartmentChange={setSelectedDepartment}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {viewMode === 'month' && (() => {
        const monthMeta = (monthReportData as {
          data?: {
            totalPersonnel?: number;
            page?: number;
            totalPages?: number;
          };
        })?.data;
        const monthTotalPages = monthMeta?.totalPages || 1;
        const monthTotal = monthMeta?.totalPersonnel || filteredMonthRecords.length;
        return (
          <>
            <AllPersonnelMonthView
              year={currentYear}
              month={currentMonth}
              onYearMonthChange={(y, m) => {
                setCurrentYear(y);
                setCurrentMonth(m);
              }}
              records={filteredMonthRecords}
              leaveReasons={leaveReasons}
              isLoading={isLoadingMonth}
              departments={departments}
              selectedDepartment={selectedDepartment}
              onDepartmentChange={setSelectedDepartment}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            {monthTotalPages > 1 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {isRTL ? (
                    <>
                      المجموع: <strong className="text-slate-900 dark:text-slate-100">{monthTotal}</strong> موظف — صفحة{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{reportPage}</strong> من{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{monthTotalPages}</strong>
                    </>
                  ) : (
                    <>
                      Total : <strong className="text-slate-900 dark:text-slate-100">{monthTotal}</strong> — Page{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{reportPage}</strong> /{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{monthTotalPages}</strong>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                    disabled={reportPage <= 1 || isLoadingMonth}
                    className="h-9 px-3 border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg gap-1"
                  >
                    <PrevIcon className="w-4 h-4" />
                    <span>{isRTL ? 'السابق' : 'Précédent'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReportPage((p) => Math.min(monthTotalPages, p + 1))}
                    disabled={reportPage >= monthTotalPages || isLoadingMonth}
                    className="h-9 px-3 border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg gap-1"
                  >
                    <span>{isRTL ? 'التالي' : 'Suivant'}</span>
                    <NextIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {viewMode === 'year' && (() => {
        const yearMeta = (yearReportData as {
          data?: {
            totalPersonnel?: number;
            page?: number;
            totalPages?: number;
          };
        })?.data;
        const yearTotalPages = yearMeta?.totalPages || 1;
        const yearTotal = yearMeta?.totalPersonnel || filteredYearRecords.length;
        return (
          <>
            <AllPersonnelYearView
              year={currentYear}
              onYearChange={setCurrentYear}
              records={filteredYearRecords}
              leaveReasons={leaveReasons}
              isLoading={isLoadingYear}
              departments={departments}
              selectedDepartment={selectedDepartment}
              onDepartmentChange={setSelectedDepartment}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            {yearTotalPages > 1 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {isRTL ? (
                    <>
                      المجموع: <strong className="text-slate-900 dark:text-slate-100">{yearTotal}</strong> موظف — صفحة{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{reportPage}</strong> من{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{yearTotalPages}</strong>
                    </>
                  ) : (
                    <>
                      Total : <strong className="text-slate-900 dark:text-slate-100">{yearTotal}</strong> — Page{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{reportPage}</strong> /{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{yearTotalPages}</strong>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                    disabled={reportPage <= 1 || isLoadingYear}
                    className="h-9 px-3 border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg gap-1"
                  >
                    <PrevIcon className="w-4 h-4" />
                    <span>{isRTL ? 'السابق' : 'Précédent'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReportPage((p) => Math.min(yearTotalPages, p + 1))}
                    disabled={reportPage >= yearTotalPages || isLoadingYear}
                    className="h-9 px-3 border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg gap-1"
                  >
                    <span>{isRTL ? 'التالي' : 'Suivant'}</span>
                    <NextIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Légende des couleurs */}
      <MyAttendanceLegend />
    </div>
  );
};

export default AllPersonnelSituationPage;
