import React, { useMemo } from 'react';
import {
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
  attendances: AttendanceRecord[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const WEEKDAY_HEADERS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEKDAY_HEADERS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const getLocalTodayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

export const MyCalendarMonthView: React.FC<MyCalendarMonthViewProps> = ({
  year,
  month,
  attendances,
  leaveReasons,
  isLoading,
  selectedDate,
  onSelectDate,
}) => {
  const { dir, isRTL } = useDirection();
  const todayStr = useMemo(() => getLocalTodayIso(), []);
  const weekdayHeaders = isRTL ? WEEKDAY_HEADERS_AR : WEEKDAY_HEADERS_FR;

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
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Dimanche, 6 = Samedi

    const cells: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      date: string;
      isToday: boolean;
      isWeekend: boolean;
      key: string;
    }> = [];

    // Jours du mois précédent
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const colIndex = cells.length % 7;
      cells.push({
        dayNumber: dayNum,
        isCurrentMonth: false,
        date: '',
        isToday: false,
        isWeekend: colIndex === 0 || colIndex === 6,
        key: `prev-${dayNum}`,
      });
    }

    // Jours du mois courant
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const iso = `${year}-${mStr}-${dStr}`;
      const colIndex = cells.length % 7;

      cells.push({
        dayNumber: day,
        isCurrentMonth: true,
        date: iso,
        isToday: iso === todayStr,
        isWeekend: colIndex === 0 || colIndex === 6, // Dimanche & Samedi
        key: `curr-${day}`,
      });
    }

    // Jours du mois suivant
    const remainingCells = 7 - (cells.length % 7);
    if (remainingCells < 7) {
      for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
        const colIndex = cells.length % 7;
        cells.push({
          dayNumber: nextDay,
          isCurrentMonth: false,
          date: '',
          isToday: false,
          isWeekend: colIndex === 0 || colIndex === 6,
          key: `next-${nextDay}`,
        });
      }
    }

    return cells;
  }, [year, month, todayStr]);

  // Détails du jour sélectionné
  const selectedDayAttendance = selectedDate ? attendanceMap.get(selectedDate) : null;
  const selectedDayVisual = getStatusVisualInfo(selectedDayAttendance, leaveReasons, isRTL);

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
    <div className="p-4 sm:p-5 space-y-4 text-start" dir={dir}>
      {/* Grille du Calendrier */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] dark:border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {isRTL ? 'جاري تحميل بيانات الشهر...' : 'Chargement du calendrier...'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px] border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-200/70 dark:bg-slate-800">
            {/* En-têtes de colonnes (jours de la semaine) */}
            <div className="grid grid-cols-7 gap-px border-b border-slate-200/80 dark:border-slate-800 text-center">
              {weekdayHeaders.map((dayName, idx) => {
                const isWeekendCol = idx === 0 || idx === 6;
                return (
                  <div
                    key={dayName}
                    className={`py-2.5 text-xs font-semibold ${
                      isWeekendCol
                        ? 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {dayName}
                  </div>
                );
              })}
            </div>

            {/* Grille des cellules de jours */}
            <div className="grid grid-cols-7 gap-px">
              {calendarCells.map((cell) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={cell.key}
                      className={`min-h-[88px] p-2.5 select-none ${
                        cell.isWeekend
                          ? 'bg-slate-100/70 dark:bg-slate-900/50'
                          : 'bg-slate-50/50 dark:bg-slate-950/60'
                      }`}
                    >
                      <span className="text-xs font-medium text-slate-300 dark:text-slate-600 tabular-nums">
                        {cell.dayNumber}
                      </span>
                    </div>
                  );
                }

                const att = attendanceMap.get(cell.date);
                const visual = getStatusVisualInfo(att, leaveReasons, isRTL);
                const isSelected = selectedDate === cell.date;
                const isPastUnrecordedWorkday = !att && cell.date < todayStr && !cell.isWeekend;

                const cellSurface = isSelected
                  ? 'bg-sky-50/40 dark:bg-sky-950/25 ring-2 ring-inset ring-[#2c5282] dark:ring-sky-400 z-10'
                  : cell.isWeekend
                  ? 'bg-slate-50/80 dark:bg-slate-800/35 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40';

                return (
                  <div
                    key={cell.key}
                    onClick={() => onSelectDate(cell.date)}
                    className={`min-h-[88px] p-2.5 transition-colors duration-150 cursor-pointer flex flex-col justify-between ${cellSurface}`}
                  >
                    {/* Top row: Day number + subtle dot for past unrecorded workdays */}
                    <div className="flex items-center justify-between">
                      <span
                        className={
                          cell.isToday
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center text-xs font-bold tabular-nums'
                            : `text-xs font-semibold tabular-nums px-1 ${
                                cell.isWeekend
                                  ? 'text-slate-500 dark:text-slate-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`
                        }
                      >
                        {cell.dayNumber}
                      </span>

                      {isPastUnrecordedWorkday && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"
                          title={isRTL ? 'غير مسجل' : 'Non saisi'}
                        />
                      )}
                    </div>

                    {/* Status pill ONLY when an attendance or leave record exists */}
                    {att && (
                      <div className="mt-2 space-y-1">
                        {att.statut === 'present' ? (
                          <div
                            className="px-2 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70 flex items-center justify-between gap-1 truncate"
                            title={visual.label}
                          >
                            <span className="truncate">{visual.label}</span>
                            {att.heureArrivee && (
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                                {att.heureArrivee}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            className="px-2 py-1 rounded-md text-xs font-semibold truncate border"
                            style={{
                              backgroundColor: visual.bgLight,
                              color: visual.color,
                              borderColor: visual.borderColor,
                            }}
                            title={visual.label}
                          >
                            {visual.label}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Résumé mensuel */}
      <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {isRTL ? 'حصيلة الشهر:' : 'Bilan du mois :'}
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
            {isRTL ? `حضور: ${monthStats.presents} أيام` : `Présence : ${monthStats.presents} j`}
          </span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>
          <span className="text-rose-700 dark:text-rose-400 font-semibold tabular-nums">
            {isRTL ? `غياب: ${monthStats.absents} أيام` : `Absence : ${monthStats.absents} j`}
          </span>
          {monthStats.deducted > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-semibold tabular-nums">
                {isRTL
                  ? `أيام مخصومة من الرصيد: ${monthStats.deducted}`
                  : `Déduits du solde : ${monthStats.deducted}`}
              </span>
            </>
          )}
        </div>

        <span className="text-slate-500 dark:text-slate-400">
          {isRTL
            ? 'اضغط على أي يوم لعرض التفاصيل أدناه'
            : 'Cliquez sur un jour pour afficher les détails'}
        </span>
      </div>

      {/* Détails du jour sélectionné au clic */}
      {selectedDate && (
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">
                  {formatDateWithWeekday(selectedDate, isRTL ? 'ar' : 'fr')}
                </bdi>
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {selectedDate}
              </span>
            </div>

            {selectedDayAttendance ? (
              <div
                className={`text-xs font-semibold px-3 py-1 rounded-full border self-start sm:self-auto ${
                  selectedDayVisual.statut === 'present'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
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
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isRTL ? 'لا يوجد سجل لهذا اليوم' : 'Aucun enregistrement'}
              </span>
            )}
          </div>

          {selectedDayAttendance && (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {selectedDayAttendance.statut === 'present' && selectedDayAttendance.heureArrivee && (
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {isRTL
                        ? `وقت الوصول: ${selectedDayAttendance.heureArrivee}`
                        : `Heure d'arrivée : ${selectedDayAttendance.heureArrivee}`}
                    </span>
                  </div>
                )}

                {selectedDayAttendance.statut === 'absent' && (
                  <div className="flex items-center gap-1.5">
                    {selectedDayVisual.impacteSolde ? (
                      <span className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>
                          {isRTL ? 'يخصم من رصيد الإجازات السنوية' : 'Déduit du solde annuel'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>
                          {isRTL ? 'لا يخصم من الرصيد السنوي' : 'Non déduit du solde annuel'}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Détails du motif si existant */}
              {selectedDayAttendance.detailsMotif && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {selectedDayAttendance.detailsMotif.nomService && (
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block mb-0.5 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                        <span>{isRTL ? 'المصلحة:' : 'Service :'}</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.nomService}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.lieuMission && (
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block mb-0.5 flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                        <span>{isRTL ? 'مكان المهمة:' : 'Lieu de mission :'}</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.lieuMission}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.objetMission && (
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block mb-0.5 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                        <span>{isRTL ? 'موضوع المهمة:' : 'Objet de la mission :'}</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.objetMission}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.intituleFormation && (
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block mb-0.5 flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                        <span>{isRTL ? 'التكوين:' : 'Formation :'}</span>
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.intituleFormation}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.commentaire && (
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 sm:col-span-2">
                      <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                        {isRTL ? 'ملاحظة:' : 'Commentaire :'}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {selectedDayAttendance.detailsMotif.commentaire}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCalendarMonthView;
