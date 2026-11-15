import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  Building2,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  FileDown,
  Loader2,
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

// Composants de la page
import AllPersonnelKPICards, { KPICounts } from '@/components/attendance/AllPersonnelKPICards';
import AllPersonnelDayView, { DayPersonnelItem } from '@/components/attendance/AllPersonnelDayView';
import AllPersonnelWeekView, { WeekPersonnelSummary } from '@/components/attendance/AllPersonnelWeekView';
import AllPersonnelMonthView, { MonthPersonnelRecord } from '@/components/attendance/AllPersonnelMonthView';
import AllPersonnelYearView, { YearPersonnelRecord } from '@/components/attendance/AllPersonnelYearView';
import MyAttendanceLegend from '@/components/attendance/MyAttendanceLegend';

type ViewMode = 'day' | 'week' | 'month' | 'year';

export const AllPersonnelSituationPage: React.FC = () => {
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const now = useMemo(() => new Date(), []);

  // États principaux
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);

  // Filtres globaux
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Hook d'export PDF
  const {
    isExporting,
    exportDailyReport,
    exportMonthlyReport,
    exportYearlyReport,
  } = useAttendanceExport();

  // 1. Charger les départements
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
    staleTime: 10 * 60 * 1000,
  });

  // 2. Charger les motifs de congé dynamiques
  const { data: leaveReasons = [] } = useQuery<LeaveReason[]>({
    queryKey: ['leave-reasons-active'],
    queryFn: async () => {
      const res = await getLeaveReasons({ actif: true });
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 3. Requête Vue Jour
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

  // 4. Requête Vue Semaine (7 jours)
  const weekDates = useMemo(() => {
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay(); // 0 = Dimanche
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

  // 5. Requête Vue Mois
  const {
    data: monthReportData,
    isLoading: isLoadingMonth,
    refetch: refetchMonth,
  } = useQuery({
    queryKey: ['attendance-all-monthly-report', currentYear, currentMonth, selectedDepartment],
    queryFn: () =>
      getMonthlyReport(
        currentYear,
        currentMonth,
        selectedDepartment === 'all' ? undefined : selectedDepartment
      ),
    enabled: viewMode === 'month',
    staleTime: 2 * 60 * 1000,
  });

  // 6. Requête Vue Année
  const {
    data: yearReportData,
    isLoading: isLoadingYear,
    refetch: refetchYear,
  } = useQuery({
    queryKey: ['attendance-all-yearly-report', currentYear, selectedDepartment],
    queryFn: () =>
      getYearlyReport(
        currentYear,
        selectedDepartment === 'all' ? undefined : selectedDepartment
      ),
    enabled: viewMode === 'year',
    staleTime: 5 * 60 * 1000,
  });

  // ─────────────────────────────────────────────────────────────
  // TRANSFORMATION DES DONNÉES PAR VUE
  // ─────────────────────────────────────────────────────────────

  // A. Données Vue Jour filtrées
  const filteredDayRecords = useMemo((): DayPersonnelItem[] => {
    const items: DayPersonnelItem[] = dayData?.data || [];
    return items.filter((item) => {
      const p = item.personnel;
      const att = item.attendance;

      // Filtre Recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${p.nom} ${p.prenom}`.toLowerCase();
        const cin = (p.cin || '').toLowerCase();
        const poste = (p.poste || '').toLowerCase();
        if (!fullName.includes(q) && !cin.includes(q) && !poste.includes(q)) {
          return false;
        }
      }

      // Filtre État
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'present') return att?.statut === 'present';
        if (selectedStatus === 'absent') return att?.statut === 'absent';
        if (selectedStatus === 'unrecorded') return !att || att?.statut === 'unrecorded';
        if (selectedStatus === 'formation') {
          return (
            att?.statut === 'absent' &&
            (att.motif === 'FORMATION' ||
              att.detailsMotif?.intituleFormation ||
              att.motif?.toLowerCase().includes('formation'))
          );
        }
        if (selectedStatus === 'service') {
          return (
            att?.statut === 'absent' &&
            (att.motif === 'MISSION' ||
              att.motif === 'SERVICE' ||
              att.detailsMotif?.nomService ||
              att.detailsMotif?.lieuMission)
          );
        }
      }

      return true;
    });
  }, [dayData, searchQuery, selectedStatus]);

  // B. Données Vue Semaine
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

    // Filtrer la liste des personnels par recherche
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

  // C. Données Vue Mois
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

  // D. Données Vue Année
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

  // ─────────────────────────────────────────────────────────────
  // CALCUL DES COMPTEURS KPI (6 CARTES)
  // ─────────────────────────────────────────────────────────────
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
        if (!att || att.statut === 'unrecorded') {
          unrecorded++;
        } else if (att.statut === 'present') {
          presents++;
        } else if (att.statut === 'absent') {
          absents++;
          if (
            att.motif === 'FORMATION' ||
            att.detailsMotif?.intituleFormation ||
            att.motif?.toLowerCase().includes('formation')
          ) {
            formation++;
          } else if (
            att.motif === 'MISSION' ||
            att.motif === 'SERVICE' ||
            att.detailsMotif?.nomService ||
            att.detailsMotif?.lieuMission
          ) {
            service++;
          }
        }
      });

      return {
        total: items.length,
        presents,
        absents,
        formation,
        service,
        unrecorded,
      };
    }

    if (viewMode === 'week') {
      const total = weekPersonnelList.length;
      let presents = 0;
      let absents = 0;
      let unrecorded = 0;
      let formation = 0;
      let service = 0;

      weekAttendanceMap.forEach((att) => {
        if (att.statut === 'present') presents++;
        else if (att.statut === 'absent') {
          absents++;
          if (att.motif === 'FORMATION' || att.detailsMotif?.intituleFormation) {
            formation++;
          } else if (att.motif === 'MISSION' || att.motif === 'SERVICE') {
            service++;
          }
        }
      });

      const totalSlots = total * 7;
      unrecorded = Math.max(0, totalSlots - (presents + absents));

      return {
        total,
        presents,
        absents,
        formation,
        service,
        unrecorded,
      };
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
            if (code.includes('FORMATION')) formation += count;
            if (code.includes('MISSION') || code.includes('SERVICE')) service += count;
          });
        }
      });

      return {
        total: recs.length,
        presents: totalPresents,
        absents: totalAbsents,
        formation,
        service,
        unrecorded: 0,
      };
    }

    // Année
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
          if (code.includes('FORMATION')) formation += count;
          if (code.includes('MISSION') || code.includes('SERVICE')) service += count;
        });
      }
    });

    return {
      total: recs.length,
      presents: totalPresents,
      absents: totalAbsents,
      formation,
      service,
      unrecorded: 0,
    };
  }, [
    viewMode,
    dayData,
    weekPersonnelList,
    weekAttendanceMap,
    monthReportData,
    yearReportData,
  ]);

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
        .map((r) => ({
          personnel: r.personnel,
          attendance: r.attendance || undefined,
        }));
      const absents = recordsToExport
        .filter((r) => r.attendance?.statut === 'absent')
        .map((r) => ({
          personnel: r.personnel,
          attendance: r.attendance || undefined,
        }));
      const nonSaisis = recordsToExport
        .filter((r) => !r.attendance || r.attendance?.statut === 'unrecorded')
        .map((r) => ({
          personnel: r.personnel,
        }));

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
        {
          departmentName,
        }
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
        {
          departmentName,
        }
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
        {
          departmentName,
        }
      );
    }
  };

  const handleKPIClick = (filterKey: string | null) => {
    if (viewMode === 'day') {
      setSelectedStatus(filterKey || 'all');
    }
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* 1. Fil d'Ariane & En-tête */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 space-y-3">
        <nav className="flex items-center gap-1.5 text-xs text-[#718096]">
          <Link to="/dashboard" className="hover:text-[#2c5282] transition-colors">
            الرئيسية
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span>الموارد البشرية</span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[#1a202c] font-bold">وضعية الموظفين</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1a202c] tracking-tight">
                وضعية الموظفين
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#2c5282] border border-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>إدارة الموارد البشرية</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#718096] mt-1">
              متابعة شاملة ومجمّعة لحالة حضور وغياب كافة موظفي الإدارة حسب اليوم، الأسبوع، الشهر، أو السنة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="h-9 px-3 border-[#e2e8f0] text-[#2c5282] hover:bg-gray-50 flex items-center gap-1.5 text-xs font-medium rounded"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              <span>{isExporting ? 'جاري التصدير...' : 'تصدير PDF'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-11 px-3 border-[#e2e8f0] text-[#2c5282] hover:bg-gray-50 flex items-center gap-1.5 text-xs font-medium rounded"
              title="تحديث البيانات"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>تحديث</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Cartes KPI consolidées */}
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

      {/* 3. Segment Control pour les 4 vues [يوم] [أسبوع] [شهر] [سنة] */}
      <div className="bg-white border border-[#e2e8f0] rounded p-2 flex items-center justify-center sm:justify-start gap-1">
        <button
          type="button"
          onClick={() => setViewMode('day')}
          className={`h-11 px-5 py-2 text-xs font-bold rounded transition-colors duration-150 flex items-center gap-2 ${
            viewMode === 'day'
              ? 'bg-[#2c5282] text-white shadow-sm'
              : 'text-[#4a5568] hover:bg-gray-100'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>عرض اليوم</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('week')}
          className={`h-11 px-5 py-2 text-xs font-bold rounded transition-colors duration-150 flex items-center gap-2 ${
            viewMode === 'week'
              ? 'bg-[#2c5282] text-white shadow-sm'
              : 'text-[#4a5568] hover:bg-gray-100'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>عرض الأسبوع</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('month')}
          className={`h-11 px-5 py-2 text-xs font-bold rounded transition-colors duration-150 flex items-center gap-2 ${
            viewMode === 'month'
              ? 'bg-[#2c5282] text-white shadow-sm'
              : 'text-[#4a5568] hover:bg-gray-100'
          }`}
        >
          <CalendarRange className="h-3.5 w-3.5" />
          <span>عرض الشهر</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('year')}
          className={`h-11 px-5 py-2 text-xs font-bold rounded transition-colors duration-150 flex items-center gap-2 ${
            viewMode === 'year'
              ? 'bg-[#2c5282] text-white shadow-sm'
              : 'text-[#4a5568] hover:bg-gray-100'
          }`}
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          <span>عرض السنة</span>
        </button>
      </div>

      {/* 4. Zone d'affichage active */}
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

      {viewMode === 'month' && (
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
      )}

      {viewMode === 'year' && (
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
      )}

      {/* 5. Légende des couleurs */}
      <MyAttendanceLegend />
    </div>
  );
};

export default AllPersonnelSituationPage;
