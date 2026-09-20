import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Building2,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { formatArabicDateWithDay } from '@/utils/arabicDateFormatter';
import { getStatusVisualInfo } from './MyAttendanceLegend';

interface MyCalendarDayViewProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  dayAttendance: AttendanceRecord | null;
  leaveReasons: LeaveReason[];
  isLoading: boolean;
}

export const MyCalendarDayView: React.FC<MyCalendarDayViewProps> = ({
  selectedDate,
  onDateChange,
  dayAttendance,
  leaveReasons,
  isLoading,
}) => {
  // Navigation jour précédent / suivant
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const prev = current.toISOString().split('T')[0];
    onDateChange(prev);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const next = current.toISOString().split('T')[0];
    onDateChange(next);
  };

  const handleToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onDateChange(today);
  };

  const visual = getStatusVisualInfo(dayAttendance, leaveReasons);
  const details = dayAttendance?.detailsMotif;

  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-5 space-y-5 shadow-none" dir="rtl">
      {/* Contrôles de navigation et date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="h-11 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="اليوم السابق"
          >
            <ChevronRight className="h-4 w-4" />
            <span>اليوم السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-11 px-3 border-[#e2e8f0] rounded text-gray-700 hover:bg-gray-50 text-xs font-semibold"
          >
            اليوم
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="h-11 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="اليوم الموالي"
          >
            <span>اليوم الموالي</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Sélecteur de date direct */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#718096] font-medium">اختر التاريخ:</span>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 w-40 border-[#e2e8f0] rounded text-xs bg-white"
          />
        </div>
      </div>

      {/* Détails de la journée */}
      {isLoading ? (
        <div className="py-12 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">جاري تحميل بيانات اليوم...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Entête du jour avec statut */}
          <div
            className="p-5 rounded border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200"
            style={{
              backgroundColor: visual.bgLight,
              borderColor: visual.borderColor,
            }}
          >
            <div className="space-y-1">
              <span className="text-xs text-[#718096] font-medium block">
                تاريخ المعاينة اليومية
              </span>
              <h3 className="text-lg font-bold text-[#1a202c]">
                {formatArabicDateWithDay(selectedDate)}
              </h3>
              <p className="text-xs text-gray-500 font-mono">{selectedDate}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Badge d'état principal */}
              <div
                className="px-3.5 py-1.5 rounded text-sm font-bold flex items-center gap-2 border shadow-none"
                style={{
                  backgroundColor: '#ffffff',
                  color: visual.color,
                  borderColor: visual.borderColor,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: visual.color }}
                />
                <span>{visual.label}</span>
              </div>

              {/* Heure d'arrivée si présent */}
              {dayAttendance?.statut === 'present' && dayAttendance.heureArrivee && (
                <div className="px-3 py-1.5 rounded bg-white border border-green-200 text-green-800 text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-green-600" />
                  <span>وقت الوصول : {dayAttendance.heureArrivee}</span>
                </div>
              )}

              {/* Badge impact solde si absent */}
              {dayAttendance?.statut === 'absent' && (
                <div>
                  {visual.impacteSolde ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-900 border-amber-300 px-3 py-1 text-xs font-semibold flex items-center gap-1"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      <span>يخصم من رصيد الإجازات</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-900 border-blue-200 px-3 py-1 text-xs font-semibold flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                      <span>لا يخصم من الرصيد السنوي</span>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section détails contextuels du motif d'absence */}
          {dayAttendance?.statut === 'absent' && details && (
            <div className="bg-[#f7fafc] border border-[#e2e8f0] rounded p-4 space-y-3">
              <h4 className="text-xs font-bold text-[#1a202c] flex items-center gap-1.5 border-b border-[#edf2f7] pb-2">
                <FileText className="h-4 w-4 text-[#2c5282]" />
                <span>البيانات التفصيلية لسبب الغياب</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {/* Service */}
                {details.nomService && (
                  <div className="bg-white p-3 rounded border border-[#e2e8f0]">
                    <span className="text-gray-500 block mb-1 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-[#2c5282]" />
                      <span>المصلحة أو الوجهة:</span>
                    </span>
                    <span className="font-semibold text-gray-900">{details.nomService}</span>
                  </div>
                )}

                {/* Mission */}
                {details.lieuMission && (
                  <div className="bg-white p-3 rounded border border-[#e2e8f0]">
                    <span className="text-gray-500 block mb-1 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-[#2c5282]" />
                      <span>مكان المهمة:</span>
                    </span>
                    <span className="font-semibold text-gray-900">{details.lieuMission}</span>
                  </div>
                )}

                {details.objetMission && (
                  <div className="bg-white p-3 rounded border border-[#e2e8f0]">
                    <span className="text-gray-500 block mb-1 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-[#2c5282]" />
                      <span>موضوع المهمة:</span>
                    </span>
                    <span className="font-semibold text-gray-900">{details.objetMission}</span>
                  </div>
                )}

                {/* Formation */}
                {details.intituleFormation && (
                  <div className="bg-white p-3 rounded border border-[#e2e8f0]">
                    <span className="text-gray-500 block mb-1 flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5 text-[#2c5282]" />
                      <span>عنوان الدورة التكوينية:</span>
                    </span>
                    <span className="font-semibold text-gray-900">{details.intituleFormation}</span>
                  </div>
                )}

                {details.organismeFormation && (
                  <div className="bg-white p-3 rounded border border-[#e2e8f0]">
                    <span className="text-gray-500 block mb-1">الهيئة المؤطرة:</span>
                    <span className="font-semibold text-gray-900">{details.organismeFormation}</span>
                  </div>
                )}

                {details.dureeFormation && (
                  <div className="bg-white p-3 rounded border border-[#e2e8f0]">
                    <span className="text-gray-500 block mb-1">مدة التكوين:</span>
                    <span className="font-semibold text-gray-900">{details.dureeFormation}</span>
                  </div>
                )}
              </div>

              {details.commentaire && (
                <div className="bg-white p-3 rounded border border-[#e2e8f0] text-xs space-y-1">
                  <span className="text-gray-500 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                    <span>ملاحظات إضافية:</span>
                  </span>
                  <p className="text-gray-800">{details.commentaire}</p>
                </div>
              )}
            </div>
          )}

          {/* Si non enregistré */}
          {!dayAttendance && (
            <div className="bg-[#f7fafc] border border-dashed border-[#cbd5e0] rounded p-8 text-center space-y-2">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">
                لم يتم تسجيل حالة الحضور لهذا اليوم بعد
              </p>
              <p className="text-xs text-gray-500">
                يقوم مسؤول الموارد البشرية أو رئيس المصلحة بتسجيل وتأكيد الحضور اليومي.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCalendarDayView;
