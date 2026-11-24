import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import './PrintableAttendanceSheet.css';

export interface MonthlyDayEntry {
  statut: 'present' | 'absent';
  motif: string | null;
  motifLabelAr: string | null;
  motifLabelFr: string | null;
  category: string | null;
  impacteSolde: boolean;
  heureArrivee: string | null;
  symbol: string;
}

export interface MonthlyPersonnelSheetRecord {
  personnel: {
    _id: string;
    nom: string;
    prenom: string;
    cin?: string;
    poste?: string;
    posteActuel?: string;
    numeroUnite?: string;
    numeroArmee?: string;
    statut?: string;
    activeDepartment?: { _id: string; name: string } | string | null;
  };
  days: Record<string, MonthlyDayEntry>;
  byMotif: Record<string, number>;
  totals: {
    present: number;
    absent: number;
    conge: number;
    missionFormation: number;
    absenceInjustifiee: number;
    otherAbsence: number;
    deductible: number;
    nonRecorded: number;
  };
}

export interface MonthlyLeaveReasonLegend {
  code: string;
  labelAr: string;
  labelFr?: string;
  category: string;
  impacteSolde: boolean;
  color?: string;
  symbol: string;
}

export interface MonthlyAttendanceSheetData {
  year: number;
  month: number;
  daysInMonth: number;
  department: { _id: string; name: string } | null;
  organization: {
    nomAdministration: string;
    logoAdministration: string;
  };
  weekendDays: number[];
  holidays: Array<{ date: string | null; libelle: string }>;
  leaveReasons: MonthlyLeaveReasonLegend[];
  totalPersonnel: number;
  records: MonthlyPersonnelSheetRecord[];
}

interface PrintableAttendanceSheetProps {
  reportData: MonthlyAttendanceSheetData;
  language?: string;
}

const ARABIC_MONTH_NAMES: Record<number, string> = {
  1: 'جانفي',
  2: 'فيفري',
  3: 'مارس',
  4: 'أفريل',
  5: 'ماي',
  6: 'جوان',
  7: 'جويلية',
  8: 'أوت',
  9: 'سبتمبر',
  10: 'أكتوبر',
  11: 'نوفمبر',
  12: 'ديسمبر',
};

const FRENCH_MONTH_NAMES: Record<number, string> = {
  1: 'Janvier',
  2: 'Février',
  3: 'Mars',
  4: 'Avril',
  5: 'Mai',
  6: 'Juin',
  7: 'Juillet',
  8: 'Août',
  9: 'Septembre',
  10: 'Octobre',
  11: 'Novembre',
  12: 'Décembre',
};

const ARABIC_DAY_INITIALS = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];

const DEFAULT_SYMBOL_LEGEND: Array<{ symbol: string; labelAr: string }> = [
  { symbol: 'ح', labelAr: 'حاضر' },
  { symbol: 'ع.س', labelAr: 'عطلة سنوية' },
  { symbol: 'م', labelAr: 'عطلة مرضية' },
  { symbol: 'ع.إ', labelAr: 'عطلة استثنائية' },
  { symbol: 'إس', labelAr: 'إسترجاع' },
  { symbol: 'م.ع', labelAr: 'مهمة عمل' },
  { symbol: 'ت', labelAr: 'تكوين' },
  { symbol: 'خ', labelAr: 'تكليف بخدمة' },
  { symbol: 'غ', labelAr: 'غياب غير مبرر' },
];

export const PrintableAttendanceSheet: React.FC<PrintableAttendanceSheetProps> = ({
  reportData,
  language = 'ar',
}) => {
  const {
    year,
    month,
    daysInMonth,
    department,
    organization,
    weekendDays = [0, 6],
    holidays = [],
    leaveReasons = [],
    totalPersonnel,
    records,
  } = reportData;

  const daysArray = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const holidaySet = useMemo(() => {
    const set = new Set<number>();
    holidays.forEach((h) => {
      if (!h.date) return;
      const d = new Date(h.date);
      if (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month) {
        set.add(d.getUTCDate());
      }
    });
    return set;
  }, [holidays, year, month]);

  const logoUrl = useMemo(() => {
    if (!organization?.logoAdministration) return null;
    const raw = organization.logoAdministration;
    if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const baseOrigin = apiUrl.replace(/\/api\/?$/, '');
    const cleanPath = raw.startsWith('/') ? raw : `/${raw}`;
    return `${baseOrigin}${cleanPath}`;
  }, [organization?.logoAdministration]);

  const legendItems = useMemo(() => {
    const items: Array<{ symbol: string; labelAr: string }> = [{ symbol: 'ح', labelAr: 'حاضر' }];
    const seen = new Set<string>(['ح']);

    if (leaveReasons.length > 0) {
      leaveReasons.forEach((lr) => {
        if (!seen.has(lr.symbol)) {
          seen.add(lr.symbol);
          items.push({ symbol: lr.symbol, labelAr: lr.labelAr });
        }
      });
    } else {
      DEFAULT_SYMBOL_LEGEND.forEach((item) => {
        if (!seen.has(item.symbol)) {
          seen.add(item.symbol);
          items.push(item);
        }
      });
    }

    return items;
  }, [leaveReasons]);

  const monthNameAr = ARABIC_MONTH_NAMES[month] || String(month);
  const monthNameFr = FRENCH_MONTH_NAMES[month] || String(month);
  const printedDateStr = useMemo(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${yyyy}/${mm}/${dd}`;
  }, []);

  const getCellStyle = (entry: MonthlyDayEntry | undefined, isOutOfMonth: boolean, isNonWorking: boolean) => {
    if (isOutOfMonth) {
      return 'bg-slate-200 text-slate-400';
    }
    if (!entry) {
      return isNonWorking ? 'bg-slate-100 text-slate-400' : 'bg-white';
    }
    if (entry.statut === 'present') {
      return 'bg-emerald-50/70 text-emerald-900 font-bold';
    }
    if (entry.motif === 'absence_injustifiee') {
      return 'bg-red-100 text-red-900 font-bold';
    }
    if (entry.category === 'conge' || entry.motif?.startsWith('conge_') || entry.motif === 'recuperation') {
      return 'bg-amber-50 text-amber-900 font-semibold';
    }
    if (['mission', 'formation', 'service'].includes(entry.motif || '') || ['mission', 'formation', 'service'].includes(entry.category || '')) {
      return 'bg-sky-50 text-sky-900 font-semibold';
    }
    return 'bg-orange-50 text-orange-900 font-semibold';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Barre d'actions écran uniquement (masquée à l'impression) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e2e8f0] rounded p-4">
        <div className="text-sm text-[#4a5568]">
          <span className="font-bold text-[#1a202c]">
            {monthNameAr} {year}
          </span>
          <span className="mx-2 text-slate-300">|</span>
          <span>
            {department?.name || (language === 'ar' ? 'جميع الأقسام والمصالح' : 'Tous les départements')}
          </span>
          <span className="mx-2 text-slate-300">|</span>
          <span>
            {language === 'ar' ? `عدد الأعوان: ${totalPersonnel}` : `Total agents : ${totalPersonnel}`}
          </span>
        </div>

        <Button
          type="button"
          onClick={handlePrint}
          className="bg-[#2c5282] hover:bg-[#1e3a5f] text-white rounded font-medium gap-2 h-10 px-5"
        >
          <Printer className="h-4 w-4" />
          <span>{language === 'ar' ? 'طباعة / PDF' : 'Imprimer / PDF'}</span>
        </Button>
      </div>

      {/* Feuille officielle imprimable (RTL, A4 Paysage, 31 colonnes) */}
      <div
        dir="rtl"
        className="printable-attendance-sheet bg-white border border-[#cbd5e1] rounded p-4 sm:p-6 text-[#0f172a] shadow-none"
      >
        {/* En-tête administratif type modèle papier */}
        <div className="grid grid-cols-3 items-start gap-4 border-b-2 border-[#0f172a] pb-3 mb-3">
          {/* Droite : Administration et Département */}
          <div className="text-right space-y-1 text-xs leading-relaxed">
            <p className="font-bold text-sm text-[#0f172a]">
              {organization?.nomAdministration || 'الإدارة العامة للمؤسسة'}
            </p>
            <p className="font-semibold text-[#1e293b]">
              القسم / المصلحة :{' '}
              <span className="underline decoration-dotted underline-offset-4">
                {department?.name || 'جميع الأقسام والمصالح'}
              </span>
            </p>
            <p className="text-[11px] text-[#475569]">
              المرجع : كشف المواظبة الشهري ({monthNameFr} {year})
            </p>
          </div>

          {/* Centre : Titre officiel */}
          <div className="text-center space-y-1">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={organization?.nomAdministration || 'Logo'}
                className="h-10 mx-auto object-contain mb-1"
              />
            )}
            <h2 className="text-base sm:text-lg font-extrabold text-[#0f172a] tracking-normal">
              بطاقة الحضور والغياب الشهرية
            </h2>
            <p className="text-xs sm:text-sm font-bold text-[#1e3a5f]">
              لشهر : {monthNameAr} {year}
            </p>
          </div>

          {/* Gauche : Informations récapitulatives */}
          <div className="text-left text-xs space-y-1">
            <div className="inline-block text-right border border-[#334155] rounded-sm px-3 py-1.5 bg-slate-50/70">
              <p>
                <span className="font-semibold">السنة :</span>{' '}
                <span className="font-mono font-bold">{year}</span>
              </p>
              <p>
                <span className="font-semibold">الشهر :</span>{' '}
                <span className="font-mono font-bold">{String(month).padStart(2, '0')}</span>
              </p>
              <p>
                <span className="font-semibold">عدد الأعوان :</span>{' '}
                <span className="font-mono font-bold">{totalPersonnel}</span>
              </p>
              <p className="text-[10px] text-[#475569]">
                تاريخ الطباعة : <span className="font-mono">{printedDateStr}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tableau 31 colonnes + identité + totaux + observations */}
        <div className="printable-attendance-scroll overflow-x-auto">
          <table className="printable-attendance-table text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-[#0f172a] font-bold">
                <th rowSpan={2} className="w-[26px] py-1 px-0.5 text-[10px]">
                  ر.ت
                </th>
                <th rowSpan={2} className="w-[140px] py-1 px-2 text-right text-[11px]">
                  الاسم واللقب
                  <div className="text-[9px] font-normal text-slate-600">الخطة / ب.ت.و</div>
                </th>
                <th colSpan={31} className="py-1 text-[11px] bg-slate-200/70">
                  أيام الشهر (من 01 إلى 31)
                </th>
                <th colSpan={4} className="py-1 text-[10px] bg-slate-200/70">
                  المجاميع
                </th>
                <th rowSpan={2} className="w-[74px] py-1 px-1 text-[10px]">
                  ملاحظات
                </th>
              </tr>
              <tr className="bg-slate-50 text-[#0f172a] font-bold">
                {daysArray.map((day) => {
                  const isOutOfMonth = day > daysInMonth;
                  const dateObj = !isOutOfMonth
                    ? new Date(Date.UTC(year, month - 1, day))
                    : null;
                  const dayOfWeek = dateObj ? dateObj.getUTCDay() : -1;
                  const isWeekend = dateObj ? weekendDays.includes(dayOfWeek) : false;
                  const isHoliday = holidaySet.has(day);

                  return (
                    <th
                      key={day}
                      className={`w-[22px] py-1 px-0 text-[9px] leading-tight ${
                        isOutOfMonth
                          ? 'bg-slate-200 text-slate-400'
                          : isHoliday
                          ? 'bg-amber-100/80 text-amber-900'
                          : isWeekend
                          ? 'bg-slate-200/60 text-slate-700'
                          : ''
                      }`}
                    >
                      <div className="font-mono font-bold">{day}</div>
                      {dateObj && (
                        <div className="text-[7px] font-normal text-slate-500">
                          {ARABIC_DAY_INITIALS[dayOfWeek]}
                        </div>
                      )}
                    </th>
                  );
                })}
                <th className="w-[28px] py-1 px-0.5 text-[9px] bg-emerald-50/70" title="أيام الحضور">
                  حضور
                </th>
                <th className="w-[26px] py-1 px-0.5 text-[9px] bg-amber-50/70" title="أيام العطل">
                  عطل
                </th>
                <th className="w-[28px] py-1 px-0.5 text-[9px] bg-sky-50/70" title="مهمة / تكوين / خدمة">
                  م/ت
                </th>
                <th className="w-[28px] py-1 px-0.5 text-[9px] bg-red-50/70" title="الغيابات">
                  غياب
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={38} className="py-8 text-center text-sm text-slate-500">
                    لا يوجد أعوان مسجلون في هذا القسم خلال هذه الفترة
                  </td>
                </tr>
              ) : (
                records.map((item, idx) => {
                  const p = item.personnel;
                  const subtitle = p.posteActuel || p.poste || p.cin || '';
                  const absencesCount = item.totals.absenceInjustifiee + item.totals.otherAbsence;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/60">
                      <td className="py-1 px-0.5 font-mono text-[10px] font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-1.5 text-right leading-tight">
                        <div className="font-bold text-[10px] text-[#0f172a] truncate">
                          {p.nom} {p.prenom}
                        </div>
                        {subtitle && (
                          <div className="text-[8px] text-slate-500 truncate">{subtitle}</div>
                        )}
                      </td>

                      {daysArray.map((day) => {
                        const isOutOfMonth = day > daysInMonth;
                        const entry = item.days?.[String(day)];
                        const dateObj = !isOutOfMonth
                          ? new Date(Date.UTC(year, month - 1, day))
                          : null;
                        const isWeekend = dateObj
                          ? weekendDays.includes(dateObj.getUTCDay())
                          : false;
                        const isHoliday = holidaySet.has(day);
                        const isNonWorking = isWeekend || isHoliday;

                        const tooltip = entry
                          ? `${entry.statut === 'present' ? 'حاضر (Présent)' : entry.motifLabelAr || entry.motif || 'غائب'}${
                              entry.heureArrivee ? ` - ${entry.heureArrivee}` : ''
                            }`
                          : undefined;

                        return (
                          <td
                            key={day}
                            title={tooltip}
                            className={`py-1 px-0 text-[9px] leading-none ${getCellStyle(
                              entry,
                              isOutOfMonth,
                              isNonWorking
                            )}`}
                          >
                            {isOutOfMonth ? '—' : entry ? entry.symbol : ''}
                          </td>
                        );
                      })}

                      <td className="py-1 px-0.5 font-mono font-bold text-[10px] text-emerald-900 bg-emerald-50/40">
                        {item.totals.present}
                      </td>
                      <td className="py-1 px-0.5 font-mono font-bold text-[10px] text-amber-900 bg-amber-50/40">
                        {item.totals.conge}
                      </td>
                      <td className="py-1 px-0.5 font-mono font-bold text-[10px] text-sky-900 bg-sky-50/40">
                        {item.totals.missionFormation}
                      </td>
                      <td className="py-1 px-0.5 font-mono font-bold text-[10px] text-red-900 bg-red-50/40">
                        {absencesCount}
                      </td>
                      <td className="py-1 px-1 text-[9px] text-slate-700">
                        {item.totals.deductible > 0
                          ? `خصم: ${item.totals.deductible} ي`
                          : ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Légende des symboles + Zone signatures officielle */}
        <div className="mt-4 pt-3 border-t border-[#cbd5e1] space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[#1e293b]">
            <span className="font-bold">دليل الرموز :</span>
            {legendItems.map((item) => (
              <span key={`${item.symbol}-${item.labelAr}`} className="inline-flex items-center gap-1">
                <strong className="px-1 border border-slate-300 rounded-sm bg-slate-50 font-bold">
                  {item.symbol}
                </strong>
                <span>: {item.labelAr}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <strong className="px-1 border border-slate-300 rounded-sm bg-slate-200 text-slate-500">
                —
              </strong>
              <span>: خارج أيام الشهر</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-2 pb-6 text-xs text-center font-bold text-[#0f172a]">
            <div>
              <p className="mb-10">رئيس القسم / المصلحة</p>
              <p className="text-[10px] font-normal text-slate-500">الإمضاء والختم</p>
            </div>
            <div>
              <p className="mb-10">مصلحة الموارد البشرية</p>
              <p className="text-[10px] font-normal text-slate-500">المراجعة والتأشير</p>
            </div>
            <div>
              <p className="mb-10">مصادقة المدير / الإدارة</p>
              <p className="text-[10px] font-normal text-slate-500">الختم والإمضاء</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableAttendanceSheet;
