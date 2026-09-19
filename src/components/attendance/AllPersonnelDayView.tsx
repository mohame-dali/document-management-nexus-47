import React from 'react';
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
  Clock,
  Info,
  Users,
} from 'lucide-react';
import { AttendanceRecord } from '@/services/attendanceService';
import { LeaveReason } from '@/services/leaveReasonService';
import { PersonnelAvatar } from '@/components/hr/PersonnelAvatar';
import AttendanceStatusBadge from './AttendanceStatusBadge';
import { formatArabicDateWithDay } from '@/utils/arabicDateFormatter';

export interface DayPersonnelItem {
  personnel: {
    _id: string;
    nom: string;
    prenom: string;
    cin?: string;
    poste?: string;
    photo?: string;
    activeDepartment?: { _id: string; name: string; code?: string } | string;
  };
  attendance: AttendanceRecord | null;
}

interface AllPersonnelDayViewProps {
  date: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  records: DayPersonnelItem[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  departments: Array<{ _id: string; name: string }>;
  selectedDepartment: string;
  onDepartmentChange: (deptId: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const AllPersonnelDayView: React.FC<AllPersonnelDayViewProps> = ({
  date,
  onDateChange,
  records,
  leaveReasons,
  isLoading,
  departments,
  selectedDepartment,
  onDepartmentChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
}) => {
  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    onDateChange(new Date().toISOString().split('T')[0]);
  };

  const getDepartmentName = (dept: unknown): string => {
    if (!dept) return '-';
    if (typeof dept === 'object' && 'name' in (dept as Record<string, unknown>)) {
      return String((dept as { name: string }).name);
    }
    const found = departments.find((d) => d._id === String(dept));
    return found?.name || '-';
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded shadow-none space-y-4 p-5" dir="rtl">
      {/* Contrôles Date & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="h-9 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="اليوم السابق"
          >
            <ChevronRight className="h-4 w-4" />
            <span>اليوم السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-9 px-3 border-[#e2e8f0] rounded text-gray-700 hover:bg-gray-50 text-xs font-semibold"
          >
            اليوم
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="h-9 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="اليوم الموالي"
          >
            <span>اليوم الموالي</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#718096] font-medium flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-[#2c5282]" />
            <span>{formatArabicDateWithDay(date)}</span>
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 w-40 border-[#e2e8f0] rounded text-xs bg-white"
          />
        </div>
      </div>

      {/* Barre de filtres (Département, Statut, Recherche) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f7fafc] p-3 rounded border border-[#e2e8f0]">
        {/* Recherche */}
        <div className="relative">
          <Search className="h-4 w-4 absolute right-3 top-2.5 text-gray-400" />
          <Input
            type="text"
            placeholder="بحث بالاسم أو اللقب أو ب.ت.و..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pr-9 text-xs border-[#e2e8f0] bg-white rounded"
          />
        </div>

        {/* Filtre Département */}
        <div>
          <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
            <SelectTrigger className="h-9 text-xs border-[#e2e8f0] bg-white rounded">
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                <SelectValue placeholder="كل الأقسام والمصالح" />
              </div>
            </SelectTrigger>
            <SelectContent dir="rtl">
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

        {/* Filtre État */}
        <div>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-xs border-[#e2e8f0] bg-white rounded">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all" className="text-xs">
                كل الحالات
              </SelectItem>
              <SelectItem value="present" className="text-xs">
                حاضر فقط
              </SelectItem>
              <SelectItem value="absent" className="text-xs">
                غائب فقط
              </SelectItem>
              <SelectItem value="formation" className="text-xs">
                في تكوين
              </SelectItem>
              <SelectItem value="service" className="text-xs">
                في خدمة / مهمة
              </SelectItem>
              <SelectItem value="unrecorded" className="text-xs">
                غير مسجل بعد
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tableau des employés */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">جاري تحميل سجل الحضور لليوم...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#f7fafc] rounded border border-dashed border-[#cbd5e0]">
          <Users className="h-8 w-8 text-gray-400 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">
            لا يوجد موظفون يطابقون معايير البحث المحددة
          </p>
          <p className="text-xs text-gray-500">
            يرجى ضبط معايير البحث أو اختيار قسم مختلف
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#e2e8f0] rounded">
          <table className="w-full text-right text-xs divide-y divide-[#e2e8f0]">
            <thead className="bg-[#f7fafc] text-[#4a5568] font-bold">
              <tr>
                <th className="py-3 px-3 w-12 text-center">الصورة</th>
                <th className="py-3 px-3">الموظف (الاسم واللقب)</th>
                <th className="py-3 px-3">الوظيفة</th>
                <th className="py-3 px-3">القسم / المصلحة</th>
                <th className="py-3 px-3">الحالة اليومية</th>
                <th className="py-3 px-3">تفاصيل السبب</th>
                <th className="py-3 px-3 text-center">خصم من الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f7] bg-white">
              {records.map((item) => {
                const p = item.personnel;
                const att = item.attendance;
                const details = att?.detailsMotif;

                return (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    {/* Photo */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">
                        <PersonnelAvatar
                          photo={p.photo}
                          nom={p.nom}
                          prenom={p.prenom}
                          size="sm"
                        />
                      </div>
                    </td>

                    {/* Nom Prénom + CIN */}
                    <td className="py-2.5 px-3 font-medium">
                      <div className="font-bold text-[#1a202c]">
                        {p.nom} {p.prenom}
                      </div>
                      {p.cin && (
                        <div className="text-[10px] text-gray-400 font-mono">
                          {p.cin}
                        </div>
                      )}
                    </td>

                    {/* Poste */}
                    <td className="py-2.5 px-3 text-gray-600">
                      {p.poste || '-'}
                    </td>

                    {/* Département */}
                    <td className="py-2.5 px-3 text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        <span>{getDepartmentName(p.activeDepartment)}</span>
                      </span>
                    </td>

                    {/* État */}
                    <td className="py-2.5 px-3">
                      <AttendanceStatusBadge
                        statut={att?.statut || 'unrecorded'}
                        motif={att?.motif}
                        heureArrivee={att?.heureArrivee}
                        leaveReasons={leaveReasons}
                        impacteSolde={att?.impacteSolde}
                        size="md"
                      />
                    </td>

                    {/* Motif & Détails */}
                    <td className="py-2.5 px-3 text-gray-700">
                      {att?.statut === 'present' ? (
                        <span className="text-[11px] text-green-700 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-green-600" />
                          <span>حاضر في مقر العمل</span>
                        </span>
                      ) : att?.statut === 'absent' ? (
                        <div className="space-y-0.5 max-w-xs">
                          {details?.nomService && (
                            <div className="text-[11px] font-semibold text-gray-800">
                              الجهة: {details.nomService}
                            </div>
                          )}
                          {details?.lieuMission && (
                            <div className="text-[11px] text-gray-600">
                              المكان: {details.lieuMission} {details.objetMission && `— ${details.objetMission}`}
                            </div>
                          )}
                          {details?.intituleFormation && (
                            <div className="text-[11px] text-gray-600">
                              التكوين: {details.intituleFormation}
                            </div>
                          )}
                          {details?.commentaire && (
                            <div className="text-[10px] text-gray-500 italic">
                              "{details.commentaire}"
                            </div>
                          )}
                          {!details?.nomService &&
                            !details?.lieuMission &&
                            !details?.intituleFormation &&
                            !details?.commentaire && (
                              <span className="text-gray-400 text-[11px]">-</span>
                            )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Impact solde */}
                    <td className="py-2.5 px-3 text-center">
                      {att?.statut === 'absent' ? (
                        att.impacteSolde ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            نعم (يخصم)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                            لا يخصم
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pied de tableau */}
      <div className="pt-2 flex items-center justify-between text-xs text-[#718096]">
        <span>إجمالي السجلات المعروضة : <strong className="font-mono">{records.length}</strong> موظف</span>
        <span className="text-[11px] flex items-center gap-1">
          <Info className="h-3 w-3" />
          <span>تظهر النتائج المطابقة للتاريخ والقسم والحالة المحددة</span>
        </span>
      </div>
    </div>
  );
};

export default AllPersonnelDayView;
