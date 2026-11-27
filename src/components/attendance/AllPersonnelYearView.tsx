import React, { useState, useMemo } from 'react';
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
  ArrowUpDown,
  Users,
} from 'lucide-react';
import { LeaveReason } from '@/services/leaveReasonService';
import { PersonnelAvatar } from '@/components/hr/PersonnelAvatar';
import { useDirection } from '@/i18n/useDirection';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

export interface YearPersonnelRecord {
  personnel: {
    _id: string;
    nom: string;
    prenom: string;
    cin?: string;
    poste?: string;
    photo?: string;
    activeDepartment?: { _id: string; name: string; code?: string } | string;
  };
  soldeInitial: number;
  joursDeduits: number;
  soldeRestant: number;
  joursPresents: number;
  joursAbsents: number;
  parMotif?: Record<string, number>;
}

interface AllPersonnelYearViewProps {
  year: number;
  onYearChange: (year: number) => void;
  records: YearPersonnelRecord[];
  leaveReasons: LeaveReason[];
  isLoading: boolean;
  departments: Array<{ _id: string; name: string }>;
  selectedDepartment: string;
  onDepartmentChange: (deptId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const AllPersonnelYearView: React.FC<AllPersonnelYearViewProps> = ({
  year,
  onYearChange,
  records,
  isLoading,
  departments,
  selectedDepartment,
  onDepartmentChange,
  searchQuery,
  onSearchChange,
}) => {
  const { dir, isRTL } = useDirection();
  const [sortField, setSortField] = useState<'nom' | 'taux' | 'restant' | 'deduits'>('taux');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handlePrevYear = () => onYearChange(year - 1);
  const handleNextYear = () => onYearChange(year + 1);
  const handleCurrentYear = () => onYearChange(new Date().getFullYear());

  const getDepartmentName = (dept: unknown): string => {
    if (!dept) return '-';
    if (typeof dept === 'object' && 'name' in (dept as Record<string, unknown>)) {
      return String((dept as { name: string }).name);
    }
    const found = departments.find((d) => d._id === String(dept));
    return found?.name || '-';
  };

  const getTauxPresence = (item: YearPersonnelRecord) => {
    const total = item.joursPresents + item.joursAbsents;
    if (total === 0) return 0;
    return Math.round((item.joursPresents / total) * 100);
  };

  const sortedRecords = useMemo(() => {
    const locale = isRTL ? 'ar' : 'fr';
    return [...records].sort((a, b) => {
      if (sortField === 'nom') {
        const nameA = `${a.personnel.nom} ${a.personnel.prenom}`;
        const nameB = `${b.personnel.nom} ${b.personnel.prenom}`;
        return sortOrder === 'asc'
          ? nameA.localeCompare(nameB, locale)
          : nameB.localeCompare(nameA, locale);
      }
      if (sortField === 'taux') {
        const tA = getTauxPresence(a);
        const tB = getTauxPresence(b);
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }
      if (sortField === 'restant') {
        return sortOrder === 'asc' ? a.soldeRestant - b.soldeRestant : b.soldeRestant - a.soldeRestant;
      }
      if (sortField === 'deduits') {
        return sortOrder === 'asc' ? a.joursDeduits - b.joursDeduits : b.joursDeduits - a.joursDeduits;
      }
      return 0;
    });
  }, [records, sortField, sortOrder, isRTL]);

  const toggleSort = (field: 'nom' | 'taux' | 'restant' | 'deduits') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs space-y-3.5 p-4 text-start" dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevYear}
            className="h-9 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <span>{isRTL ? 'السنة السابقة' : 'Année précédente'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentYear}
            className="h-9 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            {isRTL ? 'السنة الحالية' : 'Année en cours'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextYear}
            className="h-9 px-3 border-slate-200 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-xs"
          >
            <span>{isRTL ? 'السنة الموالية' : 'Année suivante'}</span>
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
          <span className="text-xs text-slate-700 dark:text-slate-300">
            {isRTL ? 'السنة المالية / الإدارية:' : 'Exercice :'}
          </span>
          <Select value={String(year)} onValueChange={(val) => onYearChange(parseInt(val, 10))}>
            <SelectTrigger className="h-9 w-28 border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 font-mono tabular-nums font-bold text-[#2c5282] dark:text-blue-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir={dir}>
              {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs font-mono tabular-nums">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
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
      </div>

      {isLoading ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <TableSkeleton rows={6} columns={7} />
        </div>
      ) : sortedRecords.length === 0 ? (
        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-700 dark:text-slate-300" />}
            title={isRTL ? 'لا يوجد موظفون مطابقون لمعايير البحث' : 'Aucun employé correspondant'}
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
                    <span>{isRTL ? 'الموظف' : 'Employé'}</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">{isRTL ? 'القسم / المصلحة' : 'Département'}</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">{isRTL ? 'الرصيد الأولي' : 'Solde initial'}</th>
                <th
                  onClick={() => toggleSort('deduits')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{isRTL ? 'المستهلك (خصم)' : 'Déduit'}</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('restant')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{isRTL ? 'الرصيد المتبقي' : 'Solde restant'}</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">
                  {isRTL ? 'أيام الحضور الفعلية' : 'Jours présents'}
                </th>
                <th
                  onClick={() => toggleSort('taux')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{isRTL ? 'نسبة الانضباط والحضور' : 'Assiduité'}</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {sortedRecords.map((item) => {
                const p = item.personnel;
                const taux = getTauxPresence(item);

                return (
                  <tr key={p._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    <td className="sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-2.5 px-3 whitespace-nowrap transition-colors">
                      <div className="flex items-center gap-2.5">
                        <PersonnelAvatar photo={p.photo} nom={p.nom} prenom={p.prenom} size="sm" />
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

                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[13px] whitespace-nowrap">
                        {getDepartmentName(p.activeDepartment)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.soldeInitial} {isRTL ? 'يوماً' : 'j'}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 font-mono tabular-nums">
                        {item.joursDeduits} {isRTL ? 'يوماً' : 'j'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md border font-mono tabular-nums ${
                          item.soldeRestant > 10
                            ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
                            : item.soldeRestant > 0
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
                            : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800'
                        }`}
                      >
                        {item.soldeRestant} {isRTL ? 'يوماً' : 'j'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">
                      {item.joursPresents} {isRTL ? 'يوم' : 'j'}
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              taux >= 85 ? 'bg-emerald-600 dark:bg-emerald-500' : taux >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${taux}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
                          {taux}%
                        </span>
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

export default AllPersonnelYearView;
