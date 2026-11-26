import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatShortDate } from './formatDate';

export interface PdfExportColumn {
  header: string;
  dataKey: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
}

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  columns: PdfExportColumn[];
  rows: Record<string, unknown>[];
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  footerText?: string;
  rtl?: boolean;
}

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

let cachedAmiriRegular: string | null = null;
let cachedAmiriBold: string | null = null;

async function loadFontBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font from ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function ensureAmiriFontsLoaded(doc: jsPDF): Promise<boolean> {
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
    console.warn('Could not load Amiri fonts for PDF export:', error);
    return false;
  }
}

/**
 * Shapes Arabic text via jsPDF's built-in Arabic processor when available.
 */
export function processArabicText(doc: jsPDF, text: string | number | null | undefined): string {
  if (text === null || text === undefined) {
    return '';
  }
  const str = String(text);
  if (!str) {
    return '';
  }

  try {
    if (ARABIC_CHAR_REGEX.test(str) && typeof doc.processArabic === 'function') {
      return doc.processArabic(str);
    }
  } catch (error) {
    console.warn('Arabic text processing fallback:', error);
  }
  return str;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return String(obj.name || obj.nom || obj.title || obj._id || JSON.stringify(value));
  }
  return String(value);
}

/**
 * Exports tabular data to a formatted A4 PDF with Arabic RTL & Amiri font support.
 */
export async function exportTableToPdf(options: PdfExportOptions): Promise<void> {
  const {
    title,
    subtitle,
    columns,
    rows,
    fileName,
    orientation = 'landscape',
    footerText = '',
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const fontsLoaded = await ensureAmiriFontsLoaded(doc);
  const activeFont = fontsLoaded ? 'Amiri' : 'helvetica';

  const sampleText = [title, subtitle, ...columns.map((c) => c.header)].filter(Boolean).join(' ');
  const isRtl = options.rtl ?? ARABIC_CHAR_REGEX.test(sampleText);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // Header title
  doc.setFont(activeFont, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); // #1e3a8a
  doc.text(
    processArabicText(doc, title),
    isRtl ? pageWidth - marginX : marginX,
    16,
    { align: isRtl ? 'right' : 'left' }
  );

  let startY = 23;
  if (subtitle) {
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      processArabicText(doc, subtitle),
      isRtl ? pageWidth - marginX : marginX,
      startY,
      { align: isRtl ? 'right' : 'left' }
    );
    startY += 6;
  }

  // Export timestamp on opposite side
  const exportDateStr = formatShortDate(new Date());
  doc.setFont(activeFont, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    processArabicText(doc, exportDateStr),
    isRtl ? marginX : pageWidth - marginX,
    16,
    { align: isRtl ? 'left' : 'right' }
  );

  // Order columns visually: reverse for RTL so first column appears on the right
  const orderedColumns = isRtl ? [...columns].reverse() : columns;

  const headRow = orderedColumns.map((col) => processArabicText(doc, col.header));
  const bodyRows = rows.map((row) =>
    orderedColumns.map((col) => processArabicText(doc, formatCellValue(row[col.dataKey])))
  );

  const columnStyles: Record<
    number,
    { halign?: 'left' | 'center' | 'right'; cellWidth?: number }
  > = {};
  orderedColumns.forEach((col, idx) => {
    columnStyles[idx] = {
      halign: col.align || (isRtl ? 'right' : 'left'),
      ...(col.width ? { cellWidth: col.width } : {}),
    };
  });

  autoTable(doc, {
    startY: startY + 2,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: activeFont,
      fontSize: 9,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      halign: isRtl ? 'right' : 'left',
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fontSize: 9.5,
      fillColor: [44, 82, 130], // #2c5282
      textColor: [255, 255, 255],
      halign: isRtl ? 'right' : 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    margin: { left: marginX, right: marginX, bottom: 18 },
  });

  // Page footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);

    if (footerText) {
      doc.text(
        processArabicText(doc, footerText),
        isRtl ? pageWidth - marginX : marginX,
        pageHeight - 7,
        { align: isRtl ? 'right' : 'left' }
      );
    }

    const pageLabel = isRtl ? `صفحة ${i} من ${totalPages}` : `Page ${i} / ${totalPages}`;
    doc.text(
      processArabicText(doc, pageLabel),
      isRtl ? marginX : pageWidth - marginX,
      pageHeight - 7,
      { align: isRtl ? 'left' : 'right' }
    );
  }

  const normalizedName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  doc.save(normalizedName);
}
