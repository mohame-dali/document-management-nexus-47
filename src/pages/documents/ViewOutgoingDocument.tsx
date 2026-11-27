import React, { useState, useRef, useEffect } from 'react';
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
  Hash, 
  Bookmark, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  FolderOpen, 
  History, 
  Paperclip,
  Share2,
  FolderTree,
  FileSearch,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { 
  getOutgoingDocument, 
  getIncomingDocument, 
  deleteOutgoingDocument,
  downloadDocument, 
  getDocumentUrl 
} from '@/services/documentService';
import { getDocumentTimeline, AuditLog } from '@/services/auditService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { extractDeptMeta, isBureauOrdreUserAccount } from '@/utils/departmentScope';
import { formatLongDate, formatDateTime } from '@/utils/formatDate';
import { OutgoingDocument, IncomingDocument } from '@/types';

import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import PDFViewer from '@/components/documents/PDFViewer';
import CopyReferenceButton from '@/components/documents/CopyReferenceButton';
import ScrollToTop from '@/components/common/ScrollToTop';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';
import DocumentAuditDrawer, { LifecycleFallbackStep } from '@/components/audit/DocumentAuditDrawer';
import PersonnelAssociatedToDocument from '@/components/hr/PersonnelAssociatedToDocument';
import DocumentAIAssistant from '@/components/ai/DocumentAIAssistant';
import MailLifecycleStepper from '@/components/documents/MailLifecycleStepper';

const ViewOutgoingDocument: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const isFr = language === 'fr';
  const dateLang = isFr ? 'fr' : 'ar';
  const dateDir = isFr ? 'ltr' : 'rtl';
  const { dir } = useDirection();
  const listSeparator = t('documents.viewOutgoing.listSeparator');
  
  // Section refs for smooth navigation
  const pdfSectionRef = useRef<HTMLDivElement>(null);
  const actionsSectionRef = useRef<HTMLDivElement>(null);

  // Dialog & Drawer states
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  // UI View states
  const [previewTab, setPreviewTab] = useState<'outgoing' | 'reference' | 'split'>('outgoing');
  const [isPdfExpanded, setIsPdfExpanded] = useState(false);
  const [isCopiedOcr, setIsCopiedOcr] = useState(false);
  const [isCopiedSubject, setIsCopiedSubject] = useState(false);
  const [isCopiedSerial, setIsCopiedSerial] = useState(false);
  const [ocrSearchQuery, setOcrSearchQuery] = useState('');

  useEffect(() => {
    if (!isPdfExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPdfExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPdfExpanded]);

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
  });

  // User role permissions
  const isDirector = currentUser?.role === 'Director';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';
  const bureauOrdreDeptId = extractDeptMeta(orgSettings?.bureauOrdreDepartmentId).id;
  const isBureauOrdreUser = isBureauOrdreUserAccount(currentUser, bureauOrdreDeptId);

  const canEdit = isAdminTuningDesk || isAdmin;
  const canDelete = isAdminTuningDesk || isAdmin;
  const canOrganizeDocuments = (isAdminDepartment || isAdmin) && !isBureauOrdreUser;

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

  // 2. Fetch reference incoming document (if linked and not soft-deleted)
  const populatedReference =
    typeof document?.reference === 'object' && document?.reference ? document.reference : null;
  const isReferenceDeleted = Boolean(populatedReference?.isDeleted);
  const referenceId = !isReferenceDeleted
    ? (populatedReference ? populatedReference._id : (document?.reference as string | undefined))
    : undefined;

  const { 
    data: referenceDocument
  } = useQuery<IncomingDocument>({
    queryKey: ['incomingDocument', referenceId],
    queryFn: () => getIncomingDocument(referenceId as string),
    enabled: Boolean(referenceId) && !isReferenceDeleted,
    retry: false,
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
      toast.success(t('documents.viewOutgoing.toast.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      navigate('/dashboard/outgoing-documents');
    },
    onError: (err: unknown) => {
      console.error('Error deleting outgoing document:', err);
      toast.error(t('documents.viewOutgoing.toast.deleteError'));
    },
  });

  // Copy Subject handler
  const handleCopySubject = () => {
    if (document?.subject) {
      navigator.clipboard.writeText(document.subject);
      setIsCopiedSubject(true);
      toast.success(t('documents.viewOutgoing.toast.subjectCopied'));
      setTimeout(() => setIsCopiedSubject(false), 2000);
    }
  };

  // Copy Serial handler
  const handleCopySerial = () => {
    if (document?.serialNumber) {
      const fullReference = t('documents.viewOutgoing.reference.outgoingNumber', { serialNumber: document.serialNumber, year: document.year });
      navigator.clipboard.writeText(fullReference);
      setIsCopiedSerial(true);
      toast.success(t('documents.viewOutgoing.toast.referenceCopied'));
      setTimeout(() => setIsCopiedSerial(false), 2000);
    }
  };

  // Copy OCR text handler
  const handleCopyOcr = () => {
    if (document?.ocrText) {
      navigator.clipboard.writeText(document.ocrText);
      setIsCopiedOcr(true);
      toast.success(t('documents.viewOutgoing.toast.ocrCopied'));
      setTimeout(() => setIsCopiedOcr(false), 2500);
    }
  };

  // Download PDF handler
  const handleDownloadPDF = async () => {
    if (document?.scannedDocument) {
      try {
        await downloadDocument(document.scannedDocument, `outgoing-doc-${document.serialNumber}-${document.year}.pdf`);
        toast.success(t('documents.viewOutgoing.toast.pdfDownloadStart'));
      } catch (error) {
        console.error('Download error:', error);
        toast.error(t('documents.viewOutgoing.toast.pdfDownloadError'));
      }
    } else {
      toast.info(t('documents.viewOutgoing.toast.pdfMissing'));
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

  // Loading state (Split-View Skeleton)
  if (isDocLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
            <Skeleton className="h-[580px] w-full rounded-lg" />
          </div>
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-28 rounded-full" />
                <Skeleton className="h-7 w-32 rounded-full" />
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found state
  if (isDocError || !document) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-6 sm:p-8 flex items-center justify-center">
        <EmptyState
          className="max-w-xl w-full rounded-xl shadow-xs"
          icon={<AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
          title={t('documents.viewOutgoing.notFound.title')}
          description={t('documents.viewOutgoing.notFound.description')}
          action={
            <Button
              onClick={() => navigate('/dashboard/mail/outgoing')}
              className="h-10 px-5 text-sm sm:text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
            >
              {t('documents.viewOutgoing.notFound.backButton')}
            </Button>
          }
        />
      </div>
    );
  }

  // Folder name resolution
  const folderName = typeof document.folder === 'object' && document.folder 
    ? document.folder.name 
    : (document.folder ? t('documents.viewOutgoing.fallback.specificFolder') : t('documents.viewOutgoing.fallback.noFolder'));

  // Source name resolution
  const sourceName: string = typeof document.source === 'object' && document.source
    ? (document.source.name || t('documents.viewOutgoing.fallback.unspecified'))
    : (typeof document.source === 'string' && document.source
        ? document.source
        : t('documents.viewOutgoing.fallback.unspecified'));

  // Source ID resolution
  const sourceId = typeof document.source === 'object' && document.source?.id
    ? (typeof document.source.id === 'object' ? document.source.id._id : document.source.id)
    : null;

  // Primary destinations count
  const assignedCount = document.assignedTo?.length || 0;
  // Pour Info count
  const pourInfoCount = document.pourInfo?.length || 0;

  // Fallback lifecycle steps passed into DocumentAuditDrawer when raw logs are empty
  const lifecycleSteps: LifecycleFallbackStep[] = [
    {
      id: 'outgoing-step-1',
      title: isFr ? 'Enregistrement au registre départ' : 'تسجيل وقيد الوثيقة في سجل الصادر',
      description: isFr
        ? `Courrier enregistré sous le numéro #${document.serialNumber} / ${document.year} par : ${sourceName}.`
        : `تم تسجيل المراسلة تحت رقم صادر #${document.serialNumber} لسنة ${document.year} من المصلحة المصدرة: ${sourceName}.`,
      timestamp: document.createdAt || document.issueDate,
    },
    ...(document.assignedTo && document.assignedTo.length > 0
      ? [
          {
            id: 'outgoing-step-2',
            title: isFr ? 'Orientation et envoi aux destinataires' : 'توجيه وإرسال المراسلة إلى الجهات المعنية',
            description: isFr
              ? `Destinataires : ${document.assignedTo.join(', ')}`
              : `وجهت المراسلة إلى: ${document.assignedTo.join('، ')}`,
          },
        ]
      : []),
    ...(document.pourInfo && document.pourInfo.length > 0
      ? [
          {
            id: 'outgoing-step-3',
            title: isFr ? 'Copies pour information (Pour Info)' : 'إرسال نسخ للإعلام والإطلاع (Pour Info)',
            description: isFr
              ? `Copies envoyées à : ${document.pourInfo.join(', ')}`
              : `أرسلت نسخ إعلامية إلى: ${document.pourInfo.join('، ')}`,
            variant: 'warning' as const,
          },
        ]
      : []),
    ...(document.folder
      ? [
          {
            id: 'outgoing-step-4',
            title: isFr ? 'Classement et archivage dans un dossier' : 'أرشفة وتصنيف المراسلة في مجلد',
            description: isFr
              ? `Document classé dans le dossier : ${folderName}.`
              : `تم إدراج الوثيقة ضمن مجلد: ${folderName}.`,
          },
        ]
      : []),
    ...(isReferenceDeleted && populatedReference
      ? [
          {
            id: 'outgoing-step-5',
            title: t('documents.viewOutgoing.referenceCard.inTrashTitle'),
            description: t('documents.viewOutgoing.referenceCard.inTrashMessage'),
            variant: 'warning' as const,
          },
        ]
      : referenceDocument
        ? [
            {
              id: 'outgoing-step-5',
              title: isFr ? 'Réponse officielle à un courrier entrant' : 'الربط كإجابة ورد رسمي على مراسلة واردة',
              description: isFr
                ? `Réponse officielle au courrier entrant #${referenceDocument.serialNumber} / ${referenceDocument.year} : "${referenceDocument.subject}".`
                : `تشكل هذه الوثيقة الصادرة رداً رسمياً على المراسلة الواردة (#${referenceDocument.serialNumber} / ${referenceDocument.year}) موضوع: "${referenceDocument.subject}".`,
              variant: 'success' as const,
            },
          ]
        : []),
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-5">
      
      {/* Fil d'Ariane (Breadcrumbs) */}
      <PageBreadcrumb
        homeLabel={t('documents.viewOutgoing.breadcrumb.home')}
        homeTo="/dashboard"
        showHomeIcon
        items={[
          { label: t('documents.viewOutgoing.breadcrumb.mailHub'), to: '/dashboard/mail/outgoing' },
          { label: t('documents.viewOutgoing.breadcrumb.outgoingDocuments'), to: '/dashboard/mail/outgoing' },
          { label: `#${document.serialNumber} / ${document.year}`, tabular: true, ltr: true },
        ]}
      />

      {/* PRINT-ONLY OFFICIAL ADMINISTRATIVE SHEET */}
      <div className="hidden print:block bg-white p-8 text-black text-start">
        <div className="border-b-2 border-black pb-4 mb-6 text-center">
          <h1 className="text-xl font-bold mb-1">{t('documents.viewOutgoing.print.republic')}</h1>
          <h2 className="text-lg font-bold mb-2">{t('documents.viewOutgoing.print.ministry')}</h2>
          <h3 className="text-base font-semibold text-gray-700">{t('documents.viewOutgoing.print.title')}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6 border p-4">
          <div>
            <span className="font-bold">{t('documents.viewOutgoing.print.outgoingNumber')}</span> <bdi dir="ltr">#{document.serialNumber} / {document.year}</bdi>
          </div>
          <div>
            <span className="font-bold">{t('documents.viewOutgoing.print.issueDate')}</span> <bdi dir={dateDir} className="tabular-nums">{formatLongDate(document.issueDate, dateLang)}</bdi>
          </div>
          <div>
            <span className="font-bold">{t('documents.viewOutgoing.print.issuingService')}</span> {sourceName}
          </div>
          <div>
            <span className="font-bold">{t('documents.viewOutgoing.print.documentType')}</span> {document.typeDocument || t('documents.viewOutgoing.fallback.unclassified')}
          </div>
          <div className="col-span-2">
            <span className="font-bold">{t('documents.viewOutgoing.print.subject')}</span> {document.subject}
          </div>
          <div className="col-span-2">
            <span className="font-bold">{t('documents.viewOutgoing.print.recipients')}</span> {document.assignedTo?.join(listSeparator) || t('documents.viewOutgoing.fallback.unspecified')}
          </div>
          {document.pourInfo && document.pourInfo.length > 0 && (
            <div className="col-span-2">
              <span className="font-bold">{t('documents.viewOutgoing.print.pourInfo')}</span> {document.pourInfo.join(listSeparator)}
            </div>
          )}
          {referenceDocument && (
            <div className="col-span-2">
              <span className="font-bold">{t('documents.viewOutgoing.print.replyToIncoming')}</span> <bdi dir="ltr">#{referenceDocument.serialNumber} / {referenceDocument.year}</bdi> - {referenceDocument.subject}
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-between text-center pt-8 border-t">
          <div className="w-1/3">
            <p className="font-bold mb-12">{t('documents.viewOutgoing.print.visa.issuingService')}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{t('documents.viewOutgoing.print.visa.stampAndSignature')}</p>
          </div>
          <div className="w-1/3">
            <p className="font-bold mb-12">{t('documents.viewOutgoing.print.visa.registryOffice')}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{t('documents.viewOutgoing.print.visa.visaAndDate')}</p>
          </div>
        </div>
      </div>

      {/* 1. EN-TÊTE DE PAGE (Header with Navigation & Key Actions) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        {/* Left in RTL: Back button + Title */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/outgoing-documents')}
            className="h-10 px-4 text-sm sm:text-base font-semibold text-[#2c5282] dark:text-blue-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            <span>{t('documents.viewOutgoing.button.backToList')}</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2c5282] dark:text-blue-300 leading-tight tabular-nums">
                {t('documents.viewOutgoing.title.outgoingNumber', { serialNumber: document.serialNumber })}
              </h1>
              <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {t('documents.viewOutgoing.title.yearSuffix', { year: document.year })}
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed truncate">
              {t('documents.viewOutgoing.subtitle')}
            </p>
          </div>
        </div>

        {/* Right in RTL: Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAuditDrawerOpen(true)}
            className="h-10 px-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0"
          >
            <History className="h-4 w-4 text-[#2c5282] dark:text-blue-300 shrink-0" />
            <span>{t('documents.viewOutgoing.button.auditLog')}</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-slate-200/80 dark:border-slate-700 tabular-nums">
              {auditTimeline.length}
            </span>
          </Button>

          {document.scannedDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={handleScrollToPDF}
              className="h-10 px-3.5 text-sm font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              <Eye className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
              <span>{t('documents.viewOutgoing.button.previewPdf')}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handlePrintFiche}
            className="h-10 px-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0"
          >
            <Printer className="h-4 w-4" />
            <span>{t('documents.viewOutgoing.button.printCard')}</span>
          </Button>

          {canEdit && (
            <Button
              type="button"
              onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
              className="h-10 px-4 text-sm sm:text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              <Edit className="h-4 w-4" />
              <span>{t('documents.viewOutgoing.button.editDocument')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cycle de vie visuel du courrier */}
      <MailLifecycleStepper
        type="outgoing"
        document={document}
        referenceDocument={referenceDocument || null}
      />

      {/* 2. VUE PARTAGÉE (Side-by-Side Split-View: PDF Reader + Administrative Metadata) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:hidden">
        {/* DEDICATED PDF / ATTACHMENT READER PANEL (7 cols on lg+) */}
        <div
          className={`lg:col-span-7 order-2 lg:order-1 ${
            !isPdfExpanded ? 'lg:sticky lg:top-4' : ''
          }`}
        >
          {isPdfExpanded && (
            <div
              className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setIsPdfExpanded(false)}
              aria-hidden="true"
            />
          )}
          <div
            ref={pdfSectionRef}
            className={
              isPdfExpanded
                ? 'fixed inset-3 sm:inset-5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 space-y-4 overflow-y-auto'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 space-y-5'
            }
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Paperclip className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    الوثائق المرفقة والممسوحة ضوئياً
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    معاينة مستندات PDF المرفقة مع إمكانية التحميل والطباعة المباشرة
                  </p>
                </div>
              </div>

              {document.scannedDocument && referenceDocument?.scannedDocument && (
                <div className="inline-flex items-center border border-slate-200/80 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/70 p-0.5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('outgoing')}
                    className={`h-8 px-2.5 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-200 whitespace-nowrap ${
                      previewTab === 'outgoing'
                        ? 'bg-[#2c5282] text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الوثيقة الصادرة
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('reference')}
                    className={`h-8 px-2.5 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-200 whitespace-nowrap ${
                      previewTab === 'reference'
                        ? 'bg-[#2c5282] text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    الوارد المرجعي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('split')}
                    className={`h-8 px-2.5 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-200 whitespace-nowrap ${
                      previewTab === 'split'
                        ? 'bg-[#2c5282] text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    عرض مقارن جنباً إلى جنب
                  </button>
                </div>
              )}
            </div>

            {document.scannedDocument || referenceDocument?.scannedDocument ? (
              <div className="space-y-4">
                {(() => {
                  const activePdfPath =
                    previewTab === 'reference' && referenceDocument?.scannedDocument
                      ? referenceDocument.scannedDocument
                      : document.scannedDocument || referenceDocument?.scannedDocument || '';

                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/60">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <Eye className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                        <span>
                          {isFr
                            ? previewTab === 'split'
                              ? 'Vue comparative des documents'
                              : previewTab === 'reference'
                                ? 'Courrier entrant de référence'
                                : 'Document sortant numérisé'
                            : previewTab === 'split'
                              ? 'عرض مقارن للوثيقتين'
                              : previewTab === 'reference'
                                ? 'الوارد المرجعي المرفق'
                                : 'الوثيقة الصادرة الممسوحة'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPdfExpanded((prev) => !prev)}
                          className="h-9 px-3 text-xs sm:text-sm font-semibold border-slate-300 dark:border-slate-600 text-[#2c5282] dark:text-blue-200 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
                        >
                          {isPdfExpanded ? (
                            <>
                              <Minimize2 className="h-4 w-4" />
                              <span>{isFr ? "Réduire l'aperçu" : 'تصغير المعاينة'}</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="h-4 w-4" />
                              <span>{isFr ? "Agrandir l'aperçu" : 'توسيع المعاينة'}</span>
                            </>
                          )}
                        </Button>

                        {activePdfPath && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 text-xs sm:text-sm font-semibold border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <a
                              href={getDocumentUrl(activePdfPath)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>{isFr ? 'Ouvrir dans un nouvel onglet' : 'فتح في تبويب جديد'}</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {previewTab === 'split' && document.scannedDocument && referenceDocument?.scannedDocument ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileOutput className="h-4 w-4 text-[#2c5282] dark:text-blue-300 shrink-0" />
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">الوثيقة الصادرة الحالية</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadPDF}
                          className="h-9 px-2.5 text-xs font-semibold text-[#2c5282] dark:text-blue-200 border-slate-300 dark:border-slate-700 shrink-0"
                        >
                          <Download className="h-3.5 w-3.5 me-1" />
                          تحميل
                        </Button>
                      </div>
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 min-h-[540px] overflow-hidden">
                        <PDFViewer documentPath={document.scannedDocument} expanded={isPdfExpanded} />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileInput className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            الوارد المرجعي (<bdi dir="ltr">#{referenceDocument.serialNumber}</bdi>)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => referenceDocument.scannedDocument && downloadDocument(referenceDocument.scannedDocument, `ref-incoming-${referenceDocument.serialNumber}.pdf`)}
                          className="h-9 px-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-1 shrink-0"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>تحميل</span>
                        </Button>
                      </div>
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 min-h-[540px] overflow-hidden">
                        <PDFViewer documentPath={referenceDocument.scannedDocument} expanded={isPdfExpanded} />
                      </div>
                    </div>
                  </div>
                ) : previewTab === 'reference' && referenceDocument?.scannedDocument ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileInput className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                          ملف الوثيقة الواردة المرجعية (<bdi dir="ltr">#{referenceDocument.serialNumber}/{referenceDocument.year}</bdi>)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(referenceDocument.scannedDocument!, `ref-incoming-${referenceDocument.serialNumber}.pdf`)}
                        className="h-9 px-3 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        <span>تحميل الوارد</span>
                      </Button>
                    </div>
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 min-h-[600px] overflow-hidden">
                      <PDFViewer documentPath={referenceDocument.scannedDocument} expanded={isPdfExpanded} />
                    </div>
                  </div>
                ) : document.scannedDocument ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileOutput className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                          ملف الوثيقة الصادرة (<bdi dir="ltr">#{document.serialNumber}/{document.year}</bdi>)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPDF}
                        className="h-9 px-3 text-xs sm:text-sm font-semibold text-[#2c5282] dark:text-blue-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>تحميل ملف PDF</span>
                      </Button>
                    </div>
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 min-h-[600px] overflow-hidden">
                      <PDFViewer documentPath={document.scannedDocument} expanded={isPdfExpanded} />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    className="border-dashed bg-slate-50/70 dark:bg-slate-800/30 py-12"
                    icon={<Paperclip className="h-6 w-6 text-slate-600 dark:text-slate-300" />}
                    title={isFr ? 'Aucun fichier PDF disponible' : 'لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة'}
                  />
                )}
              </div>
            ) : (
              <EmptyState
                className="border-dashed bg-slate-50/70 dark:bg-slate-800/30 py-14"
                icon={<Paperclip className="h-6 w-6 text-slate-600 dark:text-slate-300" />}
                title="لا توجد وثائق ممسوحة ضوئياً مرفقة"
                description="لم يتم تحميل أي ملف PDF ممسوح ضوئياً لهذه المراسلة الصادرة حتى الآن."
                action={
                  canEdit ? (
                    <Button
                      type="button"
                      onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
                      className="h-10 px-5 text-sm sm:text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
                    >
                      إرفاق وثيقة ممسوحة ضوئياً
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>

        {/* COMPACT ADMINISTRATIVE METADATA & WORKFLOW COLUMN (5 cols on lg+) */}
        <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
          {/* Card 1: Executive Summary & 2x2 Key Metrics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 space-y-5">
            <div className="space-y-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 tabular-nums">
                  <FileOutput className="h-3.5 w-3.5" />
                  <span>{t('documents.viewOutgoing.badge.outgoingNumber', { serialNumber: document.serialNumber, year: document.year })}</span>
                  <CopyReferenceButton value={`#${document.serialNumber} / ${document.year}`} />
                </div>

                {isDirector && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#FFD758] text-[#1a202c] border border-[#FFCB56]">
                    <Building2 className="h-3.5 w-3.5 text-[#1a202c]" />
                    {t('documents.viewOutgoing.badge.director')}
                  </span>
                )}

                {document.typeDocument && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
                    <Bookmark className="h-3.5 w-3.5 text-[#1a202c]" />
                    {document.typeDocument}
                  </span>
                )}

                {isReferenceDeleted && populatedReference ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    {t('documents.viewOutgoing.badge.referenceInTrash', { serialNumber: populatedReference.serialNumber, year: populatedReference.year })}
                  </span>
                ) : referenceDocument ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {t('documents.viewOutgoing.badge.replyToIncoming', { serialNumber: referenceDocument.serialNumber, year: referenceDocument.year })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                    <FileOutput className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                    {t('documents.viewOutgoing.badge.initialOutgoing')}
                  </span>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300 shrink-0" />
                <span>{t('documents.viewOutgoing.badge.issueDate')} <bdi dir={dateDir}>{formatLongDate(document.issueDate, dateLang)}</bdi></span>
              </div>
            </div>

            {/* Subject Callout */}
            <div className="bg-slate-50/80 dark:bg-slate-800/60 border-s-4 border-[#2c5282] dark:border-s-blue-500 border-y border-e border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {t('documents.viewOutgoing.subject.title')}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySerial}
                    className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-md flex items-center gap-1"
                    title={t('documents.viewOutgoing.tooltip.copyReference')}
                  >
                    {isCopiedSerial ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300">{t('documents.viewOutgoing.button.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300" />
                        <span>{t('documents.viewOutgoing.button.copyReference')}</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySubject}
                    className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-md flex items-center gap-1"
                    title={t('documents.viewOutgoing.tooltip.copySubject')}
                  >
                    {isCopiedSubject ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300">{t('documents.viewOutgoing.button.subjectCopied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300" />
                        <span>{t('documents.viewOutgoing.button.copySubject')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                {document.subject}
              </p>
            </div>

            {/* 2x2 Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400 shrink-0" />
                  <span className="font-semibold">{t('documents.viewOutgoing.metric.issuingService')}</span>
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate block" title={sourceName}>
                  {sourceName}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="font-semibold">{t('documents.viewOutgoing.metric.actualIssueDate')}</span>
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                  <bdi dir={dateDir}>{formatLongDate(document.issueDate, dateLang)}</bdi>
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Users className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold">{t('documents.viewOutgoing.metric.recipients')}</span>
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                  {assignedCount > 0 ? t('documents.viewOutgoing.metric.recipientsCount', { count: assignedCount }) : t('documents.viewOutgoing.fallback.unspecified')}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Eye className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400 shrink-0" />
                  <span className="font-semibold">{t('documents.viewOutgoing.metric.pourInfo')}</span>
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                  {pourInfoCount > 0 ? t('documents.viewOutgoing.metric.pourInfoCount', { count: pourInfoCount }) : t('documents.viewOutgoing.metric.noCopies')}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Administrative Actions Bar */}
          <div ref={actionsSectionRef} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-3.5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                الإجراءات الإدارية المتاحة
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                العمليات الإدارية المباشرة المتاحة على هذه المراسلة الصادرة
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {canOrganizeDocuments && (
                <Button
                  type="button"
                  onClick={() => setIsFolderDialogOpen(true)}
                  className="h-10 px-4 text-sm font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <FolderOpen className="h-4 w-4 text-[#1a202c]" />
                  <span>أرشفة وتنظيم في مجلد</span>
                </Button>
              )}

              {document.scannedDocument && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="h-10 px-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  <span>تحميل نسخة PDF</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handlePrintFiche}
                className="h-10 px-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors duration-200"
              >
                <Printer className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <span>طباعة بطاقة الوثيقة</span>
              </Button>

              {canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="h-10 px-3.5 text-sm font-semibold text-red-600 dark:text-red-400 border-red-200/80 dark:border-red-800/60 bg-red-50/70 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span>حذف الوثيقة</span>
                </Button>
              )}
            </div>
          </div>

          {/* Card 3: Core Administrative & Dispatch Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0">
                <Hash className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                بيانات الإصدار والتوثيق الإداري
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">رقم القيد الصادر:</span>
                <div className="inline-flex items-center gap-1.5 font-bold text-[#2c5282] dark:text-blue-300 tabular-nums">
                  <span>
                    <bdi dir="ltr">#{document.serialNumber}</bdi> لسنة <bdi dir="ltr">{document.year}</bdi>
                  </span>
                  <CopyReferenceButton value={`#${document.serialNumber} / ${document.year}`} />
                </div>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">تاريخ الإصدار / الإرسال:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  <bdi dir={dateDir}>{formatLongDate(document.issueDate, dateLang)}</bdi>
                </span>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">نوع الوثيقة:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {document.typeDocument || 'غير مصنف'}
                </span>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">تاريخ التسجيل:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  <bdi dir={dateDir}>{formatDateTime(document.createdAt, dateLang)}</bdi>
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-1">المصلحة / القسم المصدر:</span>
                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{sourceName}</span>
                  {sourceId && (
                    <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">معرّف المصلحة: <bdi dir="ltr">{String(sourceId)}</bdi></span>
                  )}
                </div>
              </div>
            </div>

            <Separator className="dark:bg-slate-800" />

            {/* Destinations & Pour Info */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                    الجهات الموجه إليها (المستلمون الأساسيون):
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                    <bdi dir="ltr">{assignedCount}</bdi> جهة
                  </span>
                </div>

                {document.assignedTo && document.assignedTo.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {document.assignedTo.map((dept, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60"
                      >
                        <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300" />
                        {dept}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">لم يتم تحديد جهات توجيه أساسية لهذه الوثيقة</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    نسخ للإعلام والإطلاع (Pour Information):
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                    <bdi dir="ltr">{pourInfoCount}</bdi> جهة
                  </span>
                </div>

                {document.pourInfo && document.pourInfo.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {document.pourInfo.map((info, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/60"
                      >
                        <Eye className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        {info}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">لا توجد نسخ محددة للإعلام مع هذه المراسلة</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Reference Incoming Document & Folder Classification */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">التصنيف الأرشيفي</h3>
              </div>
              {canOrganizeDocuments && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFolderDialogOpen(true)}
                  className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  تعديل
                </Button>
              )}
            </div>

            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-3">
              <FolderTree className="h-5 w-5 text-slate-700 dark:text-slate-300 shrink-0" />
              <div>
                <span className="text-xs text-slate-600 dark:text-slate-300 block">المجلد الحالي:</span>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{folderName}</span>
              </div>
            </div>
          </div>

          {/* Card 5: Linked Reference Document (الوارد المرجعي) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileInput className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">الوثيقة الواردة المرجعية</h3>
              </div>
              {isReferenceDeleted ? (
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-300/80 dark:border-amber-800/60">
                  {t('documents.viewOutgoing.referenceCard.inTrashBadge')}
                </span>
              ) : referenceDocument && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/60">
                  مرتبط
                </span>
              )}
            </div>

            {isReferenceDeleted && populatedReference ? (
              <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/60 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{t('documents.viewOutgoing.referenceCard.inTrashTitle')}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">رقم القيد الوارد:</span>
                  <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    <bdi dir="ltr">#{populatedReference.serialNumber} / {populatedReference.year}</bdi>
                    <CopyReferenceButton value={`#${populatedReference.serialNumber} / ${populatedReference.year}`} />
                  </div>
                </div>
                {populatedReference.subject && (
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{populatedReference.subject}</p>
                )}
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed pt-1 border-t border-amber-200/80 dark:border-amber-800/60">
                  {t('documents.viewOutgoing.referenceCard.inTrashMessage')}
                </p>
              </div>
            ) : referenceDocument ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">رقم القيد الوارد:</span>
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2c5282] dark:text-blue-300 tabular-nums">
                      <bdi dir="ltr">#{referenceDocument.serialNumber} / {referenceDocument.year}</bdi>
                      <CopyReferenceButton value={`#${referenceDocument.serialNumber} / ${referenceDocument.year}`} />
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">{referenceDocument.subject}</p>
                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/80 dark:border-slate-700/80 tabular-nums">
                    <span>تاريخ الوصول:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100"><bdi dir={dateDir}>{formatLongDate(referenceDocument.arrivalDate, dateLang)}</bdi></span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/incoming-documents/${referenceDocument._id}`)}
                  className="w-full h-10 text-sm sm:text-base font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
                >
                  <span>عرض بطاقة الوثيقة الواردة</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center space-y-1.5">
                <FileOutput className="h-6 w-6 text-slate-600 dark:text-slate-300 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">مراسلة صادرة ابتدائية</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  هذه الوثيقة غير مرتبطة بوارد سابق، وصدرت مباشرة بمبادرة إدارية من المصلحة المصدرة.
                </p>
              </div>
            )}
          </div>

          {/* Card 6: OCR Extracted Text & Assistant IA (if present) */}
          {document.ocrText && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <FileSearch className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      النص المستخرج آلياً (OCR)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">تم التعرف على النص عبر خوارزميات المسح الضوئي</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyOcr}
                  className="h-9 px-3 text-xs sm:text-sm font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 shrink-0"
                >
                  {isCopiedOcr ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-300">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300" />
                      <span>نسخ النص</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={ocrSearchQuery}
                  onChange={(e) => setOcrSearchQuery(e.target.value)}
                  placeholder="بحث داخل النص المستخرج..."
                  className="w-full h-9 px-3 ps-9 text-sm border border-slate-300 dark:border-slate-700 focus:border-[#2c5282] rounded-lg bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none"
                />
                <FileSearch className="h-4 w-4 text-slate-600 dark:text-slate-300 absolute top-2.5 start-3" />
                {ocrSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setOcrSearchQuery('')}
                    className="text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 absolute top-2.5 end-3 font-semibold"
                  >
                    مسح
                  </button>
                )}
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3.5 max-h-60 overflow-y-auto">
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                  {document.ocrText}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                <span>عدد الكلمات التقريبي: <bdi dir="ltr">{document.ocrText.trim().split(/\s+/).length}</bdi> كلمة</span>
                <span>الحروف: <bdi dir="ltr">{document.ocrText.length}</bdi> حرف</span>
              </div>
            </div>
          )}

          {document.ocrText && (
            <DocumentAIAssistant
              ocrText={document.ocrText}
              documentId={document._id}
              documentTitle={document.subject}
            />
          )}
        </div>
      </div>

      {/* 3. PERSONNEL ASSOCIÉ (الموظفون المرتبطون بالوثيقة) */}
      {document && (
        <PersonnelAssociatedToDocument
          documentType="OutgoingDocument"
          documentId={document._id}
          document={document}
        />
      )}

      {/* SLIDE-OVER AUDIT DRAWER */}
      <DocumentAuditDrawer
        open={isAuditDrawerOpen}
        onOpenChange={setIsAuditDrawerOpen}
        auditTimeline={auditTimeline}
        isLoading={isTimelineLoading}
        documentReference={`#${document.serialNumber} / ${document.year}`}
        documentSubject={document.subject}
        lifecycleSteps={lifecycleSteps}
      />

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
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] p-6 sm:p-8 rounded-xl bg-white dark:bg-slate-900 text-start border border-slate-200/80 dark:border-slate-800 shadow-lg" dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              تأكيد حذف الوثيقة الصادرة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
              هل أنت متأكد من رغبتك في حذف الوثيقة الصادرة رقم{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums"><bdi dir="ltr">#{document.serialNumber}</bdi></span> لسنة{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums"><bdi dir="ltr">{document.year}</bdi></span>؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(document._id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base px-5 h-11 rounded-lg"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، حذف الوثيقة'}
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-base px-5 h-11 rounded-lg"
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
