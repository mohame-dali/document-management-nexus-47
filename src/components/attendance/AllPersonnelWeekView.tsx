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
    <div className="bg-white border border-[#e2e8f0] rounded shadow-none space-y-4 p-5" dir="rtl">
      {/* Contrôles Navigation Semaine */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            className="h-11 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="الأسبوع السابق"
          >
            <ChevronRight className="h-4 w-4" />
            <span>الأسبوع السابق</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentWeek}
            className="h-11 px-3 border-[#e2e8f0] rounded text-gray-700 hover:bg-gray-50 text-xs font-semibold"
          >
            الأسبوع الحالي
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="h-11 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="الأسبوع الموالي"
          >
            <span>الأسبوع الموالي</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-xs text-[#718096] flex items-center gap-1.5 font-mono">
          <Calendar className="h-3.5 w-3.5 text-[#2c5282]" />
          <span>{weekRangeLabel}</span>
        </div>
      </div>

      {/* Barre de filtres (Département & Recherche) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#f7fafc] p-3 rounded border border-[#e2e8f0]">
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
      </div>

      {/* Grille de la semaine */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">جاري تحميل بيانات الأسبوع لكافة الموظفين...</p>
        </div>
      ) : personnelList.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#f7fafc] rounded border border-dashed border-[#cbd5e0]">
          <Users className="h-8 w-8 text-gray-400 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">لا يوجد موظفون مطابقون لمعايير البحث</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#e2e8f0] rounded">
          <table className="w-full text-right text-xs divide-y divide-[#e2e8f0]">
            <thead className="bg-[#f7fafc] text-[#4a5568] font-bold">
              <tr>
                <th className="py-3 px-3 min-w-[200px]">الموظف</th>
                {weekDays.map((day) => (
                  <th
                    key={day.date}
                    className={`py-2 px-2 text-center min-w-[110px] border-r border-gray-200 ${
                      day.isToday ? 'bg-[#2c5282]/10 text-[#2c5282]' : ''
                    }`}
                  >
                    <div className="font-bold">{day.dayName}</div>
                    <div className="text-[10px] font-mono text-gray-500">{day.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f7] bg-white">
              {personnelList.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50/80 transition-colors">
                  {/* Employé info */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <PersonnelAvatar
                        photo={p.photo}
                        nom={p.nom}
                        prenom={p.prenom}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-[#1a202c] truncate">
                          {p.nom} {p.prenom}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
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
                        className={`py-2 px-1 text-center border-r border-gray-100 ${
                          day.isToday ? 'bg-blue-50/30' : ''
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
            <tfoot className="bg-[#f7fafc] border-t-2 border-[#e2e8f0] font-bold">
              <tr>
                <td className="py-3 px-3 text-xs text-[#1a202c]">
                  إجمالي الحضور والغياب اليومي :
                </td>
                {dailyTotals.map((tot, idx) => (
                  <td
                    key={weekDays[idx].date}
                    className="py-2 px-1.5 text-center border-r border-gray-200 text-[11px]"
                  >
                    <div className="space-y-0.5">
                      <div className="text-green-700 font-mono">ح: {tot.presents}</div>
                      <div className="text-red-700 font-mono">غ: {tot.absents}</div>
                      {tot.unrecorded > 0 && (
                        <div className="text-gray-400 font-mono text-[10px]">
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
