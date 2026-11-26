import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Building2,
  Calendar,
  Users,
} from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { PersonnelAvatar } from '@/components/hr/PersonnelAvatar';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import { useDirection } from '@/i18n/useDirection';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

export interface WeekPersonnelSummary {
  _id: string;
  nom: string;
  prenom: string;
  cin?: string;
  poste?: string;
  photo?: string;
  activeDepartment?: { _id: string; name: string; code?: string } | string;
}

interface AllPersonnelWeekViewProps {
  currentDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  personnelList: WeekPersonnelSummary[];
  attendanceMap: Map<string, AttendanceRecord>; // key: `${personnelId}_${date}`
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  departments: Array<{ _id: string; name: string }>;
  selectedDepartment: string;
  onDepartmentChange: (deptId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const AllPersonnelWeekView: React.FC<AllPersonnelWeekViewProps> = ({
  currentDate,
  onDateChange,
  personnelList,
  attendanceMap,
  leaveReasons,
  isLoading,
  departments,
  selectedDepartment,
  onDepartmentChange,
  searchQuery,
  onSearchChange,
}) => {
  const { dir, isRTL } = useDirection();

  // Calcul des 7 jours de la semaine (commençant Dimanche)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 = Dimanche
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      const iso = day.toISOString().split('T')[0];
      days.push({
        date: iso,
        dayNumber: day.getDate(),
        month: day.getMonth() + 1,
        dayName: ARABIC_WEEKDAYS[i],
        isWeekend: i === 5 || i === 6,
        isToday: iso === new Date().toISOString().split('T')[0],
      });
    }
    return days;
  }, [currentDate]);

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleCurrentWeek = () => {
    onDateChange(new Date().toISOString().split('T')[0]);
  };

  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    return `من ${weekDays[0].date} إلى ${weekDays[6].date}`;
  }, [weekDays]);

  const getDepartmentName = (dept: unknown): string => {
    if (!dept) return '-';
    if (typeof dept === 'object' && 'name' in (dept as Record<string, unknown>)) {
      return String((dept as { name: string }).name);
    }
    const found = departments.find((d) => d._id === String(dept));
    return found?.name || '-';
  };

  // Résumé quotidien (total présences / absences par colonne)
  const dailyTotals = useMemo(() => {
    return weekDays.map((day) => {
      let presents = 0;
      let absents = 0;
      let unrecorded = 0;

      personnelList.forEach((p) => {
        const att = attendanceMap.get(`${p._id}_${day.date}`);
        if (!att) {
          unrecorded++;
        } else if (att.statut === 'present') {
          presents++;
        } else {
          absents++;
        }
      });

      return { presents, absents, unrecorded };
    });
  }, [weekDays, personnelList, attendanceMap]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-4 p-5 text-start" dir={dir}>
      {/* Contrôles Navigation Semaine */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="الأسبوع السابق"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span>الأسبوع السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentWeek}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            الأسبوع الحالي
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="الأسبوع الموالي"
          >
            <span>الأسبوع الموالي</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono tabular-nums">
          <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
          <span>{weekRangeLabel}</span>
        </div>
      </div>

      {/* Barre de filtres (Département & Recherche) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        {/* Recherche */}
        <div className="relative">
          <Search className="h-4 w-4 absolute start-3 top-2.5 text-slate-700 dark:text-slate-300" />
          <Input
            type="text"
            placeholder="بحث بالاسم أو اللقب أو ب.ت.و..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 ps-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg"
          />
        </div>

        {/* Filtre Département */}
        <div>
          <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
            <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg">
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                <SelectValue placeholder="كل الأقسام والمصالح" />
              </div>
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="all" className="text-xs">
                كل الأقسام والمصالح
              </SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept._id} value={dept._id} className="text-xs">
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grille de la semaine */}
      {isLoading ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <TableSkeleton rows={6} columns={8} />
        </div>
      ) : personnelList.length === 0 ? (
        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-700 dark:text-slate-300" />}
            title="لا يوجد موظفون مطابقون لمعايير البحث"
          />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[650px] border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-start text-xs divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 font-bold backdrop-blur-sm">
              <tr>
                <th className="sticky start-0 z-30 bg-slate-50 dark:bg-slate-800 py-3 px-3 min-w-[210px] whitespace-nowrap">الموظف</th>
                {weekDays.map((day) => (
                  <th
                    key={day.date}
                    className={`py-2 px-2 text-center min-w-[110px] border-s border-slate-200 dark:border-slate-700 ${
                      day.isToday ? 'bg-[#2c5282]/10 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300' : ''
                    }`}
                  >
                    <div className="font-bold">{day.dayName}</div>
                    <div className="text-[13px] font-mono tabular-nums text-slate-700 dark:text-slate-300">{day.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {personnelList.map((p) => (
                <tr key={p._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                  {/* Employé info */}
                  <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2.5 px-3 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <PersonnelAvatar
                        photo={p.photo}
                        nom={p.nom}
                        prenom={p.prenom}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {p.nom} {p.prenom}
                        </div>
                        <div className="text-[13px] text-slate-700 dark:text-slate-300 truncate">
                          {getDepartmentName(p.activeDepartment)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 7 Cellules de jours */}
                  {weekDays.map((day) => {
                    const att = attendanceMap.get(`${p._id}_${day.date}`);

                    return (
                      <td
                        key={day.date}
                        className={`py-2 px-1 text-center border-s border-slate-100 dark:border-slate-800 ${
                          day.isToday ? 'bg-blue-50/40 dark:bg-blue-950/25' : ''
                        }`}
                      >
                        <div className="flex justify-center">
                          <AttendanceStatusBadge
                            statut={att?.statut || 'unrecorded'}
                            motif={att?.motif}
                            heureArrivee={att?.heureArrivee}
                            leaveReasons={leaveReasons}
                            impacteSolde={att?.impacteSolde}
                            size="sm"
                            showTime={false}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Résumé en bas : total par jour */}
            <tfoot className="bg-slate-50 dark:bg-slate-800/95 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
              <tr>
                <td className="sticky start-0 z-10 bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs text-slate-900 dark:text-slate-100">
                  إجمالي الحضور والغياب اليومي :
                </td>
                {dailyTotals.map((tot, idx) => (
                  <td
                    key={weekDays[idx].date}
                    className="py-2 px-1.5 text-center border-s border-slate-200 dark:border-slate-700 text-[13px]"
                  >
                    <div className="space-y-0.5 tabular-nums">
                      <div className="text-emerald-700 dark:text-emerald-400 font-mono">ح: {tot.presents}</div>
                      <div className="text-red-700 dark:text-red-400 font-mono">غ: {tot.absents}</div>
                      {tot.unrecorded > 0 && (
                        <div className="text-slate-700 dark:text-slate-300 font-mono text-[13px]">
                          غ.م: {tot.unrecorded}
                        </div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllPersonnelWeekView;
