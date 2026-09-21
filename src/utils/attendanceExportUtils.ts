import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { formatArabicDateTime, formatArabicDate } from './arabicDateFormatter';
import { processArabicText } from './pdfExportUtils';

// Interface étendue pour les plugins jsPDF
interface ExtendedJsPdf extends jsPDF {
  processArabic?: (text: string) => string;
  autoTable?: (options: UserOptions) => void;
}

// Options d'export demandées
export interface AttendanceExportOptions {
  title?: string;         // Titre principal (ex: "تقرير الحضور اليومي")
  subtitle?: string;      // Sous-titre (ex: date ou période)
  fileName?: string;      // Nom du fichier (sans extension)
  orientation?: 'portrait' | 'landscape';
  companyName?: string;   // Nom administration (optionnel)
  departmentName?: string; // Département filtré (optionnel)
}

// Structure de données du rapport quotidien
export interface DailyReportPersonnel {
  _id: string;
  nom: string;
  prenom: string;
  cin?: string;
  poste?: string;
  photo?: string;
  statut?: string;
  activeDepartment?: { _id: string; name: string; code?: string } | string;
}

export interface DailyReportAttendanceEntry {
  statut: 'present' | 'absent';
  motif?: string | null;
  leaveReasonId?: string | null;
  impacteSolde?: boolean;
  heureArrivee?: string | null;
  detailsMotif?: {
    nomService?: string;
    lieuMission?: string;
    objetMission?: string;
    intituleFormation?: string;
    commentaire?: string;
  };
}

export interface DailyReportData {
  date: string;
  departmentId?: string | null;
  totalCount: number;
  presentsCount: number;
  absentsCount: number;
  nonSaisisCount: number;
  presents: Array<{
    personnel: DailyReportPersonnel;
    attendance?: DailyReportAttendanceEntry;
  }>;
  absents: Array<{
    personnel: DailyReportPersonnel;
    attendance?: DailyReportAttendanceEntry;
  }>;
  nonSaisis: Array<{
    personnel: DailyReportPersonnel;
  }>;
}

// Structure de données du rapport mensuel
export interface MonthlyReportRecord {
  personnel: DailyReportPersonnel;
  joursPresents: number;
  joursAbsents: number;
  parMotif?: Record<string, number>;
}

export interface MonthlyReportData {
  year: number;
  month: number;
  departmentId?: string | null;
  totalPersonnel: number;
  records: MonthlyReportRecord[];
}

// Structure de données du rapport annuel
export interface YearlyReportRecord {
  personnel: DailyReportPersonnel;
  soldeInitial: number;
  joursDeduits: number;
  soldeRestant: number;
  joursPresents: number;
  joursAbsents: number;
  parMotif?: Record<string, number>;
}

export interface YearlyReportData {
  year: number;
  departmentId?: string | null;
  soldeAnnuelDefaut?: number;
  totalPersonnel: number;
  records: YearlyReportRecord[];
}

// Structure simplifiée pour la feuille de présence quotidienne (collectif)
export interface DailyAttendanceAgentItem {
  personnel: DailyReportPersonnel;
  attendance: DailyReportAttendanceEntry | null;
}

// Cache polices en mémoire
let cachedAmiriRegular: string | null = null;
let cachedAmiriBold: string | null = null;

async function loadFontBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font from ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function ensureFontsLoaded(doc: jsPDF): Promise<boolean> {
  try {
    if (!cachedAmiriRegular) {
      cachedAmiriRegular = await loadFontBase64('/fonts/Amiri-Regular.ttf');
    }
    if (!cachedAmiriBold) {
      cachedAmiriBold = await loadFontBase64('/fonts/Amiri-Bold.ttf');
    }

    doc.addFileToVFS('Amiri-Regular.ttf', cachedAmiriRegular);
    doc.addFileToVFS('Amiri-Bold.ttf', cachedAmiriBold);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
    doc.setFont('Amiri', 'normal');
    return true;
  } catch (error) {
    console.warn('Amiri font could not be loaded, using fallback font:', error);
    return false;
  }
}

// Traduction et libellés des motifs d'absence
export function formatMotifLabel(motif?: string | null): string {
  if (!motif) return '-';
  const labels: Record<string, string> = {
    conge_annuel: 'عطلة سنوية (Congé annuel)',
    maladie: 'عطلة مرضية (Maladie)',
    absence_injustifiee: 'غياب غير مبرر (Injustifiée)',
    recuperation: 'استرجاع (Récupération)',
    mission: 'مهمة عمل (Mission)',
    formation: 'تكوين (Formation)',
    maternite: 'عطلة أمومة (Maternité)',
    conge_exceptionnel: 'عطلة استثنائية (Exceptionnel)',
    sans_solde: 'بدون راتب (Sans solde)',
  };
  return labels[motif] || motif;
}

// Extraction du nom de département
function getDeptName(dept: unknown): string {
  if (!dept) return '-';
  if (typeof dept === 'string') return dept;
  if (typeof dept === 'object' && 'name' in dept) {
    return (dept as { name: string }).name || '-';
  }
  return '-';
}

// En-tête simple et neutre
function renderInstitutionalHeader(
  doc: jsPDF,
  activeFont: string,
  options: AttendanceExportOptions,
  defaultTitle: string,
  defaultSubtitle: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const marginX = 14;
  let currentY = 12;

  // Ligne unique en haut : nom du système
  doc.setFont(activeFont, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(113, 128, 150); // #718096
  doc.text(
    processArabicText(doc, 'نظام إدارة المستندات'),
    centerX,
    currentY,
    { align: 'center' }
  );

  // Titre principal centré
  currentY += 7;
  doc.setFont(activeFont, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(26, 32, 44); // #1a202c
  const title = options.title || defaultTitle;
  doc.text(
    processArabicText(doc, title),
    centerX,
    currentY,
    { align: 'center' }
  );

  // Sous-titre centré (période / date)
  currentY += 5.5;
  doc.setFont(activeFont, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(113, 128, 150); // #718096
  const subtitle = options.subtitle || defaultSubtitle;
  doc.text(
    processArabicText(doc, subtitle),
    centerX,
    currentY,
    { align: 'center' }
  );

  // Filtre de département si applicable
  if (options.departmentName && options.departmentName !== 'all') {
    currentY += 5;
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(43, 108, 176); // #2b6cb0
    const deptInfo = `المصلحة / القسم : ${options.departmentName}`;
    doc.text(
      processArabicText(doc, deptInfo),
      centerX,
      currentY,
      { align: 'center' }
    );
  }

  // Ligne de séparation
  currentY += 4;
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.35);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  return currentY + 4;
}

// Bloc de résumé KPI statistique
function renderKPIBanner(
  doc: jsPDF,
  activeFont: string,
  startY: number,
  kpis: Array<{ label: string; value: string | number; color: [number, number, number] }>
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const availableWidth = pageWidth - 2 * marginX;
  const count = kpis.length;
  const gap = 3;
  const cardWidth = (availableWidth - gap * (count - 1)) / count;
  const cardHeight = 12;

  kpis.forEach((kpi, index) => {
    // Calcul RTL pour placer le premier indicateur à droite
    const rtlIndex = count - 1 - index;
    const x = marginX + rtlIndex * (cardWidth + gap);

    // Fond de la boîte
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.25);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Bande de couleur sur le côté droit de la carte
    doc.setFillColor(...kpi.color);
    doc.rect(x + cardWidth - 1.5, startY, 1.5, cardHeight, 'F');

    // Valeur principale
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.color);
    doc.text(
      String(kpi.value),
      x + cardWidth / 2,
      startY + 5,
      { align: 'center' }
    );

    // Libellé de l'indicateur
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 128, 150); // #718096
    doc.text(
      processArabicText(doc, kpi.label),
      x + cardWidth / 2,
      startY + 9.5,
      { align: 'center' }
    );
  });

  return startY + cardHeight + 4;
}

// Pied de page et pagination
function renderFooters(
  doc: jsPDF,
  activeFont: string
): void {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const centerX = pageWidth / 2;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Ligne fine de bas de page
    const footerY = pageHeight - 9;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 2.5, pageWidth - marginX, footerY - 2.5);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 128, 150);

    // À droite : numéro de page
    const pageText = `صفحة ${i} من ${totalPages}`;
    doc.text(
      processArabicText(doc, pageText),
      pageWidth - marginX,
      footerY + 1.5,
      { align: 'right' }
    );

    // Au centre : mention légale / application
    doc.text(
      processArabicText(doc, 'تم الإنشاء بواسطة نظام إدارة المستندات'),
      centerX,
      footerY + 1.5,
      { align: 'center' }
    );

    // À gauche : date et heure d'export
    const dateFooter = formatArabicDateTime(new Date());
    doc.text(
      processArabicText(doc, dateFooter),
      marginX,
      footerY + 1.5,
      { align: 'left' }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXPORT DU RAPPORT QUOTIDIEN (Daily Report)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportDailyReportToPdf(
  data: DailyReportData,
  options: AttendanceExportOptions = {}
): Promise<void> {
  const orientation = options.orientation || 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const fontsLoaded = await ensureFontsLoaded(doc);
  const activeFont = fontsLoaded ? 'Amiri' : 'helvetica';

  const defaultTitle = 'تقرير الحضور اليومي';
  const dateStr = formatArabicDate(data.date);
  const defaultSubtitle = `${dateStr} (${data.date})`;

  let currentY = renderInstitutionalHeader(
    doc,
    activeFont,
    options,
    defaultTitle,
    defaultSubtitle
  );

  // Calcul du taux de présence
  const attendanceRate = data.totalCount > 0
    ? Math.round((data.presentsCount / data.totalCount) * 100)
    : 0;

  // Bannière KPI
  currentY = renderKPIBanner(doc, activeFont, currentY, [
    { label: 'إجمالي المستخدمين', value: data.totalCount, color: [44, 82, 130] },
    { label: 'الحاضرون', value: data.presentsCount, color: [47, 133, 90] },
    { label: 'الغيابات', value: data.absentsCount, color: [197, 48, 48] },
    { label: 'غير مسجلين', value: data.nonSaisisCount, color: [160, 174, 192] },
    { label: 'نسبة الحضور', value: `${attendanceRate}%`, color: [49, 130, 206] },
  ]);

  // Construction de la liste globale des agents
  const allRows: Array<{
    num: number;
    nomPrenom: string;
    cin: string;
    poste: string;
    departement: string;
    statut: string;
    details: string;
  }> = [];

  let idx = 1;

  // Présents
  (data.presents || []).forEach((item) => {
    const p = item.personnel;
    const att = item.attendance;
    const heure = att?.heureArrivee ? `وصول: ${att.heureArrivee}` : 'حاضر';
    allRows.push({
      num: idx++,
      nomPrenom: `${p.nom} ${p.prenom}`,
      cin: p.cin || '-',
      poste: p.poste || '-',
      departement: getDeptName(p.activeDepartment),
      statut: 'حاضر',
      details: heure,
    });
  });

  // Absents
  (data.absents || []).forEach((item) => {
    const p = item.personnel;
    const att = item.attendance;
    const motifStr = att?.motif ? formatMotifLabel(att.motif) : 'غياب';
    allRows.push({
      num: idx++,
      nomPrenom: `${p.nom} ${p.prenom}`,
      cin: p.cin || '-',
      poste: p.poste || '-',
      departement: getDeptName(p.activeDepartment),
      statut: 'غائب',
      details: motifStr,
    });
  });

  // Non saisis
  (data.nonSaisis || []).forEach((item) => {
    const p = item.personnel;
    allRows.push({
      num: idx++,
      nomPrenom: `${p.nom} ${p.prenom}`,
      cin: p.cin || '-',
      poste: p.poste || '-',
      departement: getDeptName(p.activeDepartment),
      statut: 'لم يسجل',
      details: '-',
    });
  });

  // Colonnes en arabe (inversées pour disposition RTL dans jsPDF-autotable)
  const columns = [
    { header: 'الرقم', dataKey: 'num', width: 12, align: 'center' as const },
    { header: 'الاسم واللقب', dataKey: 'nomPrenom', width: 44, align: 'right' as const },
    { header: 'ر.ب.ت (CIN)', dataKey: 'cin', width: 24, align: 'center' as const },
    { header: 'الوظيفة / الرتبة', dataKey: 'poste', width: 34, align: 'right' as const },
    { header: 'المصلحة / القسم', dataKey: 'departement', width: 32, align: 'right' as const },
    { header: 'الحالة', dataKey: 'statut', width: 22, align: 'center' as const },
    { header: 'ملاحظات / السبب', dataKey: 'details', width: 40, align: 'right' as const },
  ];

  const reversedColumns = [...columns].reverse();
  const headRow = reversedColumns.map((col) => processArabicText(doc, col.header));

  const bodyRows = allRows.map((row) =>
    reversedColumns.map((col) => {
      const val = row[col.dataKey as keyof typeof row];
      return processArabicText(doc, val !== undefined && val !== null ? String(val) : '');
    })
  );

  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center'; cellWidth?: number }> = {};
  reversedColumns.forEach((col, i) => {
    columnStyles[i] = {
      halign: col.align || 'right',
      ...(col.width ? { cellWidth: col.width } : {}),
    };
  });

  autoTable(doc, {
    startY: currentY,
    head: [headRow],
    body: bodyRows,
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      textColor: [45, 55, 72],
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [44, 82, 130],
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: 14, right: 14, bottom: 32 },
  });

  renderFooters(doc, activeFont);

  const fileName = options.fileName || `rapport_presence_jour_${data.date}`;
  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

export const exportDailyReportPdf = exportDailyReportToPdf;

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXPORT DU RAPPORT MENSUEL (Monthly Report)
// ─────────────────────────────────────────────────────────────────────────────
const ARABIC_MONTH_NAMES = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export async function exportMonthlyReportToPdf(
  data: MonthlyReportData,
  options: AttendanceExportOptions = {}
): Promise<void> {
  const orientation = options.orientation || 'landscape';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const fontsLoaded = await ensureFontsLoaded(doc);
  const activeFont = fontsLoaded ? 'Amiri' : 'helvetica';

  const monthName = ARABIC_MONTH_NAMES[data.month - 1] || `شهر ${data.month}`;
  const defaultTitle = 'تقرير الحضور الشهري';
  const defaultSubtitle = `${monthName} ${data.year}`;

  let currentY = renderInstitutionalHeader(
    doc,
    activeFont,
    options,
    defaultTitle,
    defaultSubtitle
  );

  // Calcul des statistiques globales du mois
  const totalPresences = data.records.reduce((acc, r) => acc + (r.joursPresents || 0), 0);
  const totalAbsences = data.records.reduce((acc, r) => acc + (r.joursAbsents || 0), 0);
  const grandTotalDays = totalPresences + totalAbsences;
  const globalRate = grandTotalDays > 0 ? Math.round((totalPresences / grandTotalDays) * 100) : 0;

  // Bannière KPI
  currentY = renderKPIBanner(doc, activeFont, currentY, [
    { label: 'إجمالي الموظفين', value: data.totalPersonnel, color: [44, 82, 130] },
    { label: 'مجموع أيام الحضور', value: totalPresences, color: [47, 133, 90] },
    { label: 'مجموع أيام الغياب', value: totalAbsences, color: [197, 48, 48] },
    { label: 'نسبة الحضور الإجمالية', value: `${globalRate}%`, color: [49, 130, 206] },
  ]);

  const rows = data.records.map((r, i) => {
    const p = r.personnel;
    const totalDays = r.joursPresents + r.joursAbsents;
    const rate = totalDays > 0 ? `${Math.round((r.joursPresents / totalDays) * 100)}%` : '-';

    // Synthèse des motifs
    const motifsList: string[] = [];
    if (r.parMotif) {
      Object.entries(r.parMotif).forEach(([motif, count]) => {
        if (count > 0) {
          motifsList.push(`${formatMotifLabel(motif)}: ${count}ي`);
        }
      });
    }
    const motifsSummary = motifsList.length > 0 ? motifsList.join(' | ') : '-';

    return {
      num: i + 1,
      nomPrenom: `${p.nom} ${p.prenom}`,
      cin: p.cin || '-',
      poste: p.poste || '-',
      departement: getDeptName(p.activeDepartment),
      presents: r.joursPresents,
      absents: r.joursAbsents,
      rate,
      motifs: motifsSummary,
    };
  });

  const columns = [
    { header: 'الرقم', dataKey: 'num', width: 12, align: 'center' as const },
    { header: 'الاسم واللقب', dataKey: 'nomPrenom', width: 44, align: 'right' as const },
    { header: 'ر.ب.ت', dataKey: 'cin', width: 22, align: 'center' as const },
    { header: 'الوظيفة / الرتبة', dataKey: 'poste', width: 34, align: 'right' as const },
    { header: 'المصلحة', dataKey: 'departement', width: 32, align: 'right' as const },
    { header: 'أيام الحضور', dataKey: 'presents', width: 20, align: 'center' as const },
    { header: 'أيام الغياب', dataKey: 'absents', width: 20, align: 'center' as const },
    { header: 'النسبة', dataKey: 'rate', width: 18, align: 'center' as const },
    { header: 'تفاصيل الغياب والخصم', dataKey: 'motifs', width: 68, align: 'right' as const },
  ];

  const reversedColumns = [...columns].reverse();
  const headRow = reversedColumns.map((col) => processArabicText(doc, col.header));

  const bodyRows = rows.map((row) =>
    reversedColumns.map((col) => {
      const val = row[col.dataKey as keyof typeof row];
      return processArabicText(doc, val !== undefined && val !== null ? String(val) : '');
    })
  );

  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center'; cellWidth?: number }> = {};
  reversedColumns.forEach((col, i) => {
    columnStyles[i] = {
      halign: col.align || 'right',
      ...(col.width ? { cellWidth: col.width } : {}),
    };
  });

  autoTable(doc, {
    startY: currentY,
    head: [headRow],
    body: bodyRows,
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      textColor: [45, 55, 72],
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [44, 82, 130],
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: 14, right: 14, bottom: 32 },
  });

  renderFooters(doc, activeFont);

  const fileName = options.fileName || `rapport_presence_mensuel_${data.year}_${String(data.month).padStart(2, '0')}`;
  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

export const exportMonthlyReportPdf = exportMonthlyReportToPdf;

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXPORT DU RAPPORT ANNUEL (Yearly Report)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportYearlyReportToPdf(
  data: YearlyReportData,
  options: AttendanceExportOptions = {}
): Promise<void> {
  const orientation = options.orientation || 'landscape';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const fontsLoaded = await ensureFontsLoaded(doc);
  const activeFont = fontsLoaded ? 'Amiri' : 'helvetica';

  const defaultTitle = 'تقرير الحضور السنوي';
  const defaultSubtitle = `${data.year}`;

  let currentY = renderInstitutionalHeader(
    doc,
    activeFont,
    options,
    defaultTitle,
    defaultSubtitle
  );

  // Statistiques annuelles
  const totalDeduits = data.records.reduce((acc, r) => acc + (r.joursDeduits || 0), 0);
  const totalSoldeRestant = data.records.reduce((acc, r) => acc + (r.soldeRestant || 0), 0);
  const avgSolde = data.totalPersonnel > 0 ? (totalSoldeRestant / data.totalPersonnel).toFixed(1) : '0';

  currentY = renderKPIBanner(doc, activeFont, currentY, [
    { label: 'إجمالي الموظفين', value: data.totalPersonnel, color: [44, 82, 130] },
    { label: 'الرصيد الافتراضي', value: `${data.soldeAnnuelDefaut || 45} يوم`, color: [74, 85, 104] },
    { label: 'مجموع الأيام المخصومة', value: totalDeduits, color: [197, 48, 48] },
    { label: 'معدل الرصيد المتبقي', value: `${avgSolde} يوم`, color: [47, 133, 90] },
  ]);

  const rows = data.records.map((r, i) => {
    const p = r.personnel;

    // Synthèse des motifs
    const motifsList: string[] = [];
    if (r.parMotif) {
      Object.entries(r.parMotif).forEach(([motif, count]) => {
        if (count > 0) {
          motifsList.push(`${formatMotifLabel(motif)}: ${count}`);
        }
      });
    }
    const motifsSummary = motifsList.length > 0 ? motifsList.join(' | ') : '-';

    return {
      num: i + 1,
      nomPrenom: `${p.nom} ${p.prenom}`,
      cin: p.cin || '-',
      poste: p.poste || '-',
      departement: getDeptName(p.activeDepartment),
      soldeInitial: r.soldeInitial,
      joursDeduits: r.joursDeduits,
      soldeRestant: r.soldeRestant,
      totalAbsences: r.joursAbsents,
      details: motifsSummary,
    };
  });

  const columns = [
    { header: 'الرقم', dataKey: 'num', width: 12, align: 'center' as const },
    { header: 'الاسم واللقب', dataKey: 'nomPrenom', width: 44, align: 'right' as const },
    { header: 'ر.ب.ت', dataKey: 'cin', width: 22, align: 'center' as const },
    { header: 'الوظيفة', dataKey: 'poste', width: 34, align: 'right' as const },
    { header: 'المصلحة', dataKey: 'departement', width: 30, align: 'right' as const },
    { header: 'الرصيد الأولي', dataKey: 'soldeInitial', width: 20, align: 'center' as const },
    { header: 'الأيام المخصومة', dataKey: 'joursDeduits', width: 22, align: 'center' as const },
    { header: 'الرصيد المتبقي', dataKey: 'soldeRestant', width: 22, align: 'center' as const },
    { header: 'مجموع الغيابات', dataKey: 'totalAbsences', width: 22, align: 'center' as const },
    { header: 'تفاصيل الاستهلاك', dataKey: 'details', width: 42, align: 'right' as const },
  ];

  const reversedColumns = [...columns].reverse();
  const headRow = reversedColumns.map((col) => processArabicText(doc, col.header));

  const bodyRows = rows.map((row) =>
    reversedColumns.map((col) => {
      const val = row[col.dataKey as keyof typeof row];
      return processArabicText(doc, val !== undefined && val !== null ? String(val) : '');
    })
  );

  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center'; cellWidth?: number }> = {};
  reversedColumns.forEach((col, i) => {
    columnStyles[i] = {
      halign: col.align || 'right',
      ...(col.width ? { cellWidth: col.width } : {}),
    };
  });

  autoTable(doc, {
    startY: currentY,
    head: [headRow],
    body: bodyRows,
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      textColor: [45, 55, 72],
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [44, 82, 130],
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: 14, right: 14, bottom: 32 },
  });

  renderFooters(doc, activeFont);

  const fileName = options.fileName || `bilan_presence_annuel_${data.year}`;
  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

export const exportYearlyReportPdf = exportYearlyReportToPdf;

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXPORT DE LA FEUILLE DE PRÉSENCE QUOTIDIENNE (Collectif AttendanceSheet)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportDailyAttendanceSheetToPdf(
  items: DailyAttendanceAgentItem[],
  date: string,
  options: AttendanceExportOptions = {}
): Promise<void> {
  const presents = items.filter((i) => i.attendance?.statut === 'present');
  const absents = items.filter((i) => i.attendance?.statut === 'absent');
  const nonSaisis = items.filter((i) => !i.attendance);

  const adaptedData: DailyReportData = {
    date,
    totalCount: items.length,
    presentsCount: presents.length,
    absentsCount: absents.length,
    nonSaisisCount: nonSaisis.length,
    presents: presents.map((i) => ({ personnel: i.personnel, attendance: i.attendance || undefined })),
    absents: absents.map((i) => ({ personnel: i.personnel, attendance: i.attendance || undefined })),
    nonSaisis: nonSaisis.map((i) => ({ personnel: i.personnel })),
  };

  await exportDailyReportToPdf(adaptedData, options);
}

export const exportDailyAttendanceSheetPdf = exportDailyAttendanceSheetToPdf;
