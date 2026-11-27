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
  date: string;
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs space-y-3.5 p-4 text-start" dir={dir}>
      {/* Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="h-9 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span>{isRTL ? 'اليوم السابق' : 'Jour précédent'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-9 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            {isRTL ? 'اليوم' : "Aujourd'hui"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="h-9 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
          >
            <span>{isRTL ? 'اليوم الموالي' : 'Jour suivant'}</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1 tabular-nums">
            <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
            <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">
              {formatDateWithWeekday(date, isRTL ? 'ar' : 'fr')}
            </bdi>
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 w-40 border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="h-4 w-4 absolute start-3 top-2.5 text-slate-700 dark:text-slate-300" />
          <Input
            type="text"
            placeholder={isRTL ? 'بحث بالاسم أو اللقب أو ب.ت.و...' : 'Rechercher par nom, prénom ou CIN...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 ps-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg"
          />
        </div>

        <div>
          <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
            <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg">
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                <SelectValue placeholder={isRTL ? 'كل الأقسام والمصالح' : 'Tous les départements'} />
              </div>
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="all" className="text-xs">
                {isRTL ? 'كل الأقسام والمصالح' : 'Tous les départements'}
              </SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept._id} value={dept._id} className="text-xs">
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-xs border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg">
              <SelectValue placeholder={isRTL ? 'كل الحالات' : 'Tous les statuts'} />
            </SelectTrigger>
            <SelectContent dir={dir}>
              <SelectItem value="all" className="text-xs">{isRTL ? 'كل الحالات' : 'Tous les statuts'}</SelectItem>
              <SelectItem value="present" className="text-xs">{isRTL ? 'حاضر فقط' : 'Présents uniquement'}</SelectItem>
              <SelectItem value="absent" className="text-xs">{isRTL ? 'غائب فقط' : 'Absents uniquement'}</SelectItem>
              <SelectItem value="formation" className="text-xs">{isRTL ? 'في تكوين' : 'En formation'}</SelectItem>
              <SelectItem value="service" className="text-xs">{isRTL ? 'في خدمة / مهمة' : 'En service / mission'}</SelectItem>
              <SelectItem value="unrecorded" className="text-xs">{isRTL ? 'غير مسجل بعد' : 'Non saisi'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <TableSkeleton rows={6} columns={6} />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-700 dark:text-slate-300" />}
            title={isRTL ? 'لا يوجد موظفون يطابقون معايير البحث المحددة' : 'Aucun employé correspondant'}
            description={isRTL ? 'يرجى ضبط معايير البحث أو اختيار قسم مختلف' : 'Ajustez les filtres ou choisissez un autre département'}
          />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[650px] border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-start text-xs divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 font-bold backdrop-blur-sm">
              <tr>
                <th className="sticky start-0 z-30 bg-slate-50 dark:bg-slate-800 py-3 px-3 min-w-[200px] whitespace-nowrap">
                  {isRTL ? 'الموظف' : 'Employé'}
                </th>
                <th className="py-3 px-3 whitespace-nowrap">{isRTL ? 'الوظيفة' : 'Poste'}</th>
                <th className="py-3 px-3 whitespace-nowrap">{isRTL ? 'القسم / المصلحة' : 'Département'}</th>
                <th className="py-3 px-3 whitespace-nowrap">{isRTL ? 'الحالة اليومية' : 'Statut'}</th>
                <th className="py-3 px-3 whitespace-nowrap">{isRTL ? 'تفاصيل السبب' : 'Détails'}</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">{isRTL ? 'خصم من الرصيد' : 'Impact solde'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {records.map((item) => {
                const p = item.personnel;
                const att = item.attendance;
                const details = att?.detailsMotif;
                const serviceLabel = details?.serviceNom || details?.nomService;
                const missionLieu = details?.missionLieu || details?.lieuMission;
                const missionObjet = details?.missionObjet || details?.objetMission;
                const formationTitle = details?.formationIntitule || details?.intituleFormation;

                return (
                  <tr key={p._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2.5 px-3 font-medium transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <PersonnelAvatar photo={p.photo} nom={p.nom} prenom={p.prenom} size="sm" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {p.nom} {p.prenom}
                          </div>
                          {p.cin && (
                            <div className="text-[13px] text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                              {p.cin}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {p.poste || '-'}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[13px] whitespace-nowrap">
                        <Building2 className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                        <span>{getDepartmentName(p.activeDepartment)}</span>
                      </span>
                    </td>

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

                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {att?.statut === 'present' ? (
                        <span className="text-[13px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{isRTL ? 'حاضر في مقر العمل' : 'Présent au poste'}</span>
                        </span>
                      ) : att?.statut === 'absent' ? (
                        <div className="space-y-0.5 max-w-xs">
                          {serviceLabel && (
                            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                              {isRTL ? 'الجهة:' : 'Service :'} {serviceLabel}
                            </div>
                          )}
                          {missionLieu && (
                            <div className="text-[13px] text-slate-600 dark:text-slate-300">
                              {isRTL ? 'المكان:' : 'Lieu :'} {missionLieu} {missionObjet && `— ${missionObjet}`}
                            </div>
                          )}
                          {formationTitle && (
                            <div className="text-[13px] text-slate-600 dark:text-slate-300">
                              {isRTL ? 'التكوين:' : 'Formation :'} {formationTitle}
                            </div>
                          )}
                          {details?.commentaire && (
                            <div className="text-[13px] text-slate-700 dark:text-slate-300 italic">
                              "{details.commentaire}"
                            </div>
                          )}
                          {!serviceLabel && !missionLieu && !formationTitle && !details?.commentaire && (
                            <span className="text-slate-700 dark:text-slate-300 text-[13px]">-</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 text-[13px]">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {att?.statut === 'absent' ? (
                        att.impacteSolde ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[13px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {isRTL ? 'نعم (يخصم)' : 'Déduit'}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[13px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {isRTL ? 'لا يخصم' : 'Non déduit'}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300">
        <span>
          {isRTL ? 'إجمالي السجلات المعروضة:' : 'Total affiché :'}{' '}
          <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{records.length}</strong>{' '}
          {isRTL ? 'موظف' : 'employés'}
        </span>
        <span className="text-[13px] flex items-center gap-1">
          <Info className="h-3 w-3" />
          <span>
            {isRTL
              ? 'تظهر النتائج المطابقة للتاريخ والقسم والحالة المحددة'
              : 'Résultats filtrés selon la date, le département et le statut'}
          </span>
        </span>
      </div>
    </div>
  );
};

export default AllPersonnelDayView;
