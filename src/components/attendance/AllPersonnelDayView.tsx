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
import { formatDateWithWeekday } from '@/utils/formatDate';
import { useDirection } from '@/i18n/useDirection';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

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
  const { dir, isRTL } = useDirection();

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-4 p-5 text-start" dir={dir}>
      {/* Contrôles Date & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="اليوم السابق"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span>اليوم السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            اليوم
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="h-10 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
            title="اليوم الموالي"
          >
            <span>اليوم الموالي</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 tabular-nums">
            <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
            <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">{formatDateWithWeekday(date, isRTL ? 'ar' : 'fr')}</bdi>
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 w-40 border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
          />
        </div>
      </div>

      {/* Barre de filtres (Département, Statut, Recherche) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        {/* Recherche */}
        <div className="relative">
          <Search className="h-4 w-4 absolute start-3 top-2.5 text-slate-400" />
          <Input
            type="text"
            placeholder="بحث بالاسم أو اللقب أو ب.ت.و..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 ps-9 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg"
          />
        </div>

        {/* Filtre Département */}
        <div>
          <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
            <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg">
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
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

        {/* Filtre État */}
        <div>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent dir={dir}>
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
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <TableSkeleton rows={6} columns={6} />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-400 dark:text-slate-500" />}
            title="لا يوجد موظفون يطابقون معايير البحث المحددة"
            description="يرجى ضبط معايير البحث أو اختيار قسم مختلف"
          />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[650px] border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-start text-xs divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 font-bold backdrop-blur-sm">
              <tr>
                <th className="sticky start-0 z-30 bg-slate-50 dark:bg-slate-800 py-3 px-3 min-w-[200px] whitespace-nowrap">الموظف (الاسم واللقب)</th>
                <th className="py-3 px-3 whitespace-nowrap">الوظيفة</th>
                <th className="py-3 px-3 whitespace-nowrap">القسم / المصلحة</th>
                <th className="py-3 px-3 whitespace-nowrap">الحالة اليومية</th>
                <th className="py-3 px-3 whitespace-nowrap">تفاصيل السبب</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">خصم من الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {records.map((item) => {
                const p = item.personnel;
                const att = item.attendance;
                const details = att?.detailsMotif;

                return (
                  <tr key={p._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    {/* Photo + Nom Prénom + CIN */}
                    <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2.5 px-3 font-medium transition-colors whitespace-nowrap">
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
                          {p.cin && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                              {p.cin}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Poste */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {p.poste || '-'}
                    </td>

                    {/* Département */}
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] whitespace-nowrap">
                        <Building2 className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        <span>{getDepartmentName(p.activeDepartment)}</span>
                      </span>
                    </td>

                    {/* État */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
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
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {att?.statut === 'present' ? (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>حاضر في مقر العمل</span>
                        </span>
                      ) : att?.statut === 'absent' ? (
                        <div className="space-y-0.5 max-w-xs">
                          {details?.nomService && (
                            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                              الجهة: {details.nomService}
                            </div>
                          )}
                          {details?.lieuMission && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">
                              المكان: {details.lieuMission} {details.objetMission && `— ${details.objetMission}`}
                            </div>
                          )}
                          {details?.intituleFormation && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300">
                              التكوين: {details.intituleFormation}
                            </div>
                          )}
                          {details?.commentaire && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                              "{details.commentaire}"
                            </div>
                          )}
                          {!details?.nomService &&
                            !details?.lieuMission &&
                            !details?.intituleFormation &&
                            !details?.commentaire && (
                              <span className="text-slate-400 dark:text-slate-500 text-[11px]">-</span>
                            )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Impact solde */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {att?.statut === 'absent' ? (
                        att.impacteSolde ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            نعم (يخصم)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            لا يخصم
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
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
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>إجمالي السجلات المعروضة : <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{records.length}</strong> موظف</span>
        <span className="text-[11px] flex items-center gap-1">
          <Info className="h-3 w-3" />
          <span>تظهر النتائج المطابقة للتاريخ والقسم والحالة المحددة</span>
        </span>
      </div>
    </div>
  );
};

export default AllPersonnelDayView;
