import jsPDF from 'jspdf';
import { formatArabicDate } from './arabicDateFormatter';
import { processArabicText } from './pdfExportUtils';

export interface UserAccessCredentialData {
  prenom: string;
  nom: string;
  departmentName?: string;
  roleArabicLabel: string;
  username: string;
  password: string;
  systemUrl?: string;
  nomAdministration?: string;
  dateCreation?: string;
}

// Interface for jsPDF with extended plugins
interface ExtendedJsPdf extends jsPDF {
  processArabic?: (text: string) => string;
}

// Cache fonts in memory
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

/**
 * Renders a single access card on half an A4 page (height 148.5 mm)
 */
function renderSingleBadge(
  doc: jsPDF,
  data: UserAccessCredentialData,
  startY: number,
  cardHeight: number,
  pageWidth: number
) {
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  const rightX = pageWidth - marginX - 10;
  const leftX = marginX + 10;

  // 1. Decorative border card
  doc.setDrawColor(44, 82, 130); // #2c5282
  doc.setLineWidth(0.8);
  doc.roundedRect(marginX, startY + 6, contentWidth, cardHeight - 12, 3, 3);

  // Inner subtle border
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX + 2.5, startY + 8.5, contentWidth - 5, cardHeight - 17, 2, 2);

  // Header Banner Background
  doc.setFillColor(44, 82, 130); // #2c5282
  doc.roundedRect(marginX + 3, startY + 9, contentWidth - 6, 20, 2, 2, 'F');

  // Institution Name (RTL)
  doc.setFont('Amiri', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const adminName = data.nomAdministration || 'الإدارة العامة للتشفير';
  doc.text(processArabicText(doc, adminName), centerX, startY + 17, { align: 'center' });

  // Badge Subtitle
  doc.setFontSize(11);
  doc.setTextColor(255, 203, 86); // #FFCB56 amber gold
  doc.text(processArabicText(doc, 'بطاقة الاتصال بالنظام'), centerX, startY + 24, { align: 'center' });

  // 2. Body Details (Table-style rows)
  let y = startY + 37;
  const rowHeight = 9.5;

  const drawInfoRow = (labelAr: string, value: string, isCredential = false) => {
    // Row background (alternate or highlight)
    if (isCredential) {
      doc.setFillColor(235, 244, 255); // #ebf4ff highlight
      doc.roundedRect(leftX, y - 6, contentWidth - 20, rowHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(44, 82, 130);
      doc.setLineWidth(0.3);
      doc.roundedRect(leftX, y - 6, contentWidth - 20, rowHeight, 1.5, 1.5, 'D');
    } else {
      doc.setFillColor(248, 250, 252); // #f8fafc
      doc.roundedRect(leftX, y - 6, contentWidth - 20, rowHeight, 1, 1, 'F');
    }

    // Label on the right
    doc.setFont('Amiri', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(74, 85, 104); // #4a5568
    doc.text(processArabicText(doc, labelAr), rightX, y, { align: 'right' });

    // Colon separator
    doc.text(':', rightX - 35, y, { align: 'right' });

    // Value on the left / center-left
    if (isCredential) {
      doc.setFont('Amiri', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(44, 82, 130); // Blue #2c5282
      doc.text(value, leftX + 10, y, { align: 'left' });
    } else {
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(26, 32, 44); // #1a202c
      doc.text(processArabicText(doc, value || '—'), rightX - 42, y, { align: 'right' });
    }

    y += rowHeight + 2;
  };

  const fullName = `${data.prenom || ''} ${data.nom || ''}`.trim();
  drawInfoRow('الاسم الكامل', fullName);
  drawInfoRow('القسم الإداري', data.departmentName || '—');
  drawInfoRow('الصفة الوظيفية', data.roleArabicLabel || 'موظف');

  // Highlighted Credentials
  drawInfoRow('اسم المستخدم', data.username, true);
  drawInfoRow('كلمة المرور', data.password, true);

  // System URL and Date
  const currentUrl = data.systemUrl || window.location.origin || 'http://localhost:3000';
  drawInfoRow('رابط الدخول', currentUrl);

  const creationDate = data.dateCreation || formatArabicDate(new Date().toISOString());
  drawInfoRow('تاريخ الإصدار', creationDate);

  // 3. Footer / Security Confidentiality Notice
  doc.setFont('Amiri', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(197, 48, 48); // #c53030 red security notice
  doc.text(
    processArabicText(doc, '⚠ سري وشخصي — يُسلّم باليد لصاحبه ويجب تغيير كلمة المرور عند أول تسجيل دخول'),
    centerX,
    startY + cardHeight - 11,
    { align: 'center' }
  );
}

/**
 * Generates an A4 PDF with 2 access cards per page, separated by a dashed cut line
 */
export async function generateUserAccessPdf(credentials: UserAccessCredentialData[]): Promise<void> {
  if (!credentials || credentials.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await ensureFontsLoaded(doc);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const halfPageHeight = pageHeight / 2; // 148.5

  for (let i = 0; i < credentials.length; i++) {
    const isTopHalf = i % 2 === 0;

    // Add new page after every 2 cards
    if (i > 0 && isTopHalf) {
      doc.addPage();
    }

    const startY = isTopHalf ? 0 : halfPageHeight;
    renderSingleBadge(doc, credentials[i], startY, halfPageHeight, pageWidth);

    // If top card rendered, draw dashed cutting line across the middle (y = 148.5)
    if (isTopHalf) {
      doc.setDrawColor(160, 174, 192); // Gray dashed line
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([3, 3], 0);
      doc.line(10, halfPageHeight, pageWidth - 10, halfPageHeight);
      doc.setLineDashPattern([], 0); // Reset dash

      // Cutting icon / text
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(160, 174, 192);
      doc.text('✂ ' + processArabicText(doc, 'خط القص'), pageWidth - 20, halfPageHeight - 1.5, { align: 'right' });
    }
  }

  // Format file name
  const today = new Date().toISOString().split('T')[0];
  const fileName = `comptes-utilisateurs-${today}.pdf`;
  doc.save(fileName);
}
