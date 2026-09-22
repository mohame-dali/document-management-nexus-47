import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { processArabicText } from '@/utils/pdfExportUtils';
import { getPhotoUrl } from '@/services/hr/personnelApi';
import { getStagesByPersonnel, RHStage } from '@/services/rhStageService';
import {
  RHPromotion,
  RHPoste,
  RHDiplome,
  RHSanction,
} from '@/services/rhPersonnelHistoryService';

// Interface pour jsPDF avec plugins étendus
interface ExtendedJsPdf extends jsPDF {
  processArabic?: (text: string) => string;
  autoTable?: (options: UserOptions) => void;
  lastAutoTable?: {
    finalY: number;
  };
}

// Interface pour les données du personnel
export interface CarteInstructionPersonnel {
  _id?: string;
  nom?: string;
  prenom?: string;
  pere?: string;
  nomPere?: string;
  fatherName?: string;
  prenomPere?: string;
  grandPere?: string;
  nomGrandPere?: string;
  grandfatherName?: string;
  mere?: string;
  nomMere?: string;
  motherName?: string;
  prenomMere?: string;
  groupeSanguin?: string;
  bloodGroup?: string;
  groupe_sanguin?: string;
  dateNaissance?: string | null;
  lieuNaissance?: string;
  sexe?: string;
  etatCivil?: string;
  enfants?: number | string | null;
  cin?: string;
  matricule?: string;
  grade?: string;
  poste?: string;
  armee?: string;
  army?: string;
  unite?: string;
  unit?: string;
  activeDepartment?: unknown;
  dateEngagement?: string | null;
  dateRecrutement?: string | null;
  dateEmbauche?: string | null;
  adresse?: string;
  telephone?: string;
  email?: string;
  emailPersonnel?: string;
  photo?: string | null;
  personnesAPrevenir?: Array<{
    nom?: string;
    lien?: string;
    telephone?: string;
    adresse?: string;
  }>;
  contactsUrgence?: Array<{
    nom?: string;
    lien?: string;
    telephone?: string;
    adresse?: string;
  }>;
  [key: string]: unknown;
}

// Interface pour l'historique complet
export interface CarteInstructionHistory {
  promotions?: RHPromotion[];
  postes?: RHPoste[];
  diplomes?: RHDiplome[];
  sanctions?: RHSanction[];
  stages?: {
    tunisie?: RHStage[];
    etranger?: RHStage[];
  } | RHStage[];
  [key: string]: unknown;
}

// Cache polices en mémoire
let cachedAmiriRegular: string | null = null;
let cachedAmiriBold: string | null = null;

/**
 * Charge une police TTF en base64
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
 * Enregistre les polices Amiri dans le document jsPDF
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
 * Charge une image et la convertit en DataURL JPEG pour jsPDF
 */
function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadPhotoAsDataUrl(photoPath?: string | null): Promise<string | null> {
  if (!photoPath) return null;
  if (photoPath.startsWith('data:image/')) return photoPath;
  try {
    const url = getPhotoUrl(photoPath);
    if (!url) return null;
    const img = await loadImageElement(url);
    if (!img) return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 300;
    canvas.height = img.naturalHeight || img.height || 380;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (err) {
    console.warn('Could not load personnel photo for PDF:', err);
    return null;
  }
}

/**
 * Dessine un bandeau de titre de section sobre et institutionnel
 */
function renderSectionHeader(
  doc: jsPDF,
  activeFont: string,
  title: string,
  startY: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  // Saut de page si l'espace restant est insuffisant pour le bandeau et au moins 1 ligne
  let currentY = startY;
  if (currentY > pageHeight - 32) {
    doc.addPage();
    currentY = 14;
  }

  // Bandeau sobre bleu nuit institutionnel
  doc.setFillColor(39, 68, 105); // #274469
  doc.roundedRect(marginX, currentY, contentWidth, 6.5, 0.5, 0.5, 'F');

  doc.setFont(activeFont, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(processArabicText(doc, title), pageWidth - marginX - 4, currentY + 4.6, {
    align: 'right',
  });

  return currentY + 7.5;
}

/**
 * Générateur principal de la "بطاقة إرشادات" (Fiche d'instructions)
 *
 * Contraintes strictes :
 * - Style sobre, RTL, arabe avec police Amiri
 * - PHOTO de l'agent en haut à gauche
 * - 7 sections tableaux
 * - SANS en-tête "الجمهورية التونسية"
 * - SANS en-tête "وزارة الدفاع الوطني"
 * - SANS section "التأهيلات"
 */
export async function generateCarteInstruction(
  personnelData: CarteInstructionPersonnel | Record<string, unknown>,
  historyData: CarteInstructionHistory | Record<string, unknown>,
  stagesData?: { tunisie?: RHStage[]; etranger?: RHStage[] } | RHStage[] | unknown
): Promise<void> {
  const p = personnelData as CarteInstructionPersonnel;
  const h = (historyData || {}) as CarteInstructionHistory;

  // Création du document A4 Portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 1. Chargement de la police Amiri
  const fontsLoaded = await ensureFontsLoaded(doc);
  const activeFont = fontsLoaded ? 'Amiri' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182 mm

  // ============================================================
  // EN-TÊTE PRINCIPAL : PHOTO EN HAUT À GAUCHE + TITRE CENTRÉ
  // (SANS "الجمهورية التونسية" et SANS "وزارة الدفاع الوطني")
  // ============================================================
  const headerTopY = 12;
  const photoW = 28;
  const photoH = 35;
  const photoX = marginX; // En haut à gauche
  const photoY = headerTopY;

  // Chargement de la photo de l'agent
  const photoDataUrl = await loadPhotoAsDataUrl(p.photo);

  if (photoDataUrl) {
    try {
      doc.addImage(photoDataUrl, 'JPEG', photoX, photoY, photoW, photoH);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(photoX, photoY, photoW, photoH);
    } catch {
      // Cadre de secours
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(photoX, photoY, photoW, photoH, 'FD');
      doc.setFont(activeFont, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(processArabicText(doc, 'صورة'), photoX + photoW / 2, photoY + photoH / 2, {
        align: 'center',
      });
    }
  } else {
    // Cadre photo vide sobre
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(photoX, photoY, photoW, photoH, 'FD');
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(processArabicText(doc, 'صورة'), photoX + photoW / 2, photoY + photoH / 2, {
      align: 'center',
    });
  }

  // Zone de titre (au centre et à droite de la photo)
  const titleCenterX = marginX + photoW + (contentWidth - photoW) / 2;

  // Titre principal
  doc.setFont(activeFont, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // #1e3a8a
  doc.text(processArabicText(doc, 'بطاقة إرشادات'), titleCenterX, headerTopY + 9, {
    align: 'center',
  });

  // Nom, prénom et grade
  const gradeStr = p.grade ? `${p.grade} / ` : '';
  const fullName = `${gradeStr}${p.prenom || ''} ${p.nom || ''}`.trim();
  doc.setFont(activeFont, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(26, 32, 44);
  doc.text(processArabicText(doc, fullName || '—'), titleCenterX, headerTopY + 17, {
    align: 'center',
  });

  // Métadonnées administratives rapides
  doc.setFont(activeFont, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const matriculeCin = `المعرف الوحيد: ${p.matricule || '—'}   |   ب.ت.و: ${p.cin || '—'}`;
  doc.text(processArabicText(doc, matriculeCin), titleCenterX, headerTopY + 24, {
    align: 'center',
  });

  // Date d'extraction
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const printDate = `تاريخ الاستخراج: ${formatArabicDate(new Date())}`;
  doc.text(processArabicText(doc, printDate), titleCenterX, headerTopY + 30, {
    align: 'center',
  });

  // Ligne de séparation sous l'en-tête
  const dividerY = headerTopY + photoH + 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(marginX, dividerY, pageWidth - marginX, dividerY);

  let currentY = dividerY + 4;

  // Helper pour exécuter autoTable
  const runAutoTable = (options: UserOptions) => {
    const extDoc = doc as ExtendedJsPdf;
    if (typeof extDoc.autoTable === 'function') {
      extDoc.autoTable(options);
    } else {
      autoTable(doc, options);
    }
  };

  // Helper de valeur par défaut
  const safeVal = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—';
    return String(v).trim() || '—';
  };

  // ============================================================
  // SECTION 1 : المعطيات الشخصية والوضعية الإدارية
  // (Identité étendue + Situation administrative)
  // ============================================================
  currentY = renderSectionHeader(
    doc,
    activeFont,
    '1. المعطيات الشخصية والوضعية الإدارية',
    currentY
  );

  // Extraction des champs de la fiche étendue
  const nomVal = safeVal(p.nom);
  const prenomVal = safeVal(p.prenom);
  const pereVal = safeVal(p.pere || p.nomPere || p.fatherName || p.prenomPere);
  const grandPereVal = safeVal(p.grandPere || p.nomGrandPere || p.grandfatherName);
  const mereVal = safeVal(p.mere || p.nomMere || p.motherName || p.prenomMere);
  const groupeSanguinVal = safeVal(p.groupeSanguin || p.bloodGroup || p.groupe_sanguin);

  const dateNaisStr = p.dateNaissance ? formatArabicDate(p.dateNaissance) : '';
  const lieuNaisStr = p.lieuNaissance ? `بـ ${p.lieuNaissance}` : '';
  const naisVal = (dateNaisStr || lieuNaisStr) ? `${dateNaisStr} ${lieuNaisStr}`.trim() : '—';

  let etatCivilVal = '—';
  if (p.etatCivil === 'celibataire') etatCivilVal = 'أعزب / عزباء';
  else if (p.etatCivil === 'marie') etatCivilVal = 'متزوج(ة)';
  else if (p.etatCivil === 'divorce') etatCivilVal = 'مطلق(ة)';
  else if (p.etatCivil === 'veuf') etatCivilVal = 'أرمل(ة)';
  else if (p.etatCivil) etatCivilVal = String(p.etatCivil);

  const enfantsVal = p.enfants !== undefined && p.enfants !== null ? String(p.enfants) : '0';
  const cinVal = safeVal(p.cin);
  const matriculeVal = safeVal(p.matricule);
  const gradeVal = safeVal(p.grade);
  const armeeVal = safeVal(p.armee || p.army);

  const uniteVal = safeVal(
    p.unite ||
    p.unit ||
    (typeof p.activeDepartment === 'object' && p.activeDepartment !== null
      ? (p.activeDepartment as { name?: string }).name
      : p.activeDepartment)
  );

  const dateEngRaw = p.dateEngagement || p.dateRecrutement || p.dateEmbauche;
  const dateEngVal = dateEngRaw ? formatArabicDate(dateEngRaw) : '—';
  const posteVal = safeVal(p.poste);
  const adresseVal = safeVal(p.adresse);
  const telephoneVal = safeVal(p.telephone);

  // Tableau 4 colonnes en mode RTL (de droite à gauche)
  // Col 0 (Gauche) : القيمة 2 | Col 1 : التسمية 2 | Col 2 : القيمة 1 | Col 3 (اليمين) : التسمية 1
  const section1Rows = [
    [prenomVal, 'الاسم', nomVal, 'اللقب'],
    [grandPereVal, 'وابن (اسم الجد)', pereVal, 'ابن (اسم الأب)'],
    [groupeSanguinVal, 'فصيلة الدم', mereVal, 'وأمه (اسم الأم)'],
    [etatCivilVal, 'الحالة المدنية', naisVal, 'تاريخ ومكان الولادة'],
    [cinVal, 'رقم ب.ت.و', enfantsVal, 'عدد الأبناء'],
    [gradeVal, 'الرتبة الحالية', matriculeVal, 'المعرف الوحيد'],
    [uniteVal, 'الوحدة / المصلحة', armeeVal, 'الجيش / السلاح'],
    [posteVal, 'الخطة الوظيفية', dateEngVal, 'تاريخ الانتداب / التطوع'],
    [telephoneVal, 'الهاتف الشخصي', adresseVal, 'العنوان ومقر السكنى'],
  ];

  runAutoTable({
    startY: currentY,
    body: section1Rows.map((row) => row.map((cell) => processArabicText(doc, cell))),
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [203, 213, 225],
      textColor: [30, 41, 59],
      halign: 'right',
      overflow: 'linebreak',
    },
    columnStyles: {
      3: { cellWidth: 32, fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      2: { cellWidth: 59, fillColor: [255, 255, 255] },
      1: { cellWidth: 32, fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      0: { cellWidth: 59, fillColor: [255, 255, 255] },
    },
    margin: { left: marginX, right: marginX, bottom: 16 },
  });

  currentY = (doc as ExtendedJsPdf).lastAutoTable?.finalY ?? currentY + 45;
  currentY += 4;

  // ============================================================
  // SECTION 2 : الأشخاص الواجب إعلامهم عند الحاجة (3 personnes)
  // ============================================================
  currentY = renderSectionHeader(
    doc,
    activeFont,
    '2. الأشخاص الواجب إعلامهم عند الحاجة',
    currentY
  );

  // Extraction des 3 contacts à prévenir
  const rawContacts =
    (Array.isArray(p.personnesAPrevenir) && p.personnesAPrevenir.length > 0)
      ? p.personnesAPrevenir
      : (Array.isArray(p.contactsUrgence) && p.contactsUrgence.length > 0)
      ? p.contactsUrgence
      : [];

  const contactRowsData: Array<{ nom: string; lien: string; tel: string; adr: string }> = [];
  for (let i = 0; i < 3; i++) {
    const c = rawContacts[i];
    contactRowsData.push({
      nom: safeVal(c?.nom),
      lien: safeVal(c?.lien),
      tel: safeVal(c?.telephone),
      adr: safeVal(c?.adresse),
    });
  }

  // Colonnes en RTL (ordre jsPDF LTR inversé) :
  // [العنوان ومقر الإقامة (55mm), رقم الهاتف (35mm), صلة القرابة (32mm), الاسم واللقب (50mm), # (10mm)]
  const section2Head = ['العنوان ومقر الإقامة', 'رقم الهاتف', 'صلة القرابة', 'الاسم واللقب', '#'];
  const section2Body = contactRowsData.map((c, idx) => [
    c.adr,
    c.tel,
    c.lien,
    c.nom,
    String(idx + 1),
  ]);

  runAutoTable({
    startY: currentY,
    head: [section2Head.map((hCol) => processArabicText(doc, hCol))],
    body: section2Body.map((r) => r.map((cell) => processArabicText(doc, cell))),
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [203, 213, 225],
      textColor: [30, 41, 59],
      halign: 'right',
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [51, 65, 85], // #334155 Slate
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      4: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 50 },
      2: { cellWidth: 32 },
      1: { cellWidth: 35 },
      0: { cellWidth: 55 },
    },
    margin: { left: marginX, right: marginX, bottom: 16 },
  });

  currentY = (doc as ExtendedJsPdf).lastAutoTable?.finalY ?? currentY + 25;
  currentY += 4;

  // ============================================================
  // SECTION 3 : التدرج في الرتب (الترقيات)
  // ============================================================
  currentY = renderSectionHeader(
    doc,
    activeFont,
    '3. التدرج في الرتب (الترقيات)',
    currentY
  );

  const promotionsList = h.promotions || [];
  // Colonnes en RTL inversé :
  // [ملاحظات / السبب (33mm), المرجع / الأمر (33mm), تاريخ الترقية (30mm), الرتبة الجديدة (38mm), الرتبة السابقة (38mm), # (10mm)]
  const section3Head = ['ملاحظات / السبب', 'المرجع / الأمر', 'تاريخ الترقية', 'الرتبة الجديدة', 'الرتبة السابقة', '#'];

  const section3Body = promotionsList.length > 0
    ? promotionsList.map((pr, idx) => [
        safeVal(pr.observations || pr.motif),
        safeVal(pr.reference),
        pr.datePromotion ? formatArabicDate(pr.datePromotion) : '—',
        safeVal(pr.gradeNouveau),
        safeVal(pr.gradePrecedent),
        String(idx + 1),
      ])
    : [['—', '—', '—', '—', 'لا توجد ترقيات مسجلة', '—']];

  runAutoTable({
    startY: currentY,
    head: [section3Head.map((hCol) => processArabicText(doc, hCol))],
    body: section3Body.map((r) => r.map((cell) => processArabicText(doc, cell))),
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [203, 213, 225],
      textColor: [30, 41, 59],
      halign: 'right',
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      5: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 38 },
      3: { cellWidth: 38 },
      2: { cellWidth: 30 },
      1: { cellWidth: 33 },
      0: { cellWidth: 33 },
    },
    margin: { left: marginX, right: marginX, bottom: 16 },
  });

  currentY = (doc as ExtendedJsPdf).lastAutoTable?.finalY ?? currentY + 25;
  currentY += 4;

  // ============================================================
  // SECTION 4 : الخطط والمسؤوليات المباشرة (الخطط)
  // ============================================================
  currentY = renderSectionHeader(
    doc,
    activeFont,
    '4. الخطط الوظيفية والمسؤوليات المباشرة',
    currentY
  );

  const postesList = h.postes || [];
  // Colonnes en RTL inversé :
  // [المرجع / ملاحظات (30mm), إلى تاريخ (25mm), من تاريخ (25mm), مكان التعيين / الوحدة (40mm), الخطة الوظيفية / المسؤولية (52mm), # (10mm)]
  const section4Head = ['المرجع / ملاحظات', 'إلى تاريخ', 'من تاريخ', 'مكان التعيين / الوحدة', 'الخطة الوظيفية / المسؤولية', '#'];

  const section4Body = postesList.length > 0
    ? postesList.map((po, idx) => [
        safeVal(po.reference || po.observations),
        po.dateFin ? formatArabicDate(po.dateFin) : 'إلى الآن',
        po.dateDebut ? formatArabicDate(po.dateDebut) : '—',
        safeVal(po.lieu),
        safeVal(po.poste),
        String(idx + 1),
      ])
    : [['—', '—', '—', '—', 'لا توجد خطط وظيفية مسجلة', '—']];

  runAutoTable({
    startY: currentY,
    head: [section4Head.map((hCol) => processArabicText(doc, hCol))],
    body: section4Body.map((r) => r.map((cell) => processArabicText(doc, cell))),
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [203, 213, 225],
      textColor: [30, 41, 59],
      halign: 'right',
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      5: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 52 },
      3: { cellWidth: 40 },
      2: { cellWidth: 25 },
      1: { cellWidth: 25 },
      0: { cellWidth: 30 },
    },
    margin: { left: marginX, right: marginX, bottom: 16 },
  });

  currentY = (doc as ExtendedJsPdf).lastAutoTable?.finalY ?? currentY + 25;
  currentY += 4;

  // ============================================================
  // SECTION 5 : التربصات والتكوين المنجز (بتونس وبالخارج)
  // ============================================================
  currentY = renderSectionHeader(
    doc,
    activeFont,
    '5. التربصات والتكوين المنجز (بتونس وبالخارج)',
    currentY
  );

  // Récupération des stages (soit depuis stagesData, soit depuis historyData, soit appel API)
  let allStages: RHStage[] = [];
  if (stagesData) {
    if (Array.isArray(stagesData)) {
      allStages = stagesData;
    } else if (typeof stagesData === 'object' && stagesData !== null) {
      const sObj = stagesData as { tunisie?: RHStage[]; etranger?: RHStage[] };
      allStages = [...(sObj.tunisie || []), ...(sObj.etranger || [])];
    }
  } else if (h.stages) {
    if (Array.isArray(h.stages)) {
      allStages = h.stages;
    } else {
      allStages = [...(h.stages.tunisie || []), ...(h.stages.etranger || [])];
    }
  } else if (p._id) {
    try {
      const fetchedStages = await getStagesByPersonnel(p._id);
      allStages = [...(fetchedStages?.tunisie || []), ...(fetchedStages?.etranger || [])];
    } catch {
      allStages = [];
    }
  }

  // Colonnes en RTL inversé :
  // [النتيجة / الملاحظات (15mm), المدة (14mm), نهاية (20mm), بداية (20mm), الموقع (25mm), المؤسسة / المكان (35mm), موضوع التربص / الدورة (45mm), # (8mm)]
  const section5Head = [
    'النتيجة / الملاحظات',
    'المدة',
    'تاريخ النهاية',
    'تاريخ البداية',
    'الموقع',
    'المؤسسة / المكان',
    'موضوع التربص / الدورة',
    '#',
  ];

  const section5Body = allStages.length > 0
    ? allStages.map((st, idx) => {
        let ecoleStr = safeVal(st.lieuStage);
        if (typeof st.ecoleId === 'object' && st.ecoleId !== null) {
          ecoleStr = st.ecoleId.nomAr || st.ecoleId.nom || ecoleStr;
        }

        const locStr = st.localisation === 'etranger'
          ? `بالخارج (${st.pays || '—'})`
          : 'بتونس';

        let resStr = '—';
        if (st.resultat === 'admis') resStr = 'ناجح';
        else if (st.resultat === 'refuse') resStr = 'راسب';
        else if (st.resultat === 'en_attente') resStr = 'في الانتظار';
        else if (st.mention) resStr = st.mention;
        else if (st.observations) resStr = st.observations;

        return [
          resStr,
          st.duree ? `${st.duree} يوم` : '—',
          st.dateFin ? formatArabicDate(st.dateFin) : '—',
          st.dateDebut ? formatArabicDate(st.dateDebut) : '—',
          locStr,
          ecoleStr,
          safeVal(st.sujetStage),
          String(idx + 1),
        ];
      })
    : [['—', '—', '—', '—', '—', '—', 'لا توجد دورات تكوينية أو تربصات مسجلة', '—']];

  runAutoTable({
    startY: currentY,
    head: [section5Head.map((hCol) => processArabicText(doc, hCol))],
    body: section5Body.map((r) => r.map((cell) => processArabicText(doc, cell))),
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 7.8,
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [203, 213, 225],
      textColor: [30, 41, 59],
      halign: 'right',
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      7: { cellWidth: 8, halign: 'center' },
      6: { cellWidth: 45 },
      5: { cellWidth: 35 },
      4: { cellWidth: 25 },
      3: { cellWidth: 20 },
      2: { cellWidth: 20 },
      1: { cellWidth: 14 },
      0: { cellWidth: 15 },
    },
    margin: { left: marginX, right: marginX, bottom: 16 },
  });

  currentY = (doc as ExtendedJsPdf).lastAutoTable?.finalY ?? currentY + 25;
  currentY += 4;

  // ============================================================
  // SECTION 6 : الشهائد العلمية والتكوينية (الشهادات)
  // (NOTE : La section التأهيلات est exclue selon les consignes)
  // ============================================================
  currentY = renderSectionHeader(
    doc,
    activeFont,
    '6. الشهائد العلمية والتكوينية',
    currentY
  );

  const diplomesList = h.diplomes || [];
  // Colonnes en RTL inversé :
  // [المرجع / ملاحظات (25mm), المؤسسة المسندة (35mm), تاريخ الحصول عليها (25mm), موضوع الشهادة / الاختصاص (45mm), نوع الشهادة (42mm), # (10mm)]
  const section6Head = [
    'المرجع / ملاحظات',
    'المؤسسة المسندة',
    'تاريخ الشهادة',
    'موضوع الشهادة / الاختصاص',
    'نوع الشهادة',
    '#',
  ];

  const section6Body = diplomesList.length > 0
    ? diplomesList.map((dp, idx) => [
        safeVal(dp.reference || dp.observations),
        safeVal(dp.etablissement),
        dp.dateObtention ? formatArabicDate(dp.dateObtention) : '—',
        safeVal(dp.sujetDiplome),
        safeVal(dp.typeDiplome),
        String(idx + 1),
      ])
    : [['—', '—', '—', '—', 'لا توجد شهادات علمية مسجلة', '—']];

  runAutoTable({
    startY: currentY,
    head: [section6Head.map((hCol) => processArabicText(doc, hCol))],
    body: section6Body.map((r) => r.map((cell) => processArabicText(doc, cell))),
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [203, 213, 225],
      textColor: [30, 41, 59],
      halign: 'right',
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      5: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 42 },
      3: { cellWidth: 45 },
      2: { cellWidth: 25 },
      1: { cellWidth: 35 },
      0: { cellWidth: 25 },
    },
    margin: { left: marginX, right: marginX, bottom: 16 },
  });

  currentY = (doc as ExtendedJsPdf).lastAutoTable?.finalY ?? currentY + 25;
  currentY += 4;

  // ============================================================
  // SECTION 7 : العقوبات التأديبية (العقوبات)
  // ============================================================
  currentY = renderSectionHeader(
    doc,
    activeFont,
    '7. العقوبات التأديبية',
    currentY
  );

  const sanctionsList = h.sanctions || [];
  // Colonnes en RTL inversé :
  // [المرجع / ملاحظات (35mm), سبب العقوبة (55mm), نوع العقوبة (35mm), عدد الأيام / المدة (22mm), تاريخ العقوبة (25mm), # (10mm)]
  const section7Head = [
    'المرجع / ملاحظات',
    'سبب العقوبة',
    'نوع العقوبة',
    'عدد الأيام / المدة',
    'تاريخ العقوبة',
    '#',
  ];

  const section7Body = sanctionsList.length > 0
    ? sanctionsList.map((sc, idx) => [
        safeVal(sc.reference || sc.observations),
        safeVal(sc.raison),
        safeVal(sc.typeSanction),
        sc.nombreJours !== undefined && sc.nombreJours !== null ? `${sc.nombreJours} يوم` : '—',
        sc.dateSanction ? formatArabicDate(sc.dateSanction) : '—',
        String(idx + 1),
      ])
    : [['—', '—', '—', '—', 'لا توجد عقوبات تأديبية مسجلة', '—']];

  runAutoTable({
    startY: currentY,
    head: [section7Head.map((hCol) => processArabicText(doc, hCol))],
    body: section7Body.map((r) => r.map((cell) => processArabicText(doc, cell))),
    theme: 'plain',
    styles: {
      font: activeFont,
      fontSize: 8,
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [203, 213, 225],
      textColor: [30, 41, 59],
      halign: 'right',
      overflow: 'linebreak',
    },
    headStyles: {
      font: activeFont,
      fontStyle: 'bold',
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      halign: 'right',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      5: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 25 },
      3: { cellWidth: 22 },
      2: { cellWidth: 35 },
      1: { cellWidth: 55 },
      0: { cellWidth: 35 },
    },
    margin: { left: marginX, right: marginX, bottom: 18 },
  });

  // ============================================================
  // PIED DE PAGE SUR TOUTES LES PAGES (Numérotation & Titre)
  // ============================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Ligne fine de séparation
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    // Texte de pied de page
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    // Côté droit : Titre et agent
    const footerRight = `بطاقة إرشادات — ${p.prenom || ''} ${p.nom || ''}`.trim();
    doc.text(processArabicText(doc, footerRight), pageWidth - marginX, pageHeight - 6.5, {
      align: 'right',
    });

    // Côté gauche : Numéro de page
    const footerLeft = `صفحة ${i} من ${totalPages}`;
    doc.text(processArabicText(doc, footerLeft), marginX, pageHeight - 6.5, {
      align: 'left',
    });
  }

  // ============================================================
  // TÉLÉCHARGEMENT DU FICHIER PDF
  // ============================================================
  const sanitizedNom = (p.nom || '').trim().replace(/[/\\?%*:|"<>]/g, '_');
  const sanitizedPrenom = (p.prenom || '').trim().replace(/[/\\?%*:|"<>]/g, '_');
  const fileName = `بطاقة_إرشادات_${sanitizedPrenom}_${sanitizedNom}.pdf`;
  doc.save(fileName);
}
