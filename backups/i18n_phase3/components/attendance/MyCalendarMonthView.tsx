import React, { useMemo, useState } from 'react';
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
import { formatArabicDateWithDay } from '@/utils/arabicDateFormatter';
import { getStatusVisualInfo } from './MyAttendanceLegend';

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
    <div className="bg-white border border-[#e2e8f0] rounded p-5 space-y-5 shadow-none" dir="rtl">
      {/* Contrôles Mois & Année */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="h-11 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="الشهر السابق"
          >
            <ChevronRight className="h-4 w-4" />
            <span>الشهر السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentMonth}
            className="h-11 px-3 border-[#e2e8f0] rounded text-gray-700 hover:bg-gray-50 text-xs font-semibold"
          >
            الشهر الحالي
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-11 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="الشهر الموالي"
          >
            <span>الشهر الموالي</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Sélecteurs Mois et Année */}
        <div className="flex items-center gap-2">
          <Select
            value={String(month)}
            onValueChange={(val) => onYearMonthChange(year, parseInt(val, 10))}
          >
            <SelectTrigger className="h-9 w-44 border-[#e2e8f0] rounded text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
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
            <SelectTrigger className="h-9 w-24 border-[#e2e8f0] rounded text-xs bg-white font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs font-mono">
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
          <div className="h-6 w-6 border-2 border-[#2c5282] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">جاري تحميل بيانات الشهر...</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* En-têtes de colonnes (jours de la semaine) */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center">
            {WEEKDAY_HEADERS.map((dayName) => (
              <div
                key={dayName}
                className="py-2 text-xs font-bold text-[#4a5568] bg-[#f7fafc] border border-[#e2e8f0] rounded"
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
                    className="min-h-[90px] p-2 bg-gray-50/50 border border-gray-100 rounded text-gray-300 select-none opacity-40"
                  >
                    <span className="text-xs font-mono">{cell.dayNumber}</span>
                  </div>
                );
              }

              const att = attendanceMap.get(cell.date);
              const visual = getStatusVisualInfo(att, leaveReasons);
              const isSelected = selectedDate === cell.date;

              return (
                <div
                  key={cell.key}
                  onClick={() => onSelectDate(cell.date)}
                  className={`min-h-[90px] p-2 rounded border transition-all duration-150 cursor-pointer flex flex-col justify-between hover:shadow-sm ${
                    isSelected ? 'ring-2 ring-[#2c5282] shadow-sm z-10' : ''
                  }`}
                  style={{
                    backgroundColor: visual.bgLight,
                    borderColor: isSelected ? '#2c5282' : visual.borderColor,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                        cell.isToday
                          ? 'bg-[#2c5282] text-white'
                          : 'text-gray-900 bg-white/70'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {att?.statut === 'present' && (
                      <span className="w-2 h-2 rounded-full bg-green-600" title="حاضر" />
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
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded text-center truncate shadow-none border"
                      style={{
                        backgroundColor: '#ffffff',
                        color: visual.color,
                        borderColor: visual.borderColor,
                      }}
                      title={visual.label}
                    >
                      {visual.label}
                    </div>

                    {att?.statut === 'present' && att.heureArrivee && (
                      <span className="text-[10px] text-gray-500 font-mono block text-center mt-0.5">
                        {att.heureArrivee}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Résumé mensuel */}
      <div className="pt-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#718096]">حصيلة الشهر :</span>
          <span className="text-green-700 bg-green-50 px-2.5 py-1 rounded border border-green-200 font-medium">
            حضور : {monthStats.presents} أيام
          </span>
          <span className="text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200 font-medium">
            غياب : {monthStats.absents} أيام
          </span>
          {monthStats.deducted > 0 && (
            <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-medium">
              أيام مخصومة من الرصيد : {monthStats.deducted}
            </span>
          )}
        </div>

        <span className="text-gray-400 text-[11px]">
          * اضغط على أي يوم لعرض تفاصيله الكاملة أدناه
        </span>
      </div>

      {/* Détails du jour sélectionné au clic */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t-2 border-[#2c5282]/20 bg-[#f7fafc] border border-[#e2e8f0] rounded p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#edf2f7] pb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#2c5282]" />
              <h4 className="text-sm font-bold text-[#1a202c]">
                تفاصيل اليوم المحدد : {formatArabicDateWithDay(selectedDate)}
              </h4>
              <span className="text-xs text-gray-500 font-mono">({selectedDate})</span>
            </div>

            <div
              className="text-xs font-bold px-3 py-1 rounded border self-start sm:self-auto"
              style={{
                backgroundColor: selectedDayVisual.bgLight,
                color: selectedDayVisual.color,
                borderColor: selectedDayVisual.borderColor,
              }}
            >
              {selectedDayVisual.label}
            </div>
          </div>

          {selectedDayAttendance ? (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {selectedDayAttendance.statut === 'present' && selectedDayAttendance.heureArrivee && (
                  <div className="flex items-center gap-1.5 text-gray-700 bg-white px-2.5 py-1 rounded border border-[#e2e8f0]">
                    <Clock className="h-3.5 w-3.5 text-green-600" />
                    <span>وقت الوصول : {selectedDayAttendance.heureArrivee}</span>
                  </div>
                )}

                {selectedDayAttendance.statut === 'absent' && (
                  <div className="flex items-center gap-1.5">
                    {selectedDayVisual.impacteSolde ? (
                      <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-300 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        <span>يخصم من رصيد الإجازات السنوية</span>
                      </span>
                    ) : (
                      <span className="text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
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
                    <div className="bg-white p-2.5 rounded border border-[#e2e8f0]">
                      <span className="text-gray-500 block mb-0.5 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-[#2c5282]" />
                        <span>المصلحة:</span>
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedDayAttendance.detailsMotif.nomService}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.lieuMission && (
                    <div className="bg-white p-2.5 rounded border border-[#e2e8f0]">
                      <span className="text-gray-500 block mb-0.5 flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-[#2c5282]" />
                        <span>مكان المهمة:</span>
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedDayAttendance.detailsMotif.lieuMission}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.objetMission && (
                    <div className="bg-white p-2.5 rounded border border-[#e2e8f0]">
                      <span className="text-gray-500 block mb-0.5 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-[#2c5282]" />
                        <span>موضوع المهمة:</span>
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedDayAttendance.detailsMotif.objetMission}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.intituleFormation && (
                    <div className="bg-white p-2.5 rounded border border-[#e2e8f0]">
                      <span className="text-gray-500 block mb-0.5 flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-[#2c5282]" />
                        <span>التكوين:</span>
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedDayAttendance.detailsMotif.intituleFormation}
                      </span>
                    </div>
                  )}

                  {selectedDayAttendance.detailsMotif.commentaire && (
                    <div className="bg-white p-2.5 rounded border border-[#e2e8f0] sm:col-span-2">
                      <span className="text-gray-500 block mb-0.5">ملاحظة:</span>
                      <span className="text-gray-800">
                        {selectedDayAttendance.detailsMotif.commentaire}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              لم يتم تسجيل أي حضور أو غياب لهذا اليوم بعد.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCalendarMonthView;
