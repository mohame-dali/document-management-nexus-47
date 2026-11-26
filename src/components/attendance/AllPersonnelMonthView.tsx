import React, { useState, useMemo, useCallback } from 'react';
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
  ArrowUpDown,
  Users,
} from 'lucide-react';
import { LeaveReason } from '@/services/leaveReasonService';
import { PersonnelAvatar } from '@/components/hr/PersonnelAvatar';
import { useDirection } from '@/i18n/useDirection';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

export interface MonthPersonnelRecord {
  personnel: {
    _id: string;
    nom: string;
    prenom: string;
    cin?: string;
    poste?: string;
    photo?: string;
    activeDepartment?: { _id: string; name: string; code?: string } | string;
  };
  joursPresents: number;
  joursAbsents: number;
  parMotif?: Record<string, number>;
  soldeRestant?: number;
}

interface AllPersonnelMonthViewProps {
  year: number;
  month: number;
  onYearMonthChange: (year: number, month: number) => void;
  records: MonthPersonnelRecord[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  departments: Array<{ _id: string; name: string }>;
  selectedDepartment: string;
  onDepartmentChange: (deptId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
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

export const AllPersonnelMonthView: React.FC<AllPersonnelMonthViewProps> = ({
  year,
  month,
  onYearMonthChange,
  records,
  leaveReasons,
  isLoading,
  departments,
  selectedDepartment,
  onDepartmentChange,
  searchQuery,
  onSearchChange,
}) => {
  const { dir, isRTL } = useDirection();
  const [sortField, setSortField] = useState<'nom' | 'dept' | 'presents' | 'absents'>('nom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handlePrevMonth = () => {
    if (month === 1) onYearMonthChange(year - 1, 12);
    else onYearMonthChange(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) onYearMonthChange(year + 1, 1);
    else onYearMonthChange(year, month + 1);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onYearMonthChange(now.getFullYear(), now.getMonth() + 1);
  };

  const getDepartmentName = useCallback((dept: unknown): string => {
    if (!dept) return '-';
    if (typeof dept === 'object' && 'name' in (dept as Record<string, unknown>)) {
      return String((dept as { name: string }).name);
    }
    const found = departments.find((d) => d._id === String(dept));
    return found?.name || '-';
  }, [departments]);

  const getMotifLabel = (code: string) => {
    const r = leaveReasons.find((reason) => reason.code === code);
    return r?.labelAr || code;
  };

  // Tri des enregistrements
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      if (sortField === 'nom') {
        const nameA = `${a.personnel.nom} ${a.personnel.prenom}`;
        const nameB = `${b.personnel.nom} ${b.personnel.prenom}`;
        return sortOrder === 'asc' ? nameA.localeCompare(nameB, 'ar') : nameB.localeCompare(nameA, 'ar');
      }
      if (sortField === 'dept') {
        const deptA = getDepartmentName(a.personnel.activeDepartment);
        const deptB = getDepartmentName(b.personnel.activeDepartment);
        return sortOrder === 'asc' ? deptA.localeCompare(deptB, 'ar') : deptB.localeCompare(deptA, 'ar');
      }
      if (sortField === 'presents') {
        return sortOrder === 'asc' ? a.joursPresents - b.joursPresents : b.joursPresents - a.joursPresents;
      }
      if (sortField === 'absents') {
        return sortOrder === 'asc' ? a.joursAbsents - b.joursAbsents : b.joursAbsents - a.joursAbsents;
      }
      return 0;
    });
  }, [records, sortField, sortOrder, getDepartmentName]);

  const toggleSort = (field: 'nom' | 'dept' | 'presents' | 'absents') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-4 p-5 text-start" dir={dir}>
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

        {/* Dropdowns Mois & Année */}
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

      {/* Barre de filtres (Département & Recherche) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
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

      {/* Tableau récapitulatif mensuel par employé */}
      {isLoading ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <TableSkeleton rows={6} columns={6} />
        </div>
      ) : sortedRecords.length === 0 ? (
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
                <th
                  onClick={() => toggleSort('nom')}
                  className="sticky start-0 z-30 bg-slate-50 dark:bg-slate-800 py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>الموظف</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('dept')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>القسم / المصلحة</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('presents')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>أيام الحضور</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('absents')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>أيام الغياب</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">تفاصيل أسباب الغياب خلال الشهر</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">نسبة الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {sortedRecords.map((item) => {
                const p = item.personnel;
                const totalRecorded = item.joursPresents + item.joursAbsents;
                const rate =
                  totalRecorded > 0
                    ? Math.round((item.joursPresents / totalRecorded) * 100)
                    : 0;

                return (
                  <tr key={p._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    {/* Employé */}
                    <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2.5 px-3 whitespace-nowrap transition-colors">
                      <div className="flex items-center gap-2.5">
                        <PersonnelAvatar
                          photo={p.photo}
                          nom={p.nom}
                          prenom={p.prenom}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {p.nom} {p.prenom}
                          </div>
                          <div className="text-[13px] text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                            {p.poste || p.cin || '-'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Département */}
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[13px] whitespace-nowrap">
                        {getDepartmentName(p.activeDepartment)}
                      </span>
                    </td>

                    {/* Présents */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 font-mono tabular-nums">
                        {item.joursPresents} يوم
                      </span>
                    </td>

                    {/* Absents */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md border font-mono tabular-nums ${
                          item.joursAbsents > 0
                            ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800'
                            : 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {item.joursAbsents} يوم
                      </span>
                    </td>

                    {/* Détails motifs */}
                    <td className="py-2.5 px-3">
                      {item.parMotif && Object.keys(item.parMotif).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.parMotif).map(([code, count]) => (
                            <span
                              key={code}
                              className="inline-flex items-center gap-1 text-[13px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                            >
                              <span>{getMotifLabel(code)}:</span>
                              <strong className="font-mono tabular-nums">{count}</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 text-[13px]">-</span>
                      )}
                    </td>

                    {/* Taux présence */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              rate >= 80 ? 'bg-emerald-600 dark:bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllPersonnelMonthView;
