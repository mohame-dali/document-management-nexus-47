import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowRight,
  FileOutput, 
  FileInput, 
  Edit, 
  Download, 
  Printer,
  Trash2,
  Eye, 
  Copy, 
  Check,
  Calendar, 
  Clock, 
  Building2, 
  Users, 
  User,
  Hash, 
  Bookmark, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  FolderOpen, 
  Loader2, 
  History, 
  Paperclip,
  Share2,
  FolderTree,
  FileSearch,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useAuth } from '@/contexts/AuthContext';
import { 
  getOutgoingDocument, 
  getIncomingDocument, 
  deleteOutgoingDocument,
  downloadDocument, 
  getDocumentUrl 
} from '@/services/documentService';
import { getDocumentTimeline, AuditLog } from '@/services/auditService';
import { formatArabicDate, formatArabicDateTime } from '@/utils/arabicDateFormatter';
import { OutgoingDocument, IncomingDocument } from '@/types';

import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import PDFViewer from '@/components/documents/PDFViewer';
import ScrollToTop from '@/components/common/ScrollToTop';

const ViewOutgoingDocument: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  // Section refs for smooth navigation
  const pdfSectionRef = useRef<HTMLDivElement>(null);
  const actionsSectionRef = useRef<HTMLDivElement>(null);

  // Dialog states
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // UI View states
  const [previewTab, setPreviewTab] = useState<'outgoing' | 'reference' | 'split'>('outgoing');
  const [isCopiedOcr, setIsCopiedOcr] = useState(false);
  const [isCopiedSubject, setIsCopiedSubject] = useState(false);
  const [isCopiedSerial, setIsCopiedSerial] = useState(false);
  const [ocrSearchQuery, setOcrSearchQuery] = useState('');

  // User role permissions
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const canEdit = isSuperAdmin || isAdminTuningDesk || isAdmin;
  const canDelete = isSuperAdmin || isAdminTuningDesk || isAdmin;
  const canOrganizeDocuments = isAdminDepartment || isSuperAdmin || isAdmin;

  // 1. Fetch main outgoing document
  const { 
    data: document, 
    isLoading: isDocLoading,
    isError: isDocError,
    refetch: refetchDocument 
  } = useQuery<OutgoingDocument>({
    queryKey: ['outgoingDocument', id],
    queryFn: () => getOutgoingDocument(id!),
    enabled: Boolean(id),
  });

  // 2. Fetch reference incoming document (if linked)
  const referenceId = typeof document?.reference === 'object' 
    ? (document?.reference as { _id?: string })?._id 
    : document?.reference;

  const { 
    data: referenceDocument, 
    isLoading: isRefLoading 
  } = useQuery<IncomingDocument>({
    queryKey: ['incomingDocument', referenceId],
    queryFn: () => getIncomingDocument(referenceId as string),
    enabled: Boolean(referenceId),
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

  // 4. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (docId: string) => deleteOutgoingDocument(docId),
    onSuccess: () => {
      toast.success('تم حذف الوثيقة الصادرة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      navigate('/dashboard/outgoing-documents');
    },
    onError: (err: unknown) => {
      console.error('Error deleting outgoing document:', err);
      toast.error('حدث خطأ أثناء محاولة حذف الوثيقة');
    },
  });

  // Copy Subject handler
  const handleCopySubject = () => {
    if (document?.subject) {
      navigator.clipboard.writeText(document.subject);
      setIsCopiedSubject(true);
      toast.success('تم نسخ موضوع الوثيقة');
      setTimeout(() => setIsCopiedSubject(false), 2000);
    }
  };

  // Copy Serial handler
  const handleCopySerial = () => {
    if (document?.serialNumber) {
      const fullReference = `صادر رقم ${document.serialNumber}/${document.year}`;
      navigator.clipboard.writeText(fullReference);
      setIsCopiedSerial(true);
      toast.success('تم نسخ المرجع الإداري للوثيقة');
      setTimeout(() => setIsCopiedSerial(false), 2000);
    }
  };

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
        await downloadDocument(document.scannedDocument, `outgoing-doc-${document.serialNumber}-${document.year}.pdf`);
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

  // Print administrative fiche handler
  const handlePrintFiche = () => {
    window.print();
  };

  // Loading state
  if (isDocLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8 flex flex-col items-center justify-center space-y-4" dir="rtl">
        <Loader2 className="h-10 w-10 text-[#2c5282] animate-spin" />
        <h2 className="text-xl font-bold text-[#1a202c]">جاري تحميل تفاصيل الوثيقة الصادرة...</h2>
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
            الوثيقة الصادرة المطلوبة غير موجودة أو ليس لديك الصلاحيات الكافية للاطلاع عليها.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/dashboard/outgoing-documents')}
              className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
            >
              العودة إلى قائمة الوثائق الصادرة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Folder name resolution
  const folderName = typeof document.folder === 'object' && document.folder 
    ? document.folder.name 
    : (document.folder ? 'مجلد محدد' : 'غير مصنفة في مجلد');

  // Source name resolution
  const sourceName = typeof document.source === 'object' && document.source
    ? document.source.name
    : (document.source || 'غير محدد');

  // Source ID resolution
  const sourceId = typeof document.source === 'object' && document.source?.id
    ? (typeof document.source.id === 'object' ? document.source.id._id : document.source.id)
    : null;

  // Primary destinations count
  const assignedCount = document.assignedTo?.length || 0;
  // Pour Info count
  const pourInfoCount = document.pourInfo?.length || 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      
      {/* PRINT-ONLY OFFICIAL ADMINISTRATIVE SHEET */}
      <div className="hidden print:block bg-white p-8 text-black text-right" dir="rtl">
        <div className="border-b-2 border-black pb-4 mb-6 text-center">
          <h1 className="text-xl font-bold mb-1">الجمهورية الجزائرية الديمقراطية الشعبية</h1>
          <h2 className="text-lg font-bold mb-2">وزارة العدل - منظومة إدارة المراسلات والوثائق</h2>
          <h3 className="text-base font-semibold text-gray-700">بطاقة تقنية لمراسلة صادرة</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6 border p-4">
          <div>
            <span className="font-bold">رقم القيد الصادر:</span> #{document.serialNumber} / {document.year}
          </div>
          <div>
            <span className="font-bold">تاريخ الإصدار:</span> {formatArabicDate(document.issueDate)}
          </div>
          <div>
            <span className="font-bold">المصلحة المصدرة:</span> {sourceName}
          </div>
          <div>
            <span className="font-bold">نوع الوثيقة:</span> {document.typeDocument || 'غير مصنف'}
          </div>
          <div className="col-span-2">
            <span className="font-bold">موضوع المراسلة:</span> {document.subject}
          </div>
          <div className="col-span-2">
            <span className="font-bold">الموجه إليهم:</span> {document.assignedTo?.join('، ') || 'غير محدد'}
          </div>
          {document.pourInfo && document.pourInfo.length > 0 && (
            <div className="col-span-2">
              <span className="font-bold">نسخ للإعلام:</span> {document.pourInfo.join('، ')}
            </div>
          )}
          {referenceDocument && (
            <div className="col-span-2">
              <span className="font-bold">رد على المراسلة الواردة:</span> #{referenceDocument.serialNumber} / {referenceDocument.year} - {referenceDocument.subject}
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-between text-center pt-8 border-t">
          <div className="w-1/3">
            <p className="font-bold mb-12">المصلحة المصدرة للمراسلة</p>
            <p className="text-xs text-gray-500">الختم والتوقيع</p>
          </div>
          <div className="w-1/3">
            <p className="font-bold mb-12">مكتب الضبط والتوثيق</p>
            <p className="text-xs text-gray-500">التأشيرة وتاريخ الإرسال</p>
          </div>
        </div>
      </div>

      {/* 1. EN-TÊTE DE PAGE (Header with Navigation & Key Actions) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        {/* Left in RTL: Back button + Title */}
        <div className="flex items-start sm:items-center gap-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/outgoing-documents')}
            className="h-10 px-4 text-base font-semibold text-[#2c5282] border-[#cbd5e1] hover:bg-gray-50 rounded flex items-center gap-2 transition-colors duration-200"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة إلى القائمة</span>
          </Button>

          <div className="h-6 w-px bg-[#e2e8f0] hidden sm:block" />

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] leading-normal">
                الوثيقة الصادرة #{document.serialNumber}
              </h1>
              <span className="text-base font-bold text-[#4a5568]">
                / لسنة {document.year}
              </span>
            </div>
            <p className="text-base text-[#4a5568] mt-0.5 leading-relaxed">
              بطاقة المعاينة والتدقيق الإداري للمراسلة الصادرة
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

          <Button
            type="button"
            variant="outline"
            onClick={handlePrintFiche}
            className="h-10 px-4 text-base font-semibold text-[#4a5568] border-[#cbd5e1] hover:bg-gray-50 rounded flex items-center gap-2 transition-colors duration-200"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة البطاقة</span>
          </Button>

          {canEdit && (
            <Button
              type="button"
              onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
              className="h-10 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2 transition-colors duration-200"
            >
              <Edit className="h-4 w-4" />
              <span>تعديل الوثيقة</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. RÉSUMÉ EXÉCUTIF (Executive Summary Card) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 print:hidden">
        {/* Top Badges & Status Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Serial & Year Tag */}
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-bold bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]">
              <FileOutput className="h-4 w-4" />
              صادر رقم: #{document.serialNumber} / {document.year}
            </span>

            {/* Document Type Badge (Institutional Gold with Dark Text) */}
            {document.typeDocument && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
                <Bookmark className="h-4 w-4 text-[#1a202c]" />
                {document.typeDocument}
              </span>
            )}

            {/* Reference Status Badge */}
            {referenceDocument ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                رد على مراسلة واردة (#{referenceDocument.serialNumber}/{referenceDocument.year})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-semibold bg-slate-100 text-[#4a5568] border border-slate-300">
                <FileOutput className="h-4 w-4 text-[#718096]" />
                مراسلة صادرة ابتدائية
              </span>
            )}

            {/* Folder Status Badge */}
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-medium bg-slate-50 text-[#2d3748] border border-[#e2e8f0]">
              <FolderOpen className="h-4 w-4 text-[#718096]" />
              {folderName}
            </span>
          </div>

          {/* Issue Date Pill */}
          <div className="inline-flex items-center gap-2 text-base font-semibold text-[#2c5282] bg-[#f8fafc] px-3.5 py-1.5 rounded border border-[#e2e8f0]">
            <Calendar className="h-4 w-4 text-[#2c5282]" />
            <span>تاريخ الإصدار: {formatArabicDate(document.issueDate)}</span>
          </div>
        </div>

        {/* Document Subject Callout Box */}
        <div className="bg-[#f8fafc] border-r-4 border-[#2c5282] border-y border-l border-[#e2e8f0] rounded p-5 sm:p-6 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-[#718096] uppercase tracking-wide">
              موضوع المراسلة الصادرة:
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopySerial}
                className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] hover:bg-blue-50 rounded flex items-center gap-1"
                title="نسخ المرجع الإداري"
              >
                {isCopiedSerial ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#2c5282]" />
                    <span>نسخ المرجع</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopySubject}
                className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] hover:bg-blue-50 rounded flex items-center gap-1"
                title="نسخ موضوع المراسلة"
              >
                {isCopiedSubject ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم نسخ الموضوع</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-[#2c5282]" />
                    <span>نسخ الموضوع</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#1a202c] leading-relaxed">
            {document.subject}
          </p>
        </div>

        {/* Executive Metrics Bar (Grid 4 items) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Metric 1: Source */}
          <div className="p-4 bg-white border border-[#e2e8f0] rounded flex items-center gap-3">
            <div className="w-11 h-11 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-[#718096] font-medium block">المصلحة المصدرة</span>
              <span className="text-base font-bold text-[#1a202c] truncate block" title={sourceName}>
                {sourceName}
              </span>
            </div>
          </div>

          {/* Metric 2: Issue Date */}
          <div className="p-4 bg-white border border-[#e2e8f0] rounded flex items-center gap-3">
            <div className="w-11 h-11 rounded bg-amber-50 border border-[#FFD758] text-[#1a202c] flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-[#1a202c]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-[#718096] font-medium block">تاريخ الإصدار الفعلي</span>
              <span className="text-base font-bold text-[#1a202c] block">
                {formatArabicDate(document.issueDate)}
              </span>
            </div>
          </div>

          {/* Metric 3: Assigned Destinations Count */}
          <div className="p-4 bg-white border border-[#e2e8f0] rounded flex items-center gap-3">
            <div className="w-11 h-11 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-[#718096] font-medium block">الجهات الموجه إليها</span>
              <span className="text-base font-bold text-[#1a202c] block">
                {assignedCount > 0 ? `${assignedCount} جهة محددة` : 'غير محدد'}
              </span>
            </div>
          </div>

          {/* Metric 4: Pour Info Copies */}
          <div className="p-4 bg-white border border-[#e2e8f0] rounded flex items-center gap-3">
            <div className="w-11 h-11 rounded bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-[#718096] font-medium block">نسخ للإعلام (Pour Info)</span>
              <span className="text-base font-bold text-[#1a202c] block">
                {pourInfoCount > 0 ? `${pourInfoCount} جهة للإعلام` : 'لا توجد نسخ'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INFORMATIONS DÉTAILLÉES (Detailed Information Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* Left Column (2 Cols wide on lg): Core Administrative & Dispatch Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Données d'enregistrement et d'émission */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e2e8f0]">
              <div className="w-9 h-9 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center">
                <Hash className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-[#1a202c]">
                بيانات الإصدار والتوثيق الإداري
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-base">
              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">رقم القيد الصادر:</span>
                <span className="text-base font-bold text-[#2c5282]">
                  #{document.serialNumber} لسنة {document.year}
                </span>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">تاريخ الإصدار / الإرسال:</span>
                <span className="text-base font-medium text-[#1a202c]">
                  {formatArabicDate(document.issueDate)}
                </span>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">نوع الوثيقة:</span>
                <span className="text-base font-medium text-[#1a202c]">
                  {document.typeDocument || 'غير مصنف'}
                </span>
              </div>

              <div>
                <span className="text-sm font-semibold text-[#718096] block mb-1">تاريخ الإنشاء والتسجيل بالمنظومة:</span>
                <span className="text-base font-medium text-[#1a202c]">
                  {formatArabicDateTime(document.createdAt)}
                </span>
              </div>

              <div className="md:col-span-2">
                <span className="text-sm font-semibold text-[#718096] block mb-1">المصلحة / القسم المصدر:</span>
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded flex items-center justify-between">
                  <span className="text-base font-bold text-[#1a202c]">{sourceName}</span>
                  {sourceId && (
                    <span className="text-xs text-[#718096]">معرّف المصلحة: {String(sourceId)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Destinations (Assigned To) & Notification (Pour Info) */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#e2e8f0]">
              <div className="w-9 h-9 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center">
                <Share2 className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-[#1a202c]">
                جهات التوجيه والتوزيع الإداري
              </h2>
            </div>

            <div className="space-y-5 text-base">
              {/* Primary Destinations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#1a202c] flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#2c5282]" />
                    الجهات الموجه إليها (المستلمون الأساسيون):
                  </span>
                  <span className="text-xs text-[#718096] font-semibold">
                    {assignedCount} جهة
                  </span>
                </div>

                {document.assignedTo && document.assignedTo.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {document.assignedTo.map((dept, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-semibold bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]"
                      >
                        <Building2 className="h-4 w-4 text-[#2c5282]" />
                        {dept}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded text-[#718096] text-sm">
                    لم يتم تحديد جهات توجيه أساسية لهذه الوثيقة
                  </div>
                )}
              </div>

              <Separator />

              {/* Pour Info (Cc) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#1a202c] flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-[#d69e2e]" />
                    نسخ للإعلام والإطلاع (Pour Information):
                  </span>
                  <span className="text-xs text-[#718096] font-semibold">
                    {pourInfoCount} جهة
                  </span>
                </div>

                {document.pourInfo && document.pourInfo.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {document.pourInfo.map((info, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-base font-semibold bg-amber-50 text-[#1a202c] border border-[#FFD758]"
                      >
                        <Eye className="h-4 w-4 text-[#d69e2e]" />
                        {info}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded text-[#718096] text-sm">
                    لا توجد نسخ محددة للإعلام مع هذه المراسلة
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: OCR Extracted Text (if present) */}
          {document.ocrText && (
            <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded bg-amber-50 border border-[#FFD758] text-[#1a202c] flex items-center justify-center">
                    <FileSearch className="h-5 w-5 text-[#1a202c]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1a202c]">
                      النص المستخرج آلياً (OCR)
                    </h3>
                    <p className="text-xs text-[#718096]">تم التعرف على النص عبر خوارزميات المسح الضوئي</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
              </div>

              {/* Quick Search within OCR Text */}
              <div className="relative">
                <input
                  type="text"
                  value={ocrSearchQuery}
                  onChange={(e) => setOcrSearchQuery(e.target.value)}
                  placeholder="بحث داخل النص المستخرج..."
                  className="w-full h-10 px-3 pr-9 text-sm border border-[#cbd5e1] focus:border-[#2c5282] rounded bg-[#f8fafc] text-[#1a202c] outline-none"
                />
                <FileSearch className="h-4 w-4 text-[#718096] absolute top-3 right-3" />
                {ocrSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setOcrSearchQuery('')}
                    className="text-xs text-[#718096] hover:text-[#1a202c] absolute top-2.5 left-3 font-semibold"
                  >
                    مسح
                  </button>
                )}
              </div>

              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 max-h-72 overflow-y-auto">
                <p className="text-base text-[#2d3748] whitespace-pre-wrap leading-relaxed font-mono">
                  {document.ocrText}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[#718096] pt-1">
                <span>عدد الكلمات التقريبي: {document.ocrText.trim().split(/\s+/).length} كلمة</span>
                <span>الحروف: {document.ocrText.length} حرف</span>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (1 Col wide on lg): Reference Link, Folder, Timeline Summary */}
        <div className="space-y-6">

          {/* Card: Linked Reference Document (الوارد المرجعي) */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <FileInput className="h-5 w-5 text-[#2c5282]" />
                <h3 className="text-lg font-bold text-[#1a202c]">الوثيقة الواردة المرجعية</h3>
              </div>
              {referenceDocument && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  مرتبط
                </span>
              )}
            </div>

            {referenceDocument ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#718096] font-semibold">رقم القيد الوارد:</span>
                    <span className="text-sm font-bold text-[#2c5282]">
                      #{referenceDocument.serialNumber} / {referenceDocument.year}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-[#718096] font-semibold block mb-0.5">موضوع الوارد:</span>
                    <p className="text-sm font-bold text-[#1a202c] line-clamp-2">
                      {referenceDocument.subject}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#718096] pt-1 border-t border-[#e2e8f0]">
                    <span>تاريخ الوصول:</span>
                    <span className="font-semibold text-[#1a202c]">{formatArabicDate(referenceDocument.arrivalDate)}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/incoming-documents/${referenceDocument._id}`)}
                  className="w-full h-10 text-base font-semibold text-[#2c5282] border-[#bee3f8] bg-[#ebf4ff]/50 hover:bg-[#ebf4ff] rounded flex items-center justify-center gap-2 transition-colors duration-200"
                >
                  <span>عرض بطاقة الوثيقة الواردة</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded text-center space-y-2">
                <FileOutput className="h-8 w-8 text-[#718096] mx-auto opacity-50" />
                <p className="text-base font-semibold text-[#4a5568]">مراسلة صادرة ابتدائية</p>
                <p className="text-xs text-[#718096] leading-relaxed">
                  هذه الوثيقة غير مرتبطة بوارد سابق، وصدرت مباشرة بمبادرة إدارية من المصلحة المصدرة.
                </p>
              </div>
            )}
          </div>

          {/* Card: Folder Classification (التصنيف الأرشيفي) */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-[#2c5282]" />
                <h3 className="text-lg font-bold text-[#1a202c]">التصنيف الأرشيفي</h3>
              </div>
              {canOrganizeDocuments && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFolderDialogOpen(true)}
                  className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] hover:bg-blue-50 rounded"
                >
                  تعديل
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
              تصنيف الوثيقة داخل مجلد يضمن سهولة الفهرسة والبحث والرجوع المستقبلي للوثائق المشتركة.
            </p>
          </div>

          {/* Card: Summary of Administrative Steps */}
          <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#e2e8f0]">
              <History className="h-5 w-5 text-[#2c5282]" />
              <h3 className="text-lg font-bold text-[#1a202c]">ملخص مسار الوثيقة</h3>
            </div>

            <ul className="space-y-3 text-sm text-[#4a5568]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-[#1a202c] block">تسجيل الإصدار:</span>
                  <span>{formatArabicDate(document.issueDate)}</span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${assignedCount > 0 ? 'text-emerald-600' : 'text-[#a0aec0]'}`} />
                <div>
                  <span className="font-semibold text-[#1a202c] block">تحديد الموجه إليهم:</span>
                  <span>{assignedCount > 0 ? `${assignedCount} جهة` : 'غير محدد'}</span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${document.folder ? 'text-emerald-600' : 'text-[#a0aec0]'}`} />
                <div>
                  <span className="font-semibold text-[#1a202c] block">الأرشفة في مجلد:</span>
                  <span>{document.folder ? folderName : 'لم تؤرشف بعد'}</span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${document.scannedDocument ? 'text-emerald-600' : 'text-[#a0aec0]'}`} />
                <div>
                  <span className="font-semibold text-[#1a202c] block">المسح الضوئي (PDF):</span>
                  <span>{document.scannedDocument ? 'مرفق وممسوح ضوئياً' : 'غير مرفق'}</span>
                </div>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* 4. PIÈCES JOINTES ET VISUALISATION PDF (Attachments & PDF Viewer) */}
      <div ref={pdfSectionRef} className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 print:hidden">
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
                معاينة مستندات PDF المرفقة مع إمكانية التحميل والطباعة المباشرة
              </p>
            </div>
          </div>

          {/* View Mode Tabs (if dual preview exists with reference) */}
          {document.scannedDocument && referenceDocument?.scannedDocument && (
            <div className="inline-flex items-center border border-[#cbd5e1] rounded bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewTab('outgoing')}
                className={`h-9 px-3 text-sm font-semibold transition-colors duration-200 ${
                  previewTab === 'outgoing' ? 'bg-[#2c5282] text-white' : 'text-[#4a5568] hover:bg-gray-50'
                }`}
              >
                الوثيقة الصادرة
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('reference')}
                className={`h-9 px-3 text-sm font-semibold border-r border-[#cbd5e1] transition-colors duration-200 ${
                  previewTab === 'reference' ? 'bg-[#2c5282] text-white' : 'text-[#4a5568] hover:bg-gray-50'
                }`}
              >
                الوارد المرجعي
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
        {document.scannedDocument || referenceDocument?.scannedDocument ? (
          <div>
            {/* Split View for Dual Preview */}
            {previewTab === 'split' && document.scannedDocument && referenceDocument?.scannedDocument ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Right in RTL (Outgoing) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                    <div className="flex items-center gap-2">
                      <FileOutput className="h-4 w-4 text-[#2c5282]" />
                      <span className="text-base font-bold text-[#1a202c]">الوثيقة الصادرة الحالية</span>
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
                  <div className="border border-[#cbd5e1] rounded bg-[#f8fafc] min-h-[600px] overflow-hidden">
                    <PDFViewer documentPath={document.scannedDocument} />
                  </div>
                </div>

                {/* Left in RTL (Incoming Reference) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                    <div className="flex items-center gap-2">
                      <FileInput className="h-4 w-4 text-emerald-700" />
                      <span className="text-base font-bold text-[#1a202c]">
                        الوارد المرجعي (#{referenceDocument.serialNumber})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => referenceDocument.scannedDocument && downloadDocument(referenceDocument.scannedDocument, `ref-incoming-${referenceDocument.serialNumber}.pdf`)}
                      className="h-8 px-2.5 text-xs font-semibold text-emerald-700 border-[#cbd5e1]"
                    >
                      <Download className="h-3.5 w-3.5 ml-1" />
                      تحميل
                    </Button>
                  </div>
                  <div className="border border-[#cbd5e1] rounded bg-[#f8fafc] min-h-[600px] overflow-hidden">
                    <PDFViewer documentPath={referenceDocument.scannedDocument} />
                  </div>
                </div>
              </div>
            ) : previewTab === 'reference' && referenceDocument?.scannedDocument ? (
              /* Single Reference Preview */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2">
                    <FileInput className="h-4 w-4 text-emerald-700" />
                    <span className="text-base font-bold text-[#1a202c]">
                      ملف الوثيقة الواردة المرجعية (#{referenceDocument.serialNumber}/{referenceDocument.year})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(referenceDocument.scannedDocument!, `ref-incoming-${referenceDocument.serialNumber}.pdf`)}
                    className="h-8 px-3 text-xs font-semibold text-emerald-700 border-[#cbd5e1] hover:bg-emerald-50 rounded flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>تحميل الوارد</span>
                  </Button>
                </div>
                <div className="border border-[#cbd5e1] rounded bg-[#f8fafc] min-h-[650px] overflow-hidden">
                  <PDFViewer documentPath={referenceDocument.scannedDocument} />
                </div>
              </div>
            ) : document.scannedDocument ? (
              /* Single Outgoing Preview (Default) */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                  <div className="flex items-center gap-2">
                    <FileOutput className="h-4 w-4 text-[#2c5282]" />
                    <span className="text-base font-bold text-[#1a202c]">
                      ملف الوثيقة الصادرة (#{document.serialNumber}/{document.year})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="h-8 px-3 text-xs font-semibold text-[#2c5282] border-[#cbd5e1] hover:bg-gray-50 rounded flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>تحميل ملف PDF</span>
                    </Button>
                  </div>
                </div>
                <div className="border border-[#cbd5e1] rounded bg-[#f8fafc] min-h-[650px] overflow-hidden">
                  <PDFViewer documentPath={document.scannedDocument} />
                </div>
              </div>
            ) : (
              <div className="p-8 bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded text-center">
                <Paperclip className="h-10 w-10 text-[#718096] mx-auto mb-2 opacity-50" />
                <p className="text-base font-semibold text-[#4a5568]">لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة</p>
              </div>
            )}
          </div>
        ) : (
          /* Empty Attachments State */
          <div className="p-10 bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded text-center space-y-3">
            <div className="w-14 h-14 rounded bg-gray-100 text-[#718096] flex items-center justify-center mx-auto">
              <Paperclip className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-[#1a202c]">لا توجد وثائق ممسوحة ضوئياً مرفقة</h3>
            <p className="text-base text-[#718096] max-w-md mx-auto leading-relaxed">
              لم يتم تحميل أي ملف PDF ممسوح ضوئياً لهذه المراسلة الصادرة حتى الآن.
            </p>
            {canEdit && (
              <Button
                type="button"
                onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
                className="h-10 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
              >
                إرفاق وثيقة ممسوحة ضوئياً
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 5. ACTIONS DISPONIBLES (Dedicated Administrative Actions Bar) */}
      <div ref={actionsSectionRef} className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-4 print:hidden">
        <div className="pb-3 border-b border-[#e2e8f0]">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c]">
            الإجراءات الإدارية المتاحة
          </h2>
          <p className="text-base text-[#4a5568] mt-0.5">
            العمليات الإدارية المباشرة المتاحة على هذه المراسلة الصادرة
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          {/* Action 1: Voir PDF */}
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

          {/* Action 2: Institutional Gold Button for Archiving/Folder with Dark Text! */}
          {canOrganizeDocuments && (
            <Button
              type="button"
              onClick={() => setIsFolderDialogOpen(true)}
              className="h-11 px-5 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] rounded flex items-center gap-2 transition-colors duration-200"
            >
              <FolderOpen className="h-4 w-4 text-[#1a202c]" />
              <span>أرشفة وتنظيم في مجلد</span>
            </Button>
          )}

          {/* Action 3: Download PDF */}
          {document.scannedDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPDF}
              className="h-11 px-5 text-base font-semibold text-[#4a5568] border-[#cbd5e1] bg-slate-50 hover:bg-slate-100 rounded flex items-center gap-2 transition-colors duration-200"
            >
              <Download className="h-4 w-4 text-[#4a5568]" />
              <span>تحميل نسخة PDF</span>
            </Button>
          )}

          {/* Action 4: Print Fiche */}
          <Button
            type="button"
            variant="outline"
            onClick={handlePrintFiche}
            className="h-11 px-5 text-base font-semibold text-[#4a5568] border-[#cbd5e1] bg-slate-50 hover:bg-slate-100 rounded flex items-center gap-2 transition-colors duration-200"
          >
            <Printer className="h-4 w-4 text-[#4a5568]" />
            <span>طباعة بطاقة الوثيقة</span>
          </Button>

          {/* Action 5: Edit Document */}
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
              className="h-11 px-5 text-base font-semibold text-[#2c5282] border-[#bee3f8] bg-[#ebf4ff]/60 hover:bg-[#ebf4ff] rounded flex items-center gap-2 transition-colors duration-200"
            >
              <Edit className="h-4 w-4" />
              <span>تعديل بيانات الوثيقة</span>
            </Button>
          )}

          {/* Action 6: Delete Document (Admin / SuperAdmin / AdminTuningDesk) */}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="h-11 px-5 text-base font-semibold text-red-600 border-red-200 bg-red-50/50 hover:bg-red-100 rounded flex items-center gap-2 transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
              <span>حذف الوثيقة</span>
            </Button>
          )}

          {/* Action 7: Return to List */}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/outgoing-documents')}
            className="h-11 px-5 text-base font-medium text-[#2d3748] border-[#cbd5e1] hover:bg-gray-50 rounded flex items-center gap-2 transition-colors duration-200 mr-auto"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة إلى قائمة الوثائق</span>
          </Button>
        </div>
      </div>

      {/* 6. HISTORIQUE DE TRAITEMENT (Processing History & Audit Trail) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 print:hidden">
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
                التتبع الزمني لكافة الإجراءات والعمليات التي تمت على هذه المراسلة الصادرة
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
            {/* Step 1: Document Issue / Registration */}
            <div className="relative">
              <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white" />
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-base font-bold text-[#1a202c]">
                    تسجيل وقيد الوثيقة في سجل الصادر
                  </span>
                  <span className="text-xs text-[#718096] font-medium">
                    {formatArabicDateTime(document.createdAt || document.issueDate)}
                  </span>
                </div>
                <p className="text-sm text-[#4a5568]">
                  تم تسجيل المراسلة تحت رقم صادر <span className="font-bold text-[#1a202c]">#{document.serialNumber}</span> لسنة {document.year} من المصلحة المصدرة: <span className="font-semibold text-[#1a202c]">{sourceName}</span>.
                </p>
              </div>
            </div>

            {/* Step 2: Destinations Assigned */}
            {document.assignedTo && document.assignedTo.length > 0 && (
              <div className="relative">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white" />
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
                  <span className="text-base font-bold text-[#1a202c] block">
                    توجيه وإرسال المراسلة إلى الجهات المعنية
                  </span>
                  <p className="text-sm text-[#4a5568]">
                    وجهت المراسلة إلى:{' '}
                    <span className="font-semibold text-[#1a202c]">
                      {document.assignedTo.join('، ')}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Pour Info Notifications */}
            {document.pourInfo && document.pourInfo.length > 0 && (
              <div className="relative">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white" />
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 space-y-1">
                  <span className="text-base font-bold text-[#1a202c] block">
                    إرسال نسخ للإعلام والإطلاع (Pour Info)
                  </span>
                  <p className="text-sm text-[#4a5568]">
                    أرسلت نسخ إعلامية إلى:{' '}
                    <span className="font-semibold text-[#1a202c]">
                      {document.pourInfo.join('، ')}
                    </span>
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

            {/* Step 5: Reference Incoming Document Link */}
            {referenceDocument && (
              <div className="relative">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white" />
                <div className="bg-emerald-50/40 border border-emerald-200 rounded p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-base font-bold text-emerald-900">
                      الربط كإجابة ورد رسمي على مراسلة واردة
                    </span>
                    <span className="text-xs text-emerald-700 font-medium">
                      وارد رقم #{referenceDocument.serialNumber} / {referenceDocument.year}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-800">
                    تشكل هذه الوثيقة الصادرة رداً رسمياً على المراسلة الواردة موضوع:{' '}
                    <span className="font-semibold">"{referenceDocument.subject}"</span>.
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
          documentType="outgoing"
          readOnly={!canOrganizeDocuments}
        />
      )}

      {/* 2. Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-8 rounded bg-white text-right border border-[#e2e8f0] shadow-xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              تأكيد حذف الوثيقة الصادرة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-[#4a5568] leading-relaxed pt-2">
              هل أنت متأكد من رغبتك في حذف الوثيقة الصادرة رقم{' '}
              <span className="font-bold text-[#1a202c]">#{document.serialNumber}</span> لسنة{' '}
              <span className="font-bold text-[#1a202c]">{document.year}</span>؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-4">
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(document._id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base px-5 h-11 rounded"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، حذف الوثيقة'}
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="border-[#cbd5e1] text-[#4a5568] font-semibold text-base px-5 h-11 rounded"
            >
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScrollToTop />
    </div>
  );
};

export default ViewOutgoingDocument;
