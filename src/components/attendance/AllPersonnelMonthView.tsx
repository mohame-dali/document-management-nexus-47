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

  const getDepartmentName = (dept: unknown): string => {
    if (!dept) return '-';
    if (typeof dept === 'object' && 'name' in (dept as Record<string, unknown>)) {
      return String((dept as { name: string }).name);
    }
    const found = departments.find((d) => d._id === String(dept));
    return found?.name || '-';
  };

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
  }, [records, sortField, sortOrder]);

  const toggleSort = (field: 'nom' | 'dept' | 'presents' | 'absents') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded shadow-none space-y-4 p-5" dir="rtl">
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

        {/* Dropdowns Mois & Année */}
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

      {/* Tableau récapitulatif mensuel par employé */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <div className="h-6 w-6 border-2 border-[#2c5282] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">جاري تحميل التقرير الشهري...</p>
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
                <th
                  onClick={() => toggleSort('dept')}
                  className="py-3 px-3 cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-1">
                    <span>القسم / المصلحة</span>
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('presents')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>أيام الحضور</span>
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('absents')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>أيام الغياب</span>
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-3">تفاصيل أسباب الغياب خلال الشهر</th>
                <th className="py-3 px-3 text-center">نسبة الحضور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2f7] bg-white">
              {sortedRecords.map((item) => {
                const p = item.personnel;
                const totalRecorded = item.joursPresents + item.joursAbsents;
                const rate =
                  totalRecorded > 0
                    ? Math.round((item.joursPresents / totalRecorded) * 100)
                    : 0;

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

                    {/* Présents */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-mono">
                        {item.joursPresents} يوم
                      </span>
                    </td>

                    {/* Absents */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`font-bold px-2 py-0.5 rounded border font-mono ${
                          item.joursAbsents > 0
                            ? 'text-red-700 bg-red-50 border-red-200'
                            : 'text-gray-500 bg-gray-50 border-gray-200'
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
                              className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200"
                            >
                              <span>{getMotifLabel(code)}:</span>
                              <strong className="font-mono">{count}</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Taux présence */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              rate >= 80 ? 'bg-green-600' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold">{rate}%</span>
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
