import {
  AttendanceEntryDetails,
  DailyAttendanceAgentItem,
} from '@/services/attendanceService';
import { exportTableToPdf } from '@/utils/pdfExportUtils';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

export type { DailyAttendanceAgentItem };

export interface AttendanceExportOptions {
  title?: string;
  subtitle?: string;
  departmentName?: string;
  fileName?: string;
  footerText?: string;
}

export interface AttendancePersonnelSummary {
  _id: string;
  nom: string;
  prenom: string;
  cin?: string;
  poste?: string;
  activeDepartment?: { _id: string; name: string; code?: string } | string;
}

export interface DailyReportPersonnelEntry {
  personnel: AttendancePersonnelSummary;
  attendance?: {
    statut: 'present' | 'absent';
    motif?: string | null;
    heureArrivee?: string | null;
    detailsMotif?: AttendanceEntryDetails;
  };
}

export interface DailyReportData {
  date: string;
  departmentId?: string;
  totalCount: number;
  presentsCount: number;
  absentsCount: number;
  nonSaisisCount: number;
  presents: DailyReportPersonnelEntry[];
  absents: DailyReportPersonnelEntry[];
  nonSaisis: Array<{ personnel: AttendancePersonnelSummary }>;
}

export interface MonthlyReportRecord {
  personnel: AttendancePersonnelSummary;
  joursPresents: number;
  joursAbsents: number;
  parMotif?: Record<string, number>;
  soldeRestant?: number;
}

export interface MonthlyReportData {
  year: number;
  month: number;
  departmentId?: string;
  totalPersonnel: number;
  records: MonthlyReportRecord[];
}

export interface YearlyReportRecord {
  personnel: AttendancePersonnelSummary;
  soldeInitial: number;
  joursDeduits: number;
  soldeRestant: number;
  joursPresents: number;
  joursAbsents: number;
  parMotif?: Record<string, number>;
}

export interface YearlyReportData {
  year: number;
  departmentId?: string;
  totalPersonnel: number;
  soldeAnnuelDefaut?: number;
  records: YearlyReportRecord[];
}

function resolveDeptName(dept?: AttendancePersonnelSummary['activeDepartment']): string {
  if (!dept) return '—';
  if (typeof dept === 'string') return dept;
  return dept.name || '—';
}

export async function exportDailyReportToPdf(
  data: DailyReportData,
  options?: AttendanceExportOptions
): Promise<void> {
  const rows: Record<string, unknown>[] = [
    ...(data.presents || []).map((entry) => ({
      fullName: `${entry.personnel.prenom} ${entry.personnel.nom}`.trim(),
      cin: entry.personnel.cin || '—',
      department: resolveDeptName(entry.personnel.activeDepartment),
      status: 'حاضر',
      details: entry.attendance?.heureArrivee || '—',
    })),
    ...(data.absents || []).map((entry) => ({
      fullName: `${entry.personnel.prenom} ${entry.personnel.nom}`.trim(),
      cin: entry.personnel.cin || '—',
      department: resolveDeptName(entry.personnel.activeDepartment),
      status: 'غائب',
      details: entry.attendance?.motif || '—',
    })),
    ...(data.nonSaisis || []).map((entry) => ({
      fullName: `${entry.personnel.prenom} ${entry.personnel.nom}`.trim(),
      cin: entry.personnel.cin || '—',
      department: resolveDeptName(entry.personnel.activeDepartment),
      status: 'غير مسجل',
      details: '—',
    })),
  ];

  const dateLabel = formatArabicDate(data.date);
  const deptSuffix = options?.departmentName ? ` — ${options.departmentName}` : '';

  await exportTableToPdf({
    title: options?.title || `تقرير الحضور اليومي (${dateLabel})`,
    subtitle:
      options?.subtitle ||
      `الإجمالي: ${data.totalCount} | حاضر: ${data.presentsCount} | غائب: ${data.absentsCount} | غير مسجل: ${data.nonSaisisCount}${deptSuffix}`,
    columns: [
      { header: 'الاسم واللقب', dataKey: 'fullName', align: 'right' },
      { header: 'ب.ت.و', dataKey: 'cin', align: 'center', width: 32 },
      { header: 'القسم', dataKey: 'department', align: 'right', width: 45 },
      { header: 'الحالة', dataKey: 'status', align: 'center', width: 28 },
      { header: 'الملاحظات / التوقيت', dataKey: 'details', align: 'center', width: 40 },
    ],
    rows,
    fileName: options?.fileName || `rapport_presence_${data.date}`,
    orientation: 'landscape',
    footerText: options?.footerText || 'نظام متابعة الحضور والموارد البشرية',
    rtl: true,
  });
}

export async function exportMonthlyReportToPdf(
  data: MonthlyReportData,
  options?: AttendanceExportOptions
): Promise<void> {
  const rows: Record<string, unknown>[] = (data.records || []).map((rec) => ({
    fullName: `${rec.personnel.prenom} ${rec.personnel.nom}`.trim(),
    cin: rec.personnel.cin || '—',
    department: resolveDeptName(rec.personnel.activeDepartment),
    presents: rec.joursPresents ?? 0,
    absents: rec.joursAbsents ?? 0,
    soldeRestant: rec.soldeRestant !== undefined ? rec.soldeRestant : '—',
  }));

  const monthStr = String(data.month).padStart(2, '0');
  const deptSuffix = options?.departmentName ? ` — ${options.departmentName}` : '';

  await exportTableToPdf({
    title: options?.title || `تقرير الحضور الشهري (${monthStr}/${data.year})`,
    subtitle:
      options?.subtitle || `العدد الإجمالي للموظفين: ${data.totalPersonnel}${deptSuffix}`,
    columns: [
      { header: 'الاسم واللقب', dataKey: 'fullName', align: 'right' },
      { header: 'ب.ت.و', dataKey: 'cin', align: 'center', width: 32 },
      { header: 'القسم', dataKey: 'department', align: 'right', width: 45 },
      { header: 'أيام الحضور', dataKey: 'presents', align: 'center', width: 28 },
      { header: 'أيام الغياب', dataKey: 'absents', align: 'center', width: 28 },
      { header: 'الرصيد المتبقي', dataKey: 'soldeRestant', align: 'center', width: 30 },
    ],
    rows,
    fileName: options?.fileName || `rapport_presence_mensuel_${data.year}_${monthStr}`,
    orientation: 'landscape',
    footerText: options?.footerText || 'نظام متابعة الحضور والموارد البشرية',
    rtl: true,
  });
}

export async function exportYearlyReportToPdf(
  data: YearlyReportData,
  options?: AttendanceExportOptions
): Promise<void> {
  const rows: Record<string, unknown>[] = (data.records || []).map((rec) => ({
    fullName: `${rec.personnel.prenom} ${rec.personnel.nom}`.trim(),
    cin: rec.personnel.cin || '—',
    department: resolveDeptName(rec.personnel.activeDepartment),
    presents: rec.joursPresents ?? 0,
    absents: rec.joursAbsents ?? 0,
    soldeInitial: rec.soldeInitial ?? 0,
    joursDeduits: rec.joursDeduits ?? 0,
    soldeRestant: rec.soldeRestant ?? 0,
  }));

  const deptSuffix = options?.departmentName ? ` — ${options.departmentName}` : '';

  await exportTableToPdf({
    title: options?.title || `الحصيلة السنوية للحضور (${data.year})`,
    subtitle:
      options?.subtitle || `العدد الإجمالي للموظفين: ${data.totalPersonnel}${deptSuffix}`,
    columns: [
      { header: 'الاسم واللقب', dataKey: 'fullName', align: 'right' },
      { header: 'ب.ت.و', dataKey: 'cin', align: 'center', width: 28 },
      { header: 'القسم', dataKey: 'department', align: 'right', width: 40 },
      { header: 'أيام الحضور', dataKey: 'presents', align: 'center', width: 24 },
      { header: 'أيام الغياب', dataKey: 'absents', align: 'center', width: 24 },
      { header: 'الرصيد الأولي', dataKey: 'soldeInitial', align: 'center', width: 24 },
      { header: 'الأيام المخصومة', dataKey: 'joursDeduits', align: 'center', width: 26 },
      { header: 'الرصيد المتبقي', dataKey: 'soldeRestant', align: 'center', width: 26 },
    ],
    rows,
    fileName: options?.fileName || `bilan_presence_annuel_${data.year}`,
    orientation: 'landscape',
    footerText: options?.footerText || 'نظام متابعة الحضور والموارد البشرية',
    rtl: true,
  });
}

export async function exportDailyAttendanceSheetToPdf(
  items: DailyAttendanceAgentItem[],
  date: string,
  options?: AttendanceExportOptions
): Promise<void> {
  const presents = items
    .filter((item) => item.attendance?.statut === 'present')
    .map((item) => ({
      personnel: item.personnel,
      attendance: {
        statut: 'present' as const,
        motif: item.attendance?.motif,
        heureArrivee: item.attendance?.heureArrivee,
        detailsMotif: item.attendance?.detailsMotif,
      },
    }));

  const absents = items
    .filter((item) => item.attendance?.statut === 'absent')
    .map((item) => ({
      personnel: item.personnel,
      attendance: {
        statut: 'absent' as const,
        motif: item.attendance?.motif,
        heureArrivee: item.attendance?.heureArrivee,
        detailsMotif: item.attendance?.detailsMotif,
      },
    }));

  const nonSaisis = items
    .filter((item) => !item.attendance)
    .map((item) => ({ personnel: item.personnel }));

  await exportDailyReportToPdf(
    {
      date,
      totalCount: items.length,
      presentsCount: presents.length,
      absentsCount: absents.length,
      nonSaisisCount: nonSaisis.length,
      presents,
      absents,
      nonSaisis,
    },
    options
  );
}
