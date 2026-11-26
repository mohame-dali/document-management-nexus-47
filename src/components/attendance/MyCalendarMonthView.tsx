import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Building2,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { formatDateWithWeekday } from '@/utils/formatDate';
import { getStatusVisualInfo } from './MyAttendanceLegend';
import { useDirection } from '@/i18n/useDirection';

interface MyCalendarMonthViewProps {
  year: number;
  month: number; // 1-12
  onYearMonthChange: (year: number, month: number) => void;
  attendances: AttendanceRecord[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const ARABIC_MONTHS = [
  { value: 1, label: 'جانفي (Janvier)' },
  { value: 2, label: 'فيفري (Février)' },
  { value: 3, label: 'مارس (Mars)' },
  { value: 4, label: 'أفريل (Avril)' },
  { value: 5, label: 'ماي (Mai)' },
  { value: 6, label: 'جوان (Juin)' },
  { value: 7, label: 'جويلية (Juillet)' },
  { value: 8, label: 'أوت (Août)' },
  { value: 9, label: 'سبتمبر (Septembre)' },
  { value: 10, label: 'أكتوبر (Octobre)' },
  { value: 11, label: 'نوفمبر (Novembre)' },
  { value: 12, label: 'ديسمبر (Décembre)' },
];

const WEEKDAY_HEADERS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const MyCalendarMonthView: React.FC<MyCalendarMonthViewProps> = ({
  year,
  month,
  onYearMonthChange,
  attendances,
  leaveReasons,
  isLoading,
  selectedDate,
  onSelectDate,
}) => {
  const { dir, isRTL } = useDirection();

  // Map des présences pour recherche rapide
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendances.forEach((att) => {
      const dateKey = att.date ? att.date.split('T')[0] : '';
      if (dateKey) {
        map.set(dateKey, att);
      }
    });
    return map;
  }, [attendances]);

  // Génération de la grille des jours du mois
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Dimanche

    const cells = [];

    // Jours vides du mois précédent pour combler la première ligne
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      cells.push({
        dayNumber: dayNum,
        isCurrentMonth: false,
        date: '',
        key: `prev-${dayNum}`,
      });
    }

    // Jours du mois courant
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const iso = `${year}-${mStr}-${dStr}`;
      const isToday = iso === new Date().toISOString().split('T')[0];

      cells.push({
        dayNumber: day,
        isCurrentMonth: true,
        date: iso,
        isToday,
        key: `curr-${day}`,
      });
    }

    // Jours vides du mois suivant pour compléter la grille jusqu'à un multiple de 7
    const remainingCells = 7 - (cells.length % 7);
    if (remainingCells < 7) {
      for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
        cells.push({
          dayNumber: nextDay,
          isCurrentMonth: false,
          date: '',
          key: `next-${nextDay}`,
        });
      }
    }

    return cells;
  }, [year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      onYearMonthChange(year - 1, 12);
    } else {
      onYearMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onYearMonthChange(year + 1, 1);
    } else {
      onYearMonthChange(year, month + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onYearMonthChange(now.getFullYear(), now.getMonth() + 1);
  };

  // Détails du jour sélectionné
  const selectedDayAttendance = selectedDate ? attendanceMap.get(selectedDate) : null;
  const selectedDayVisual = getStatusVisualInfo(selectedDayAttendance, leaveReasons);

  // Statistiques du mois
  const monthStats = useMemo(() => {
    let presents = 0;
    let absents = 0;
    let deducted = 0;

    attendanceMap.forEach((att) => {
      if (att.statut === 'present') {
        presents++;
      } else if (att.statut === 'absent') {
        absents++;
        if (att.impacteSolde) deducted++;
      }
    });

    return { presents, absents, deducted };
  }, [attendanceMap]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5 shadow-sm text-start" dir={dir}>
      {/* Contrôles Mois & Année */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="الشهر السابق"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span>الشهر السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentMonth}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            الشهر الحالي
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="الشهر الموالي"
          >
            <span>الشهر الموالي</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Sélecteurs Mois et Année */}
        <div className="flex items-center gap-2">
          <Select
            value={String(month)}
            onValueChange={(val) => onYearMonthChange(year, parseInt(val, 10))}
          >
            <SelectTrigger className="h-9 w-44 border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={dir}>
              {ARABIC_MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(year)}
            onValueChange={(val) => onYearMonthChange(parseInt(val, 10), month)}
          >
            <SelectTrigger className="h-9 w-24 border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-slate-100 font-mono tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={dir}>
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs font-mono tabular-nums">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grille du Calendrier */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-700 dark:text-slate-300">جاري تحميل بيانات الشهر...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-1">
            {/* En-têtes de colonnes (jours de la semaine) */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
              {WEEKDAY_HEADERS.map((dayName) => (
                <div
                  key={dayName}
                  className="py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Grille des cellules de jours */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={cell.key}
                      className="min-h-[90px] p-2 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-lg text-slate-300 dark:text-slate-600 select-none opacity-45"
                    >
                      <span className="text-xs font-mono tabular-nums">{cell.dayNumber}</span>
                    </div>
                  );
                }

                const att = attendanceMap.get(cell.date);
                const visual = getStatusVisualInfo(att, leaveReasons);
                const isSelected = selectedDate === cell.date;

                const cellSurface =
                  visual.statut === 'present'
                    ? 'bg-emerald-50 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/70'
                    : visual.statut === 'unrecorded'
                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900';

                return (
                  <div
                    key={cell.key}
                    onClick={() => onSelectDate(cell.date)}
                    className={`min-h-[90px] p-2 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col justify-between hover:shadow-sm ${cellSurface} ${
                      isSelected ? 'ring-2 ring-[#2c5282] dark:ring-blue-500 border-[#2c5282] dark:border-blue-500 shadow-sm z-10' : ''
                    }`}
                    style={
                      visual.statut === 'absent'
                        ? {
                            backgroundColor: visual.bgLight,
                            borderColor: isSelected ? '#2c5282' : visual.borderColor,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold font-mono tabular-nums px-1.5 py-0.5 rounded ${
                          cell.isToday
                            ? 'bg-[#2c5282] dark:bg-blue-600 text-white'
                            : 'text-slate-900 dark:text-slate-100 bg-white/80 dark:bg-slate-900/80'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {att?.statut === 'present' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" title="حاضر" />
                      )}
                      {att?.statut === 'absent' && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: visual.color }}
                          title={visual.label}
                        />
                      )}
                    </div>

                    {/* Libellé d'état du jour */}
                    <div className="mt-1">
                      <div
                        className={`text-[13px] font-semibold px-1.5 py-0.5 rounded text-center truncate shadow-none border bg-white/95 dark:bg-slate-900/90 ${
                          visual.statut === 'present'
                            ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : visual.statut === 'unrecorded'
                            ? 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            : ''
                        }`}
                        style={
                          visual.statut === 'absent'
                            ? {
                                color: visual.color,
                                borderColor: visual.borderColor,
                              }
                            : undefined
                        }
                        title={visual.label}
                      >
                        {visual.label}
                      </div>

                      {att?.statut === 'present' && att.heureArrivee && (
                        <span className="text-[13px] text-slate-700 dark:text-slate-300 font-mono tabular-nums block text-center mt-0.5">
                          {att.heureArrivee}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Résumé mensuel */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-700 dark:text-slate-300">حصيلة الشهر :</span>
          <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 font-medium tabular-nums">
            حضور : {monthStats.presents} أيام
          </span>
          <span className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800 font-medium tabular-nums">
            غياب : {monthStats.absents} أيام
          </span>
          {monthStats.deducted > 0 && (
            <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800 font-medium tabular-nums">
              أيام مخصومة من الرصيد : {monthStats.deducted}
            </span>
          )}
        </div>

        <span className="text-slate-700 dark:text-slate-300 text-[13px]">
          * اضغط على أي يوم لعرض تفاصيله الكاملة أدناه
        </span>
      </div>

      {/* Détails du jour sélectionné au clic */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t-2 border-[#2c5282]/20 dark:border-blue-500/30 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                تفاصيل اليوم المحدد : <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">{formatDateWithWeekday(selectedDate, isRTL ? 'ar' : 'fr')}</bdi>
              </h4>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-mono tabular-nums">({selectedDate})</span>
            </div>

            <div
              className={`text-xs font-bold px-3 py-1 rounded-md border self-start sm:self-auto ${
                selectedDayVisual.statut === 'present'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : selectedDayVisual.statut === 'unrecorded'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  : ''
              }`}
              style={
                selectedDayVisual.statut === 'absent'
                  ? {
                      backgroundColor: selectedDayVisual.bgLight,
                      color: selectedDayVisual.color,
                      borderColor: selectedDayVisual.borderColor,
                    }
                  : undefined
              }
            >
              {selectedDayVisual.label}
            </div>
          </div>

          {selectedDayAttendance ? (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {selectedDayAttendance.statut === 'present' && selectedDayAttendance.heureArrivee && (
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>وقت الوصول : {selectedDayAttendance.heureArrivee}</span>
                  </div>
                )}

                {selectedDayAttendance.statut === 'absent' && (
                  <div className="flex items-center gap-1.5">
                    {selectedDayVisual.impacteSolde ? (
                      <span className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>يخصم من رصيد الإجازات السنوية</span>
                      </span>
                    ) : (
                      <span className="text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>لا يخصم من الرصيد السنوي</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Détails du motif si existant */}
              {selectedDayAttendance.detailsMotif && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {selectedDayAttendance.detailsMotif.nomService && (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300 block mb-0.5 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
                        <span>المصلحة:</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.nomService}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.lieuMission && (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300 block mb-0.5 flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
                        <span>مكان المهمة:</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.lieuMission}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.objetMission && (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300 block mb-0.5 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
                        <span>موضوع المهمة:</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.objetMission}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.intituleFormation && (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300 block mb-0.5 flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
                        <span>التكوين:</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.intituleFormation}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.commentaire && (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 sm:col-span-2">
                      <span className="text-slate-700 dark:text-slate-300 block mb-0.5">ملاحظة:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.commentaire}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-700 dark:text-slate-300">
              لم يتم تسجيل أي حضور أو غياب لهذا اليوم بعد.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCalendarMonthView;
