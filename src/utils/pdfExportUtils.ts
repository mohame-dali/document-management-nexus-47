import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { formatArabicDateTime } from './arabicDateFormatter';

export interface PdfColumn {
  header: string;           // En-tête de colonne
  dataKey: string;          // Clé dans les données
  width?: number;           // Largeur relative (optionnel)
  align?: 'left' | 'right' | 'center';
}

export interface PdfExportOptions {
  title: string;              // Titre du PDF (arabe + français)
  subtitle?: string;          // Sous-titre (ex: période, filtre)
  columns: PdfColumn[];
  rows: Array<Record<string, unknown>>;
  fileName: string;           // Nom du fichier (sans extension)
  orientation?: 'portrait' | 'landscape';
  footerText?: string;        // Texte de pied de page
  logoUrl?: string;           // Optionnel : logo de l'administration
}

// Interface for jsPDF with extended plugins (processArabic, autoTable)
interface ExtendedJsPdf extends jsPDF {
  processArabic?: (text: string) => string;
  autoTable?: (options: UserOptions) => void;
}

// Cache for font base64 to avoid reloading on repeated exports
let cachedAmiriRegular: string | null = null;
let cachedAmiriBold: string | null = null;

/**
 * Loads font as base64 string from public/fonts directory
 */
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

/**
 * Ensures Amiri Arabic fonts are registered with the jsPDF document
 */
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

/**
 * Reshapes Arabic text into proper presentation form glyphs
 */
export function processArabicText(doc: jsPDF, text: unknown): string {
  if (text === null || text === undefined) return '';
  const str = String(text).trim();
  if (!str) return '';
  try {
    const extDoc = doc as ExtendedJsPdf;
    return typeof extDoc.processArabic === 'function'
      ? extDoc.processArabic(str)
      : str;
  } catch {
    return str;
  }
}

/**
 * Loads an image by URL for embedding in the PDF
 */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Exports a structured data table to an institutional RTL PDF
 */
export async function exportTableToPdf(options: PdfExportOptions): Promise<void> {
  const orientation = options.orientation || 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  // 1. Load Arabic fonts
  const fontsLoaded = await ensureFontsLoaded(doc);
  const activeFont = fontsLoaded ? 'Amiri' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const centerX = pageWidth / 2;

  // 2. Render Header
  const currentY = 12;

  // Optional logo on the left
  if (options.logoUrl) {
    try {
      const logoImg = await loadImage(options.logoUrl);
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', marginX, currentY, 18, 18);
      }
    } catch {
      // Ignore logo loading failures gracefully
    }
  }

  // Institutional heading (Republique Algerienne...)
  doc.setFont(activeFont, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(74, 85, 104); // #4a5568
  doc.text(
    processArabicText(doc, 'الجمهورية الجزائرية الديمقراطية الشعبية'),
    centerX,
    currentY + 2,
    { align: 'center' }
  );

  // Document Title
  doc.setFont(activeFont, 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(26, 32, 44); // #1a202c
  doc.text(
    processArabicText(doc, options.title),
    centerX,
    currentY + 9,
    { align: 'center' }
  );

  // Subtitle (if specified)
  let subY = currentY + 15;
  if (options.subtitle) {
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(113, 128, 150); // #718096
    doc.text(
      processArabicText(doc, options.subtitle),
      centerX,
      subY,
      { align: 'center' }
    );
    subY += 5.5;
  }

  // Generation timestamp
  doc.setFont(activeFont, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(160, 174, 192); // #a0aec0
  const dateMeta = `تاريخ التصدير: ${formatArabicDateTime(new Date())}`;
  doc.text(
    processArabicText(doc, dateMeta),
    centerX,
    subY,
    { align: 'center' }
  );

  // Divider line
  const lineY = subY + 3.5;
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.35);
  doc.line(marginX, lineY, pageWidth - marginX, lineY);

  const startY = lineY + 5;

  // 3. Prepare Table Data (Reversed for RTL reading from right to left)
  const reversedColumns = [...options.columns].reverse();
  const headRow = reversedColumns.map((col) => processArabicText(doc, col.header));

  const bodyRows = options.rows.map((row) =>
    reversedColumns.map((col) => {
      const val = row[col.dataKey];
      return processArabicText(doc, val !== undefined && val !== null ? String(val) : '');
    })
  );

  // Column styles (alignment and optional widths)
  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center'; cellWidth?: number }> = {};
  reversedColumns.forEach((col, idx) => {
    columnStyles[idx] = {
      halign: col.align || 'right',
      ...(col.width ? { cellWidth: col.width } : {}),
    };
  });

  // 4. Render Table with jspdf-autotable
  const tableConfig: UserOptions = {
    startY,
    head: [headRow],
    body: bodyRows,
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8.5,
      cellPadding: 2.5,
      lineWidth: 0.1,
      lineColor: [226, 232, 240], // #e2e8f0
      halign: 'right',
      textColor: [45, 55, 72], // #2d3748
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [44, 82, 130], // #2c5282
      textColor: [255, 255, 255],
      halign: 'right',
      lineWidth: 0.2,
      lineColor: [226, 232, 240],
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [247, 250, 252], // #f7fafc
    },
    columnStyles,
    margin: { left: marginX, right: marginX, bottom: 16 },
  };

  const extDoc = doc as ExtendedJsPdf;
  if (typeof extDoc.autoTable === 'function') {
    extDoc.autoTable(tableConfig);
  } else {
    autoTable(doc, tableConfig);
  }

  // 5. Render Footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 9;

    // Subtle divider
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 2.5, pageWidth - marginX, footerY - 2.5);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 128, 150); // #718096

    // Right: Page number (RTL)
    const pageText = `صفحة ${i} من ${totalPages}`;
    doc.text(
      processArabicText(doc, pageText),
      pageWidth - marginX,
      footerY + 1.5,
      { align: 'right' }
    );

    // Center: Optional custom footer text
    if (options.footerText) {
      doc.text(
        processArabicText(doc, options.footerText),
        centerX,
        footerY + 1.5,
        { align: 'center' }
      );
    }

    // Left: Generation date
    const dateFooter = formatArabicDateTime(new Date());
    doc.text(
      processArabicText(doc, dateFooter),
      marginX,
      footerY + 1.5,
      { align: 'left' }
    );
  }

  // 6. Download PDF
  const cleanFileName = options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`;
  doc.save(cleanFileName);
}

/**
 * Simplified export function for listing items
 */
export async function exportListToPdf(options: PdfExportOptions): Promise<void> {
  return exportTableToPdf(options);
}
