import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowRight,
  FileText, 
  FileInput, 
  FileOutput, 
  Edit, 
  Download, 
  ExternalLink, 
  Eye, 
  Copy, 
  Check,
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Users, 
  Hash, 
  Bookmark, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  FolderOpen, 
  MessageSquare, 
  UserPlus, 
  Loader2, 
  History, 
  Paperclip,
  Share2,
  FolderTree,
  ChevronLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { useAuth } from '@/contexts/AuthContext';
import { getIncomingDocument, getOutgoingDocument, downloadDocument, getDocumentUrl } from '@/services/documentService';
import { getDocumentTimeline, AuditLog } from '@/services/auditService';
import { formatArabicDate, formatArabicDateTime } from '@/utils/arabicDateFormatter';
import { getActivityUrgency } from '@/utils/activityUtils';
import { IncomingDocument, OutgoingDocument } from '@/types';

import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import AssignResponseDialog from '@/components/documents/AssignResponseDialog';
import AssignResponsibleDialog from '@/components/documents/AssignResponsibleDialog';
import PDFViewer from '@/components/documents/PDFViewer';
import ScrollToTop from '@/components/common/ScrollToTop';
import PersonnelAssociatedToDocument from '@/components/hr/PersonnelAssociatedToDocument';

const ViewIncomingDocument: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Section refs for smooth navigation
  const pdfSectionRef = useRef<HTMLDivElement>(null);
  const actionsSectionRef = useRef<HTMLDivElement>(null);

  // Dialog states
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isResponsibleDialogOpen, setIsResponsibleDialogOpen] = useState(false);

  // UI View states
  const [previewTab, setPreviewTab] = useState<'incoming' | 'answer' | 'split'>('incoming');
  const [isCopiedOcr, setIsCopiedOcr] = useState(false);

  // User permissions
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const canEdit = isSuperAdmin || isAdminTuningDesk || isAdmin;
  const canOrganizeDocuments = isAdminDepartment || isSuperAdmin || isAdmin;
  const canAssignOrRespond = isAdminDepartment || isAdmin || isAdminTuningDesk || isSuperAdmin;

  // 1. Fetch main incoming document
  const { 
    data: document, 
    isLoading: isDocLoading,
    isError: isDocError,
    refetch: refetchDocument 
  } = useQuery<IncomingDocument>({
    queryKey: ['incomingDocument', id],
    queryFn: () => getIncomingDocument(id!),
    enabled: Boolean(id),
  });

  // 2. Fetch answer document (if exists)
  const answerId = typeof document?.answer === 'object' ? document?.answer?._id : document?.answer;
  const { 
    data: answerDocument, 
    isLoading: isAnswerLoading 
  } = useQuery<OutgoingDocument>({
    queryKey: ['outgoingDocument', answerId],
    queryFn: () => getOutgoingDocument(answerId as string),
    enabled: Boolean(answerId),
  });

  // 3. Fetch audit/timeline history
  const { 
    data: auditTimeline = [], 
    isLoading: isTimelineLoading 
  } = useQuery<AuditLog[]>({
    queryKey: ['documentTimeline', id],
    queryFn: () => getDocumentTimeline(id!),
    enabled: Boolean(id),
    retry: false,
  });

  // Copy OCR text handler
  const handleCopyOcr = () => {
    if (document?.ocrText) {
      navigator.clipboard.writeText(document.ocrText);
      setIsCopiedOcr(true);
      toast.success('تم نسخ النص المستخرج بنجاح');
      setTimeout(() => setIsCopiedOcr(false), 2500);
    }
  };

  // Download PDF handler
  const handleDownloadPDF = async () => {
    if (document?.scannedDocument) {
      try {
        await downloadDocument(document.scannedDocument, `incoming-doc-${document.serialNumber}-${document.year}.pdf`);
        toast.success('بدأ تحميل ملف PDF');
      } catch (error) {
        console.error('Download error:', error);
        toast.error('تعذر تحميل ملف PDF');
      }
    } else {
      toast.info('لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة');
    }
  };

  // Scroll to PDF section
  const handleScrollToPDF = () => {
    if (pdfSectionRef.current) {
      pdfSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Loading state
  if (isDocLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8 flex flex-col items-center justify-center space-y-4" dir="rtl">
        <Loader2 className="h-10 w-10 text-[#2c5282] animate-spin" />
        <h2 className="text-xl font-bold text-[#1a202c]">جاري تحميل تفاصيل الوثيقة الواردة...</h2>
        <p className="text-base text-[#4a5568]">يرجى الانتظار ريثما يتم جلب بيانات المراسلة وسجلاتها</p>
      </div>
    );
  }

  // Error / Not Found state
  if (isDocError || !document) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8" dir="rtl">
        <div className="max-w-xl mx-auto bg-white border border-[#e2e8f0] rounded p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a202c]">تعذر العثور على الوثيقة</h2>
          <p className="text-base text-[#4a5568] leading-relaxed">
            الوثيقة الواردة المطلوبة غير موجودة أو ليس لديك الصلاحيات الكافية للاطلاع عليها.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/dashboard/incoming-documents')}
              className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
            >
              العودة إلى قائمة الوثائق الواردة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Document urgency status
  const urgency = getActivityUrgency(document);

  // Folder name resolution
  const folderName = typeof document.folder === 'object' && document.folder 
    ? document.folder.name 
    : (document.folder ? 'مجلد محدد' : 'غير مصنفة في مجلد');

  // Responsible user resolution
  const responsibleName = typeof document.responsibleUser === 'object' && document.responsibleUser
    ? document.responsibleUser.username
    : (document.responsibleUser || 'لم يُعيّن مسؤول بعد');

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 lg:p-8 space-y-4" dir="rtl">
      
      {/* Fil d'Ariane (Breadcrumbs) */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-gray-500" dir="rtl">
        <Link to="/dashboard" className="hover:text-[#2c5282] transition-colors">الرئيسية</Link>
        <ChevronLeft className="w-4 h-4 text-gray-400" />
        <Link to="/dashboard/incoming-documents" className="hover:text-[#2c5282] transition-colors">المستندات الواردة</Link>
        <ChevronLeft className="w-4 h-4 text-gray-400" />
        <span className="text-[#1a202c] font-medium truncate max-w-md">
          {document.subject || `وثيقة رقم #${document.serialNumber}`}
        </span>
      </nav>

      {/* 1. EN-TÊTE DE PAGE (Header with Navigation & Key Actions) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left in RTL: Back button + Title */}
        <div className="flex items-start sm:items-center gap-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/incoming-documents')}
            className="h-10 px-4 text-base font-semibold text-[#2c5282] border-[#cbd5e1] hover:bg-gray-50 rounded flex items-center gap-2 transition-colors duration-200"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة إلى القائمة</span>
          </Button>

          <div className="h-6 w-px bg-[#e2e8f0] hidden sm:block" />

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] leading-normal">
                الوثيقة الواردة #{document.serialNumber}
              </h1>
              <span className="text-base font-bold text-[#4a5568]">
                / لسنة {document.year}
              </span>
            </div>
            <p className="text-base text-[#4a5568] mt-0.5 leading-relaxed">
              بطاقة المعاينة والتدقيق الإداري للمراسلة الواردة
            </p>
          </div>
        </div>

        {/* Right in RTL: Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {document.scannedDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={handleScrollToPDF}
              className="h-10 px-4 text-base font-semibold text-[#2c5282] border-blue-200 bg-blue-50/50 hover:bg-blue-100 rounded flex items-center gap-2 transition-colors duration-200"
            >
              <Eye className="h-4 w-4 text-[#2c5282]" />
              <span>معاينة المرفق PDF</span>
            </Button>
          )}

          {canEdit && (
            <Button
              type="button"
              onClick={() => navigate(`/dashboard/incoming-documents/${id}/edit`)}
              className="h-10 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2 transition-colors duration-200"
            >
              <Edit className="h-4 w-4" />
              <span>تعديل الوثيقة</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. RÉSUMÉ EXÉCUTIF (Executive Summary Card) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6">
        {/* Top Badges & Status Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Serial & Year Tag */}
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-bold bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]">
              <FileInput className="h-4 w-4" />
              وارد رقم: #{document.serialNumber} / {document.year}
            </span>

            {/* Answer Status Badge */}
            {document.answer ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                تمت المعالجة والرد عليها
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-bold bg-amber-50 text-[#1a202c] border border-[#FFD758]">
                <Clock className="h-4 w-4 text-[#d69e2e]" />
                بانتظار المعالجة / الرد
              </span>
            )}

            {/* Document Type Badge (Institutional Gold with Dark Text) */}
            {document.typeDocument && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-base font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
                <Bookmark className="h-4 w-4 text-[#1a202c]" />
                {document.typeDocument}
              </span>
            )}

            {/* Urgency Alert Badge if applicable */}
            {urgency && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-base font-bold ${urgency.badgeColor}`}>
                <AlertTriangle className="h-4 w-4" />
                درجة الأهمية: {urgency.label}
              </span>
            )}
          </div>

          {/* Registration Date Pill */}
          <div className="text-sm font-medium text-[#718096] flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[#718096]" />
            <span>سُجلت في: {formatArabicDateTime(document.createdAt)}</span>
          </div>
        </div>

        {/* Document Main Subject (H2 display) */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#718096] tracking-wider uppercase">
            موضوع المراسلة الواردة
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c] leading-relaxed">
            {document.subject}
          </h2>
        </div>

        {/* 4 Key Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* 1. Source / Sender */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#718096]">
              <Building2 className="h-4 w-4 text-[#2c5282]" />
              <span className="font-semibold">المصدر / الجهة المرسلة</span>
            </div>
            <p className="text-base font-bold text-[#1a202c] truncate" title={document.source || 'غير محدد'}>
              {document.source || 'غير محدد'}
            </p>
          </div>

          {/* 2. Arrival Date */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#718096]">
              <Calendar className="h-4 w-4 text-[#2c5282]" />
              <span className="font-semibold">تاريخ الوصول</span>
            </div>
            <p className="text-base font-bold text-[#1a202c]">
              {formatArabicDate(document.arrivalDate)}
            </p>
          </div>

          {/* 3. Original Correspondence */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#718096]">
              <Hash className="h-4 w-4 text-[#2c5282]" />
              <span className="font-semibold">رقم وتاريخ المراسلة الأصلية</span>
            </div>
            <p className="text-base font-bold text-[#1a202c]">
              {document.correspondenceNumber ? (
                <>
                  <span>#{document.correspondenceNumber}</span>
                  {document.correspondenceDate && (
                    <span className="text-xs text-[#718096] font-normal mr-1.5">
                      ({formatArabicDate(document.correspondenceDate)})
                    </span>
                  )}
                </>
              ) : (
                'غير مدون'
              )}
            </p>
          </div>

          {/* 4. Responsible Officer */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#718096]">
              <User className="h-4 w-4 text-[#2c5282]" />
              <span className="font-semibold">المسؤول عن المتابعة</span>
            </div>
            <p className="text-base font-bold text-[#1a202c] truncate">
              {responsibleName}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SECTIONS D'INFORMATIONS DÉTAILLÉES (General, Sender, Assignment, Content) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Main Info & Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: General & Correspondence Details */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e2e8f0]">
              <div className="w-9 h-9 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-[#1a202c]">
                المعلومات الإدارية والمراسلة
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-base">
              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">رقم التسلسل الداخلي:</span>
                <span className="text-base font-bold text-[#1a202c]">#{document.serialNumber} / {document.year}</span>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">تاريخ الوصول إلى المؤسسة:</span>
                <span className="text-base font-medium text-[#1a202c]">{formatArabicDate(document.arrivalDate)}</span>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">رقم مراسلة الجهة الصادرة:</span>
                <span className="text-base font-medium text-[#1a202c]">{document.correspondenceNumber || 'لا يوجد'}</span>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">تاريخ تحرير المراسلة الأصلية:</span>
                <span className="text-base font-medium text-[#1a202c]">
                  {document.correspondenceDate ? formatArabicDate(document.correspondenceDate) : 'غير محدد'}
                </span>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">نوع الوثيقة:</span>
                <span className="text-base font-medium text-[#1a202c]">{document.typeDocument || 'غير مصنف'}</span>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">النشاط أو الإجراء المرتبط:</span>
                <span className="text-base font-medium text-[#1a202c]">
                  {document.activity ? (
                    <span className="inline-flex items-center gap-1.5 text-[#2c5282] font-semibold">
                      <Bookmark className="h-4 w-4" />
                      {document.activity}
                      {document.dateActivity && (
                        <span className="text-xs text-[#718096] font-normal">
                          (بتاريخ {formatArabicDate(document.dateActivity)})
                        </span>
                      )}
                    </span>
                  ) : (
                    'لا يوجد نشاط مسجل'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Sender & Target Departments */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e2e8f0]">
              <div className="w-9 h-9 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-[#1a202c]">
                الجهة المرسلة والتوجيه الداخلي
              </h3>
            </div>

            <div className="space-y-4 text-base">
              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">المصدر / الجهة الراسلة:</span>
                <p className="text-base font-bold text-[#1a202c]">
                  {document.source || 'غير محدد'}
                </p>
              </div>

              <Separator />

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-2">المصالح والأقسام الموجهة إليها:</span>
                {document.assignedTo && document.assignedTo.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {document.assignedTo.map((dept, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-base font-semibold bg-slate-100 text-[#2d3748] border border-slate-300"
                      >
                        <Users className="h-4 w-4 text-[#718096]" />
                        {dept.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-[#718096]">لم يتم توجيه هذه الوثيقة إلى قسم محدد بعد.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: OCR Text (if present) */}
          {document.ocrText && (
            <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded bg-amber-50 border border-[#FFD758] text-[#1a202c] flex items-center justify-center">
                    <FileText className="h-5 w-5 text-[#1a202c]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1a202c]">
                      النص المستخرج آلياً (OCR)
                    </h3>
                    <p className="text-xs text-[#718096]">تم التعرف على النص عبر خوارزميات المسح الضوئي</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyOcr}
                  className="h-9 px-3 text-sm font-semibold border-[#cbd5e1] hover:bg-gray-50 rounded flex items-center gap-1.5"
                >
                  {isCopiedOcr ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-[#2c5282]" />
                      <span>نسخ النص</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded text-base leading-relaxed text-[#2d3748] max-h-72 overflow-y-auto font-sans whitespace-pre-wrap">
                {document.ocrText}
              </div>
            </div>
          )}

          {/* Section: Linked Answer / Outgoing Document (الرد الصادر) */}
          {answerDocument && (
            <div className="bg-white border border-emerald-200 rounded p-6 space-y-4 bg-emerald-50/20">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center">
                    <FileOutput className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-900">
                      الوثيقة الصادرة المرتبطة (الرد الرسمي)
                    </h3>
                    <p className="text-xs text-emerald-700">تم تسجيل ومعالجة الرد الصادر على هذه المراسلة</p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/dashboard/outgoing-documents/${answerDocument._id}`)}
                  className="h-9 px-3.5 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  <span>عرض تفاصيل الرد</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-base">
                <div>
                  <span className="text-xs font-semibold text-[#718096] block mb-1">رقم وتاريخ الصادر:</span>
                  <span className="font-bold text-[#1a202c]">
                    #{answerDocument.serialNumber} / {answerDocument.year}
                  </span>
                  <span className="text-xs text-[#718096] mr-1.5 block">
                    بتاريخ {formatArabicDate(answerDocument.issueDate)}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-[#718096] block mb-1">موضوع الرد:</span>
                  <p className="font-medium text-[#1a202c] line-clamp-2">
                    {answerDocument.subject}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Sidebar Details (Folder, Responsible, Timeline Summary) */}
        <div className="space-y-6">
          
          {/* Card: Folder Categorization */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-[#2c5282]" />
                <h3 className="text-lg font-bold text-[#1a202c]">تصنيف المجلد</h3>
              </div>
              {canOrganizeDocuments && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFolderDialogOpen(true)}
                  className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] hover:bg-blue-50 rounded"
                >
                  تغيير
                </Button>
              )}
            </div>

            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded flex items-center gap-3">
              <FolderTree className="h-6 w-6 text-[#718096] flex-shrink-0" />
              <div>
                <span className="text-xs text-[#718096] block">المجلد الحالي:</span>
                <span className="text-base font-bold text-[#1a202c]">{folderName}</span>
              </div>
            </div>

            <p className="text-xs text-[#718096] leading-relaxed">
              يساعد التصنيف في تنظيم المراسلات وسهولة استرجاعها حسب الملفات والمشاريع.
            </p>
          </div>

          {/* Card: Responsible Officer */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#2c5282]" />
                <h3 className="text-lg font-bold text-[#1a202c]">المسؤول عن المعالجة</h3>
              </div>
              {canAssignOrRespond && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsResponsibleDialogOpen(true)}
                  className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] hover:bg-blue-50 rounded"
                >
                  تعيين
                </Button>
              )}
            </div>

            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center flex-shrink-0 font-bold">
                {responsibleName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-xs text-[#718096] block">المكلف بالمتابعة:</span>
                <span className="text-base font-bold text-[#1a202c]">{responsibleName}</span>
              </div>
            </div>
          </div>

          {/* Card: Document Stats & Timeline Highlights */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#e2e8f0]">
              <History className="h-5 w-5 text-[#2c5282]" />
              <h3 className="text-lg font-bold text-[#1a202c]">ملخص المسار الإداري</h3>
            </div>

            <ul className="space-y-3 text-sm text-[#4a5568]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-[#1a202c] block">تسجيل الوصول:</span>
                  <span>{formatArabicDate(document.arrivalDate)}</span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${document.responsibleUser ? 'text-emerald-600' : 'text-[#a0aec0]'}`} />
                <div>
                  <span className="font-semibold text-[#1a202c] block">تعيين المسؤول:</span>
                  <span>{document.responsibleUser ? responsibleName : 'قيد الانتظار'}</span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${document.answer ? 'text-emerald-600' : 'text-[#a0aec0]'}`} />
                <div>
                  <span className="font-semibold text-[#1a202c] block">الرد الصادر:</span>
                  <span>{document.answer ? 'تم إعداد الرد' : 'لم يتم الرد بعد'}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. PIÈCES JOINTES ET VISUALISATION PDF (Attachments & PDF Viewer) */}
      <div ref={pdfSectionRef} className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c]">
                الوثائق المرفقة والممسوحة ضوئياً
              </h2>
              <p className="text-base text-[#4a5568]">
                معاينة مستندات PDF المرفقة مع إمكانية التحميل والطباعة
              </p>
            </div>
          </div>

          {/* View Mode Tabs (if dual preview exists) */}
          {document.scannedDocument && answerDocument?.scannedDocument && (
            <div className="inline-flex items-center border border-[#cbd5e1] rounded bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewTab('incoming')}
                className={`h-9 px-3 text-sm font-semibold transition-colors duration-200 ${
                  previewTab === 'incoming' ? 'bg-[#2c5282] text-white' : 'text-[#4a5568] hover:bg-gray-50'
                }`}
              >
                الوثيقة الواردة
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('answer')}
                className={`h-9 px-3 text-sm font-semibold border-r border-[#cbd5e1] transition-colors duration-200 ${
                  previewTab === 'answer' ? 'bg-[#2c5282] text-white' : 'text-[#4a5568] hover:bg-gray-50'
                }`}
              >
                الرد الصادر
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('split')}
                className={`h-9 px-3 text-sm font-semibold border-r border-[#cbd5e1] transition-colors duration-200 ${
                  previewTab === 'split' ? 'bg-[#2c5282] text-white' : 'text-[#4a5568] hover:bg-gray-50'
                }`}
              >
                عرض مقارن جنباً إلى جنب
              </button>
            </div>
          )}
        </div>

        {/* PDF Content Display */}
        {document.scannedDocument || answerDocument?.scannedDocument ? (
          <div>
            {/* Split View for Dual Preview */}
            {previewTab === 'split' && document.scannedDocument && answerDocument?.scannedDocument ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left (Incoming) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                    <div className="flex items-center gap-2">
                      <FileInput className="h-4 w-4 text-[#2c5282]" />
                      <span className="text-base font-bold text-[#1a202c]">الوثيقة الواردة الأصلية</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] border-[#cbd5e1]"
                    >
                      <Download className="h-3.5 w-3.5 ml-1" />
                      تحميل
                    </Button>
                  </div>
                  <div className="border border-[#e2e8f0] rounded overflow-hidden min-h-[500px]">
                    <PDFViewer documentPath={document.scannedDocument} />
                  </div>
                </div>

                {/* Right (Outgoing Answer) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                    <div className="flex items-center gap-2">
                      <FileOutput className="h-4 w-4 text-emerald-700" />
                      <span className="text-base font-bold text-emerald-900">الوثيقة الصادرة (الرد)</span>
                    </div>
                    {answerDocument.scannedDocument && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(answerDocument.scannedDocument!, `answer-${answerDocument.serialNumber}.pdf`)}
                        className="h-8 px-2.5 text-xs font-semibold text-emerald-800 border-[#cbd5e1]"
                      >
                        <Download className="h-3.5 w-3.5 ml-1" />
                        تحميل
                      </Button>
                    )}
                  </div>
                  <div className="border border-[#e2e8f0] rounded overflow-hidden min-h-[500px]">
                    <PDFViewer documentPath={answerDocument.scannedDocument} />
                  </div>
                </div>
              </div>
            ) : previewTab === 'answer' && answerDocument?.scannedDocument ? (
              /* Answer Document Viewer */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2">
                    <FileOutput className="h-5 w-5 text-emerald-700" />
                    <span className="text-base font-bold text-[#1a202c]">
                      مرفق الرد الصادر #{answerDocument.serialNumber} / {answerDocument.year}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(answerDocument.scannedDocument!, `answer-${answerDocument.serialNumber}.pdf`)}
                    className="h-9 px-3 text-sm font-semibold text-emerald-800 border-[#cbd5e1]"
                  >
                    <Download className="h-4 w-4 ml-1.5" />
                    تحميل ملف PDF
                  </Button>
                </div>
                <div className="border border-[#e2e8f0] rounded overflow-hidden min-h-[600px]">
                  <PDFViewer documentPath={answerDocument.scannedDocument} />
                </div>
              </div>
            ) : document.scannedDocument ? (
              /* Incoming Document Single Viewer */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2">
                    <FileInput className="h-5 w-5 text-[#2c5282]" />
                    <span className="text-base font-bold text-[#1a202c]">
                      مرفق الوثيقة الواردة #{document.serialNumber} / {document.year}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="h-9 px-3 text-sm font-semibold text-[#2c5282] border-[#cbd5e1] hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 ml-1.5" />
                    تحميل ملف PDF
                  </Button>
                </div>
                <div className="border border-[#e2e8f0] rounded overflow-hidden min-h-[600px]">
                  <PDFViewer documentPath={document.scannedDocument} />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* Empty Attachments State */
          <div className="p-8 sm:p-12 text-center bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-3">
            <div className="w-14 h-14 rounded bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto text-[#718096]">
              <Paperclip className="h-7 w-7 text-[#718096]" />
            </div>
            <h3 className="text-lg font-bold text-[#1a202c]">لا توجد وثيقة ممسوحة ضوئياً مرفقة</h3>
            <p className="text-base text-[#718096] max-w-md mx-auto leading-relaxed">
              لم يتم رفع نسخة رقمية (PDF) لهذه المراسلة بعد. يمكنك تعديل الوثيقة لإرفاق النسخة الممسوحة ضوئياً.
            </p>
            {canEdit && (
              <Button
                type="button"
                onClick={() => navigate(`/dashboard/incoming-documents/${id}/edit`)}
                className="h-10 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
              >
                إرفاق وثيقة ممسوحة ضوئياً
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 5. ACTIONS DISPONIBLES (Dedicated Administrative Actions Bar) */}
      <div ref={actionsSectionRef} className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-4">
        <div className="pb-3 border-b border-[#e2e8f0]">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c]">
            الإجراءات الإدارية المتاحة
          </h2>
          <p className="text-base text-[#4a5568] mt-0.5">
            العمليات الإدارية المباشرة المتاحة على هذه المراسلة الواردة
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          {/* Action 1: Voir PDF (معاينة PDF) */}
          {document.scannedDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={handleScrollToPDF}
              className="h-11 px-5 text-base font-semibold text-[#2c5282] border-blue-200 bg-blue-50/60 hover:bg-blue-100 rounded flex items-center gap-2 transition-colors duration-200"
            >
              <Eye className="h-4 w-4" />
              <span>معاينة ملف PDF</span>
            </Button>
          )}

          {/* Action 2: Traiter (معالجة / إضافة رد) -> Institutional Gold Button with Dark Text! */}
          {canAssignOrRespond && (
            <Button
              type="button"
              onClick={() => setIsResponseDialogOpen(true)}
              className="h-11 px-5 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] rounded flex items-center gap-2 transition-colors duration-200"
            >
              <MessageSquare className="h-4 w-4 text-[#1a202c]" />
              <span>{document.answer ? 'تعديل أو استبدال الرد' : 'معالجة وإضافة رد'}</span>
            </Button>
          )}

          {/* Action 3: Archiver (أرشفة في مجلد) */}
          {canOrganizeDocuments && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFolderDialogOpen(true)}
              className="h-11 px-5 text-base font-semibold text-[#4a5568] border-[#cbd5e1] bg-slate-50 hover:bg-slate-100 rounded flex items-center gap-2 transition-colors duration-200"
            >
              <FolderOpen className="h-4 w-4 text-[#4a5568]" />
              <span>أرشفة وتنظيم في مجلد</span>
            </Button>
          )}

          {/* Action 4: Transférer (تحويل / تعيين مسؤول) */}
          {canAssignOrRespond && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResponsibleDialogOpen(true)}
              className="h-11 px-5 text-base font-semibold text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 rounded flex items-center gap-2 transition-colors duration-200"
            >
              <UserPlus className="h-4 w-4 text-purple-700" />
              <span>تحويل / تعيين مسؤول</span>
            </Button>
          )}

          {/* Action 5: Retour à la liste (العودة إلى القائمة) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/incoming-documents')}
            className="h-11 px-5 text-base font-medium text-[#2d3748] border-[#cbd5e1] hover:bg-gray-50 rounded flex items-center gap-2 transition-colors duration-200 mr-auto"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة إلى قائمة الوثائق</span>
          </Button>
        </div>
      </div>

      {/* 5.5 PERSONNEL ASSOCIÉ (الموظفون المرتبطون بالوثيقة) */}
      {document && (
        <PersonnelAssociatedToDocument
          documentType="IncomingDocument"
          documentId={document._id}
        />
      )}

      {/* 6. HISTORIQUE DE TRAITEMENT (Processing History & Audit Trail) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6">
        <div className="pb-3 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c]">
                سجل المتابعة والتاريخ الإداري
              </h2>
              <p className="text-base text-[#4a5568]">
                التتبع الزمني لكافة الإجراءات والعمليات التي تمت على هذه المراسلة
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        {auditTimeline.length > 0 ? (
          <div className="relative border-r border-[#cbd5e1] pr-6 mr-3 space-y-6">
            {auditTimeline.map((item, index) => (
              <div key={item._id || index} className="relative group">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white" />
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-base font-bold text-[#1a202c]">
                      {item.action || 'إجراء إداري'}
                    </span>
                    <span className="text-xs text-[#718096] font-medium">
                      {formatArabicDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[#4a5568]">
                    قام بالإجراء: <span className="font-semibold text-[#1a202c]">{item.userDetails?.username || 'مستخدم النظام'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Institutional Lifecycle Fallback Timeline */
          <div className="relative border-r border-[#cbd5e1] pr-6 mr-3 space-y-6">
            {/* Step 1: Document Arrival / Registration */}
            <div className="relative">
              <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white" />
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-base font-bold text-[#1a202c]">
                    تسجيل وقيد الوثيقة في سجل الوارد
                  </span>
                  <span className="text-xs text-[#718096] font-medium">
                    {formatArabicDateTime(document.createdAt || document.arrivalDate)}
                  </span>
                </div>
                <p className="text-sm text-[#4a5568]">
                  تم تسجيل المراسلة تحت رقم تسلسلي <span className="font-bold text-[#1a202c]">#{document.serialNumber}</span> لسنة {document.year} من المصدر: <span className="font-semibold text-[#1a202c]">{document.source || 'غير محدد'}</span>.
                </p>
              </div>
            </div>

            {/* Step 2: Department Assignment */}
            {document.assignedTo && document.assignedTo.length > 0 && (
              <div className="relative">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white" />
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
                  <span className="text-base font-bold text-[#1a202c] block">
                    توجيه المراسلة إلى المصالح المختصة
                  </span>
                  <p className="text-sm text-[#4a5568]">
                    وجهت المراسلة إلى:{' '}
                    <span className="font-semibold text-[#1a202c]">
                      {document.assignedTo.map(d => d.name).join('، ')}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Responsible Officer Assignment */}
            {document.responsibleUser && (
              <div className="relative">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white" />
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
                  <span className="text-base font-bold text-[#1a202c] block">
                    تعيين الموظف المسؤول عن المتابعة
                  </span>
                  <p className="text-sm text-[#4a5568]">
                    عُيّن الزميل <span className="font-semibold text-[#1a202c]">{responsibleName}</span> مسؤولاً عن متابعة ومعالجة هذه المراسلة.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Folder Categorization */}
            {document.folder && (
              <div className="relative">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white" />
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
                  <span className="text-base font-bold text-[#1a202c] block">
                    أرشفة وتصنيف المراسلة في مجلد
                  </span>
                  <p className="text-sm text-[#4a5568]">
                    تم إدراج الوثيقة ضمن مجلد: <span className="font-semibold text-[#1a202c]">{folderName}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Answer / Processing Completion */}
            {document.answer && (
              <div className="relative">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white" />
                <div className="bg-emerald-50/40 border border-emerald-200 rounded p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-base font-bold text-emerald-900">
                      إتمام المعالجة وإصدار الرد الرسمي
                    </span>
                    {answerDocument?.issueDate && (
                      <span className="text-xs text-emerald-700 font-medium">
                        {formatArabicDate(answerDocument.issueDate)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-emerald-800">
                    تم تحرير وإصدار وثيقة الرد الصادر رقم{' '}
                    <span className="font-bold">
                      #{answerDocument ? answerDocument.serialNumber : ''} / {answerDocument ? answerDocument.year : ''}
                    </span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DIALOGS */}
      {/* 1. Folder Categorization Dialog */}
      {document && (
        <DocumentFolderDialog
          open={isFolderDialogOpen}
          onOpenChange={setIsFolderDialogOpen}
          document={document}
          documentType="incoming"
          readOnly={!canOrganizeDocuments}
        />
      )}

      {/* 2. Assign Response Dialog */}
      {document && (
        <AssignResponseDialog
          open={isResponseDialogOpen}
          onOpenChange={setIsResponseDialogOpen}
          document={document}
        />
      )}

      {/* 3. Assign Responsible Dialog */}
      {document && (
        <AssignResponsibleDialog
          open={isResponsibleDialogOpen}
          onOpenChange={setIsResponsibleDialogOpen}
          document={document}
        />
      )}

      <ScrollToTop />
    </div>
  );
};

export default ViewIncomingDocument;
