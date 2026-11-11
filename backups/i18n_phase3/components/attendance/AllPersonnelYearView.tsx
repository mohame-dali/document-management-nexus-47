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
    return [...records].sort((a, b) => {
      if (sortField === 'nom') {
        const nameA = `${a.personnel.nom} ${a.personnel.prenom}`;
        const nameB = `${b.personnel.nom} ${b.personnel.prenom}`;
        return sortOrder === 'asc' ? nameA.localeCompare(nameB, 'ar') : nameB.localeCompare(nameA, 'ar');
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
  }, [records, sortField, sortOrder]);

  const toggleSort = (field: 'nom' | 'taux' | 'restant' | 'deduits') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded shadow-none space-y-4 p-5" dir="rtl">
      {/* Contrôles Année */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevYear}
            className="h-11 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="السنة السابقة"
          >
            <ChevronRight className="h-4 w-4" />
            <span>السنة السابقة</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentYear}
            className="h-11 px-3 border-[#e2e8f0] rounded text-gray-700 hover:bg-gray-50 text-xs font-semibold"
          >
            السنة الحالية
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextYear}
            className="h-11 px-3 border-[#e2e8f0] rounded text-[#2c5282] hover:bg-gray-50 flex items-center gap-1 text-xs"
            title="السنة الموالية"
          >
            <span>السنة الموالية</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#2c5282]" />
          <span className="text-xs text-gray-500">السنة المالية / الإدارية:</span>
          <Select
            value={String(year)}
            onValueChange={(val) => onYearChange(parseInt(val, 10))}
          >
            <SelectTrigger className="h-9 w-28 border-[#e2e8f0] rounded text-xs bg-white font-mono font-bold text-[#2c5282]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs font-mono">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Barre de filtres (Département & Recherche) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#f7fafc] p-3 rounded border border-[#e2e8f0]">
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

      {/* Tableau récapitulatif annuel par employé */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">جاري تحميل التقرير السنوي والأرصدة...</p>
        </div>
      ) : sortedRecords.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#f7fafc] rounded border border-dashed border-[#cbd5e0]">
          <Users className="h-8 w-8 text-gray-400 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">لا يوجد موظفون مطابقون لمعايير البحث</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#e2e8f0] rounded">
          <table className="w-full text-right text-xs divide-y divide-[#e2e8f0]">
            <thead className="bg-[#f7fafc] text-[#4a5568] font-bold">
              <tr>
                <th
                  onClick={() => toggleSort('nom')}
                  className="py-3 px-3 cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    <span>الموظف</span>
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-3">القسم / المصلحة</th>
                <th className="py-3 px-3 text-center">الرصيد الأولي</th>
                <th
                  onClick={() => toggleSort('deduits')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>المستهلك (خصم)</span>
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('restant')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>الرصيد المتبقي</span>
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">أيام الحضور الفعلية</th>
                <th
                  onClick={() => toggleSort('taux')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>نسبة الانضباط والحضور</span>
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f7] bg-white">
              {sortedRecords.map((item) => {
                const p = item.personnel;
                const taux = getTauxPresence(item);

                return (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    {/* Employé */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <PersonnelAvatar
                          photo={p.photo}
                          nom={p.nom}
                          prenom={p.prenom}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold text-[#1a202c]">
                            {p.nom} {p.prenom}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {p.poste || p.cin || '-'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Département */}
                    <td className="py-2.5 px-3 text-gray-600">
                      {getDepartmentName(p.activeDepartment)}
                    </td>

                    {/* Solde initial */}
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700">
                      {item.soldeInitial} يوماً
                    </td>

                    {/* Jours déduits */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                        {item.joursDeduits} يوماً
                      </span>
                    </td>

                    {/* Solde restant */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`font-bold px-2 py-0.5 rounded border font-mono ${
                          item.soldeRestant > 10
                            ? 'text-blue-700 bg-blue-50 border-blue-200'
                            : item.soldeRestant > 0
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-red-700 bg-red-50 border-red-200'
                        }`}
                      >
                        {item.soldeRestant} يوماً
                      </span>
                    </td>

                    {/* Jours présents */}
                    <td className="py-2.5 px-3 text-center font-mono text-green-700 font-semibold">
                      {item.joursPresents} يوم
                    </td>

                    {/* Taux présence */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              taux >= 85 ? 'bg-green-600' : taux >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${taux}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-gray-800">
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
