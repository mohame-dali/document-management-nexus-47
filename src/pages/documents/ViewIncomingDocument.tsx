import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  History, 
  Paperclip,
  FolderTree,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

import { useAuth } from '@/contexts/AuthContext';
import { getIncomingDocument, getOutgoingDocument, downloadDocument, getDocumentUrl } from '@/services/documentService';
import { getDocumentTimeline, AuditLog } from '@/services/auditService';
import { formatLongDate, formatDateTime } from '@/utils/formatDate';
import { getActivityUrgency } from '@/utils/activityUtils';
import { IncomingDocument, OutgoingDocument } from '@/types';

import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import AssignResponseDialog from '@/components/documents/AssignResponseDialog';
import AssignResponsibleDialog from '@/components/documents/AssignResponsibleDialog';
import PDFViewer from '@/components/documents/PDFViewer';
import CopyReferenceButton from '@/components/documents/CopyReferenceButton';
import ScrollToTop from '@/components/common/ScrollToTop';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';
import DocumentAuditDrawer, { LifecycleFallbackStep } from '@/components/audit/DocumentAuditDrawer';
import PersonnelAssociatedToDocument from '@/components/hr/PersonnelAssociatedToDocument';
import DocumentAIAssistant from '@/components/ai/DocumentAIAssistant';
import MailLifecycleStepper from '@/components/documents/MailLifecycleStepper';
import { useLanguage } from '@/contexts/LanguageProvider';

const ViewIncomingDocument: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const listSeparator = language === 'ar' ? '، ' : ', ';
  
  // Section refs for smooth navigation
  const pdfSectionRef = useRef<HTMLDivElement>(null);
  const actionsSectionRef = useRef<HTMLDivElement>(null);

  // Dialog & Drawer states
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isResponsibleDialogOpen, setIsResponsibleDialogOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  // UI View states
  const [previewTab, setPreviewTab] = useState<'incoming' | 'answer' | 'split'>('incoming');
  const [isPdfExpanded, setIsPdfExpanded] = useState(false);
  const [isCopiedOcr, setIsCopiedOcr] = useState(false);

  const isFr = language === 'fr';
  const dateLang = isFr ? 'fr' : 'ar';
  const dateDir = isFr ? 'ltr' : 'rtl';

  useEffect(() => {
    if (!isPdfExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPdfExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPdfExpanded]);

  // User permissions
  const isDirector = currentUser?.role === 'Director';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const canEdit = isAdminTuningDesk || isAdmin;
  const canOrganizeDocuments = isAdminDepartment || isAdmin;
  const canAssignOrRespond = isAdminDepartment || isAdmin || isAdminTuningDesk;

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

  // 2. Fetch answer document (if exists and not soft-deleted)
  const populatedAnswer =
    typeof document?.answer === 'object' && document?.answer ? document.answer : null;
  const isAnswerDeleted = Boolean(populatedAnswer?.isDeleted);
  const answerId = !isAnswerDeleted
    ? (populatedAnswer ? populatedAnswer._id : (document?.answer as string | undefined))
    : undefined;
  const { 
    data: answerDocument
  } = useQuery<OutgoingDocument>({
    queryKey: ['outgoingDocument', answerId],
    queryFn: () => getOutgoingDocument(answerId as string),
    enabled: Boolean(answerId) && !isAnswerDeleted,
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

  // Copy OCR text handler
  const handleCopyOcr = () => {
    if (document?.ocrText) {
      navigator.clipboard.writeText(document.ocrText);
      setIsCopiedOcr(true);
      toast.success(t('documents.viewIncoming.toast.ocrCopied'));
      setTimeout(() => setIsCopiedOcr(false), 2500);
    }
  };

  // Download PDF handler
  const handleDownloadPDF = async () => {
    if (document?.scannedDocument) {
      try {
        await downloadDocument(document.scannedDocument, `incoming-doc-${document.serialNumber}-${document.year}.pdf`);
        toast.success(t('documents.viewIncoming.toast.pdfDownloadStart'));
      } catch (error) {
        console.error('Download error:', error);
        toast.error(t('documents.viewIncoming.toast.pdfDownloadError'));
      }
    } else {
      toast.info(t('documents.viewIncoming.toast.pdfMissing'));
    }
  };

  // Scroll to PDF section
  const handleScrollToPDF = () => {
    if (pdfSectionRef.current) {
      pdfSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, idx) => (
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
              <Skeleton className="h-8 w-full" />
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
          title={t('documents.viewIncoming.notFound.title')}
          description={t('documents.viewIncoming.notFound.description')}
          action={
            <Button
              onClick={() => navigate('/dashboard/mail/incoming')}
              className="h-10 px-5 text-sm sm:text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
            >
              {t('documents.viewIncoming.notFound.backButton')}
            </Button>
          }
        />
      </div>
    );
  }

  // Document urgency status
  const urgency = getActivityUrgency(document);

  // Folder name resolution
  const folderName = typeof document.folder === 'object' && document.folder 
    ? document.folder.name 
    : (document.folder ? t('documents.viewIncoming.fallback.specificFolder') : t('documents.viewIncoming.fallback.noFolder'));

  // Responsible user resolution
  const responsibleName: string = typeof document.responsibleUser === 'object' && document.responsibleUser
    ? document.responsibleUser.username
    : (typeof document.responsibleUser === 'string' && document.responsibleUser
        ? document.responsibleUser
        : t('documents.viewIncoming.fallback.noResponsible'));

  // Fallback lifecycle steps passed into DocumentAuditDrawer when raw logs are empty
  const lifecycleSteps: LifecycleFallbackStep[] = [
    {
      id: 'incoming-step-1',
      title: t('documents.viewIncoming.timeline.lifecycle.step1.title'),
      description: t('documents.viewIncoming.timeline.lifecycle.step1.description', {
        serialNumber: document.serialNumber,
        year: document.year,
        source: document.source || t('documents.viewIncoming.fallback.unspecified'),
      }),
      timestamp: document.createdAt || document.arrivalDate,
    },
    ...(document.assignedTo && document.assignedTo.length > 0
      ? [
          {
            id: 'incoming-step-2',
            title: t('documents.viewIncoming.timeline.lifecycle.step2.title'),
            description: t('documents.viewIncoming.timeline.lifecycle.step2.description', {
              departments: document.assignedTo.map((d) => d.name).join(listSeparator),
            }),
          },
        ]
      : []),
    ...(document.responsibleUser
      ? [
          {
            id: 'incoming-step-3',
            title: t('documents.viewIncoming.timeline.lifecycle.step3.title'),
            description: t('documents.viewIncoming.timeline.lifecycle.step3.description', {
              name: responsibleName,
            }),
          },
        ]
      : []),
    ...(document.folder
      ? [
          {
            id: 'incoming-step-4',
            title: t('documents.viewIncoming.timeline.lifecycle.step4.title'),
            description: t('documents.viewIncoming.timeline.lifecycle.step4.description', {
              folder: folderName,
            }),
          },
        ]
      : []),
    ...(document.answer
      ? [
          {
            id: 'incoming-step-5',
            title: isAnswerDeleted
              ? t('documents.viewIncoming.answer.deletedInTrashTitle')
              : t('documents.viewIncoming.timeline.lifecycle.step5.title'),
            description: isAnswerDeleted
              ? t('documents.viewIncoming.answer.deletedInTrashSubtitle')
              : t('documents.viewIncoming.timeline.lifecycle.step5.description', {
                  serialNumber: answerDocument
                    ? answerDocument.serialNumber
                    : populatedAnswer?.serialNumber || '',
                  year: answerDocument
                    ? answerDocument.year
                    : populatedAnswer?.year || '',
                }),
            timestamp: !isAnswerDeleted ? answerDocument?.issueDate : undefined,
            variant: isAnswerDeleted ? ('warning' as const) : ('success' as const),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-5">
      
      {/* Fil d'Ariane (Breadcrumbs) */}
      <PageBreadcrumb
        homeLabel={t('documents.viewIncoming.breadcrumb.home')}
        homeTo="/dashboard"
        showHomeIcon
        items={[
          { label: t('documents.viewIncoming.breadcrumb.mailHub'), to: '/dashboard/mail/incoming' },
          { label: t('documents.viewIncoming.breadcrumb.incomingDocuments'), to: '/dashboard/mail/incoming' },
          { label: `#${document.serialNumber} / ${document.year}`, tabular: true, ltr: true },
        ]}
      />

      {/* 1. EN-TÊTE DE PAGE (Header with Navigation & Key Actions) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Navigation & Titles */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/incoming-documents')}
            className="h-10 px-4 text-sm sm:text-base font-semibold text-[#2c5282] dark:text-blue-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            <span>{t('documents.viewIncoming.button.backToList')}</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2c5282] dark:text-blue-300 leading-tight tabular-nums">
                {t('documents.viewIncoming.title.incomingNumber', { serialNumber: document.serialNumber })}
              </h1>
              <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {t('documents.viewIncoming.title.yearSuffix', { year: document.year })}
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed truncate">
              {t('documents.viewIncoming.subtitle')}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAuditDrawerOpen(true)}
            className="h-10 px-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0"
          >
            <History className="h-4 w-4 text-[#2c5282] dark:text-blue-300 shrink-0" />
            <span>{t('documents.viewIncoming.button.auditLog')}</span>
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
              <span>{t('documents.viewIncoming.button.previewPdf')}</span>
            </Button>
          )}

          {canEdit && (
            <Button
              type="button"
              onClick={() => navigate(`/dashboard/incoming-documents/${id}/edit`)}
              className="h-10 px-4 text-sm sm:text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 transition-colors duration-200 whitespace-nowrap shrink-0"
            >
              <Edit className="h-4 w-4" />
              <span>{t('documents.viewIncoming.button.editDocument')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cycle de vie visuel du courrier */}
      <MailLifecycleStepper
        type="incoming"
        document={document}
        answerDocument={answerDocument || null}
      />

      {/* 2. VUE PARTAGÉE (Side-by-Side Split-View: PDF Reader + Administrative Metadata) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                    {t('documents.viewIncoming.attachments.title')}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {t('documents.viewIncoming.attachments.subtitle')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {document.scannedDocument && answerDocument?.scannedDocument && (
                  <div className="inline-flex items-center border border-slate-200/80 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/70 p-0.5 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('incoming')}
                      className={`h-8 px-2.5 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-200 whitespace-nowrap ${
                        previewTab === 'incoming'
                          ? 'bg-[#2c5282] text-white shadow-2xs'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t('documents.viewIncoming.viewer.tab.incoming')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('answer')}
                      className={`h-8 px-2.5 text-xs sm:text-sm font-semibold rounded-md transition-colors duration-200 whitespace-nowrap ${
                        previewTab === 'answer'
                          ? 'bg-[#2c5282] text-white shadow-2xs'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t('documents.viewIncoming.viewer.tab.answer')}
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
                      {t('documents.viewIncoming.viewer.tab.split')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {document.scannedDocument || answerDocument?.scannedDocument ? (
              <div className="space-y-4">
                {(() => {
                  const activePdfPath =
                    previewTab === 'answer' && answerDocument?.scannedDocument
                      ? answerDocument.scannedDocument
                      : document.scannedDocument || answerDocument?.scannedDocument || '';

                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/60">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <Eye className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                        <span>
                          {isFr
                            ? previewTab === 'split'
                              ? 'Vue comparative des documents'
                              : previewTab === 'answer'
                                ? 'Document de réponse'
                                : 'Document entrant numérisé'
                            : previewTab === 'split'
                              ? 'عرض مقارن للوثيقتين'
                              : previewTab === 'answer'
                                ? 'وثيقة الرد الصادر'
                                : 'الوثيقة الواردة الممسوحة'}
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

                {previewTab === 'split' && document.scannedDocument && answerDocument?.scannedDocument ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileInput className="h-4 w-4 text-[#2c5282] dark:text-blue-300 shrink-0" />
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {t('documents.viewIncoming.viewer.label.originalIncoming')}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadPDF}
                          className="h-9 px-2.5 text-xs font-semibold text-[#2c5282] dark:text-blue-200 border-slate-300 dark:border-slate-700 shrink-0"
                        >
                          <Download className="h-3.5 w-3.5 me-1" />
                          {t('documents.viewIncoming.viewer.button.download')}
                        </Button>
                      </div>
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden min-h-[500px]">
                        <PDFViewer documentPath={document.scannedDocument} expanded={isPdfExpanded} />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileOutput className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200 truncate">
                            {t('documents.viewIncoming.viewer.label.outgoingAnswer')}
                          </span>
                        </div>
                        {answerDocument.scannedDocument && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(answerDocument.scannedDocument!, `answer-${answerDocument.serialNumber}.pdf`)}
                            className="h-9 px-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-1 shrink-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{t('documents.viewIncoming.viewer.button.download')}</span>
                          </Button>
                        )}
                      </div>
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden min-h-[500px]">
                        <PDFViewer documentPath={answerDocument.scannedDocument} expanded={isPdfExpanded} />
                      </div>
                    </div>
                  </div>
                ) : previewTab === 'answer' && answerDocument?.scannedDocument ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileOutput className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                          {t('documents.viewIncoming.viewer.label.answerAttachment', { serialNumber: answerDocument.serialNumber, year: answerDocument.year })}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(answerDocument.scannedDocument!, `answer-${answerDocument.serialNumber}.pdf`)}
                        className="h-9 px-3 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-200 border-slate-300 dark:border-slate-700"
                      >
                        <Download className="h-4 w-4 me-1.5" />
                        {t('documents.viewIncoming.viewer.button.downloadPdf')}
                      </Button>
                    </div>
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden min-h-[600px]">
                      <PDFViewer documentPath={answerDocument.scannedDocument} expanded={isPdfExpanded} />
                    </div>
                  </div>
                ) : document.scannedDocument ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileInput className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
                        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                          {t('documents.viewIncoming.viewer.label.incomingAttachment', { serialNumber: document.serialNumber, year: document.year })}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPDF}
                        className="h-9 px-3 text-xs sm:text-sm font-semibold text-[#2c5282] dark:text-blue-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Download className="h-4 w-4 me-1.5" />
                        {t('documents.viewIncoming.viewer.button.downloadPdf')}
                      </Button>
                    </div>
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden min-h-[600px]">
                      <PDFViewer documentPath={document.scannedDocument} expanded={isPdfExpanded} />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                className="border-dashed bg-slate-50/70 dark:bg-slate-800/30 py-14"
                icon={<Paperclip className="h-6 w-6 text-slate-600 dark:text-slate-300" />}
                title={t('documents.viewIncoming.attachments.empty.title')}
                description={t('documents.viewIncoming.attachments.empty.description')}
                action={
                  canEdit ? (
                    <Button
                      type="button"
                      onClick={() => navigate(`/dashboard/incoming-documents/${id}/edit`)}
                      className="h-10 px-5 text-sm sm:text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
                    >
                      {t('documents.viewIncoming.attachments.empty.attachButton')}
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
                  <FileInput className="h-3.5 w-3.5" />
                  <span>{t('documents.viewIncoming.badge.incomingNumber', { serialNumber: document.serialNumber, year: document.year })}</span>
                  <CopyReferenceButton value={`#${document.serialNumber} / ${document.year}`} />
                </div>

                {isDirector && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#FFD758] text-[#1a202c] border border-[#FFCB56]">
                    <Building2 className="h-3.5 w-3.5 text-[#1a202c]" />
                    {t('documents.viewIncoming.badge.director')}
                  </span>
                )}

                {isAnswerDeleted ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    {t('documents.viewIncoming.badge.answerInTrash')}
                  </span>
                ) : document.answer ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {t('documents.viewIncoming.badge.processedAndReplied')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-amber-50/90 dark:bg-amber-950/50 text-[#1a202c] dark:text-amber-200 border border-[#FFD758] dark:border-amber-800/60">
                    <Clock className="h-3.5 w-3.5 text-[#d69e2e] dark:text-amber-400" />
                    {t('documents.viewIncoming.badge.pendingProcessing')}
                  </span>
                )}

                {document.typeDocument && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
                    <Bookmark className="h-3.5 w-3.5 text-[#1a202c]" />
                    {document.typeDocument}
                  </span>
                )}

                {urgency && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold ${urgency.badgeColor}`}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('documents.viewIncoming.badge.priority', { priority: urgency.label })}
                  </span>
                )}
              </div>

              <div className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 tabular-nums">
                <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                <span>{t('documents.viewIncoming.badge.registeredOn', { date: formatDateTime(document.createdAt, dateLang) })}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wider uppercase block">
                {t('documents.viewIncoming.subject.title')}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                {document.subject}
              </h2>
            </div>

            {/* 2x2 Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400 shrink-0" />
                  <span className="font-semibold">{t('documents.viewIncoming.metric.source')}</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate" title={document.source || t('documents.viewIncoming.fallback.unspecified')}>
                  {document.source || t('documents.viewIncoming.fallback.unspecified')}
                </p>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400 shrink-0" />
                  <span className="font-semibold">{t('documents.viewIncoming.metric.arrivalDate')}</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  <bdi dir={dateDir}>{formatLongDate(document.arrivalDate, dateLang)}</bdi>
                </p>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <Hash className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400 shrink-0" />
                  <span className="font-semibold">{t('documents.viewIncoming.metric.originalCorrespondence')}</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap tabular-nums">
                  {document.correspondenceNumber ? (
                    <>
                      <span><bdi dir="ltr">#{document.correspondenceNumber}</bdi></span>
                      <CopyReferenceButton value={document.correspondenceNumber} />
                      {document.correspondenceDate && (
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-normal tabular-nums">
                          (<bdi dir={dateDir}>{formatLongDate(document.correspondenceDate, dateLang)}</bdi>)
                        </span>
                      )}
                    </>
                  ) : (
                    t('documents.viewIncoming.fallback.notRecorded')
                  )}
                </div>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <User className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400 shrink-0" />
                  <span className="font-semibold">{t('documents.viewIncoming.metric.responsible')}</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {responsibleName}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Administrative Actions */}
          <div ref={actionsSectionRef} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-3.5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('documents.viewIncoming.actions.title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {t('documents.viewIncoming.actions.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {canAssignOrRespond && (
                <Button
                  type="button"
                  onClick={() => setIsResponseDialogOpen(true)}
                  className="h-10 px-4 text-sm font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <MessageSquare className="h-4 w-4 text-[#1a202c]" />
                  <span>{document.answer ? t('documents.viewIncoming.actions.editOrReplaceAnswer') : t('documents.viewIncoming.actions.processAndReply')}</span>
                </Button>
              )}

              {canOrganizeDocuments && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFolderDialogOpen(true)}
                  className="h-10 px-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <FolderOpen className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  <span>{t('documents.viewIncoming.actions.archiveInFolder')}</span>
                </Button>
              )}

              {canAssignOrRespond && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResponsibleDialogOpen(true)}
                  className="h-10 px-3.5 text-sm font-semibold text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60 bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <UserPlus className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                  <span>{t('documents.viewIncoming.actions.assignResponsible')}</span>
                </Button>
              )}

              {document.scannedDocument && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="h-10 px-3.5 text-sm font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <Download className="h-4 w-4" />
                  <span>{t('documents.viewIncoming.viewer.button.downloadPdf')}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Card 3: General Correspondence Details & Assigned Departments */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('documents.viewIncoming.adminInfo.sectionTitle')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">{t('documents.viewIncoming.adminInfo.internalSerial')}</span>
                <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  <bdi dir="ltr">#{document.serialNumber} / {document.year}</bdi>
                  <CopyReferenceButton value={`#${document.serialNumber} / ${document.year}`} />
                </div>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">{t('documents.viewIncoming.adminInfo.arrivalDateAtInstitution')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums"><bdi dir={dateDir}>{formatLongDate(document.arrivalDate, dateLang)}</bdi></span>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">{t('documents.viewIncoming.adminInfo.senderCorrespondenceNumber')}</span>
                <div className="inline-flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {document.correspondenceNumber ? (
                    <>
                      <bdi dir="ltr">{document.correspondenceNumber}</bdi>
                      <CopyReferenceButton value={document.correspondenceNumber} />
                    </>
                  ) : (
                    t('documents.viewIncoming.fallback.none')
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">{t('documents.viewIncoming.adminInfo.originalIssueDate')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {document.correspondenceDate ? <bdi dir={dateDir}>{formatLongDate(document.correspondenceDate, dateLang)}</bdi> : t('documents.viewIncoming.fallback.unspecified')}
                </span>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">{t('documents.viewIncoming.adminInfo.documentType')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{document.typeDocument || t('documents.viewIncoming.fallback.unclassified')}</span>
              </div>

              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-0.5">{t('documents.viewIncoming.adminInfo.relatedActivity')}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {document.activity ? (
                    <span className="inline-flex items-center gap-1.5 text-[#2c5282] dark:text-blue-300 font-semibold flex-wrap">
                      <Bookmark className="h-3.5 w-3.5 shrink-0" />
                      <span>{document.activity}</span>
                      {document.dateActivity && (
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-normal tabular-nums">
                          {t('documents.viewIncoming.adminInfo.onDate', { date: formatLongDate(document.dateActivity, dateLang) })}
                        </span>
                      )}
                    </span>
                  ) : (
                    t('documents.viewIncoming.fallback.noActivity')
                  )}
                </span>
              </div>
            </div>

            <Separator className="dark:bg-slate-800" />

            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 block">
                {t('documents.viewIncoming.sender.assignedDepartments')}
              </span>
              {document.assignedTo && document.assignedTo.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {document.assignedTo.map((dept, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
                    >
                      <Users className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                      {dept.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">{t('documents.viewIncoming.sender.noDepartments')}</p>
              )}
            </div>
          </div>

          {/* Card 4: Folder Categorization & Responsible Officer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="h-4 w-4 text-[#2c5282] dark:text-blue-300 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {t('documents.viewIncoming.sidebar.folder.title')}
                  </h3>
                </div>
                {canOrganizeDocuments && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFolderDialogOpen(true)}
                    className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg shrink-0"
                  >
                    {t('documents.viewIncoming.sidebar.folder.change')}
                  </Button>
                )}
              </div>

              <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-2.5">
                <FolderTree className="h-5 w-5 text-slate-700 dark:text-slate-300 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-slate-600 dark:text-slate-300 block">{t('documents.viewIncoming.sidebar.folder.current')}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block">{folderName}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-[#2c5282] dark:text-blue-300 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {t('documents.viewIncoming.sidebar.responsible.title')}
                  </h3>
                </div>
                {canAssignOrRespond && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsResponsibleDialogOpen(true)}
                    className="h-8 px-2.5 text-xs font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg shrink-0"
                  >
                    {t('documents.viewIncoming.sidebar.responsible.assign')}
                  </Button>
                )}
              </div>

              <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0 text-sm font-bold">
                  {responsibleName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-slate-600 dark:text-slate-300 block">{t('documents.viewIncoming.sidebar.responsible.assignedTo')}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block">{responsibleName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Linked Answer / Outgoing Document */}
          {isAnswerDeleted && populatedAnswer ? (
            <div className="bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/60 rounded-xl shadow-xs p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-200/80 dark:border-amber-800/60 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                      {t('documents.viewIncoming.answer.deletedInTrashTitle')}
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      {t('documents.viewIncoming.answer.deletedInTrashSubtitle')}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700">
                  {t('documents.viewIncoming.answer.deletedInTrashBadge')}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('documents.viewIncoming.answer.outgoingNumberAndDate')}</span>
                  <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    <bdi dir="ltr">#{populatedAnswer.serialNumber} / {populatedAnswer.year}</bdi>
                    <CopyReferenceButton value={`#${populatedAnswer.serialNumber} / ${populatedAnswer.year}`} />
                  </div>
                </div>
                {populatedAnswer.issueDate && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                    {t('documents.viewIncoming.answer.issueDatePrefix', { date: formatLongDate(populatedAnswer.issueDate, dateLang) })}
                  </p>
                )}
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">{t('documents.viewIncoming.answer.subject')}</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{populatedAnswer.subject}</p>
                </div>
              </div>
            </div>
          ) : answerDocument && (
            <div className="bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl shadow-xs p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-emerald-200/80 dark:border-emerald-800/60 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                    <FileOutput className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                      {t('documents.viewIncoming.answer.title')}
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">{t('documents.viewIncoming.answer.subtitle')}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/dashboard/outgoing-documents/${answerDocument._id}`)}
                  className="h-9 px-3 text-xs sm:text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{t('documents.viewIncoming.answer.viewDetails')}</span>
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('documents.viewIncoming.answer.outgoingNumberAndDate')}</span>
                  <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    <bdi dir="ltr">#{answerDocument.serialNumber} / {answerDocument.year}</bdi>
                    <CopyReferenceButton value={`#${answerDocument.serialNumber} / ${answerDocument.year}`} />
                  </div>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                  {t('documents.viewIncoming.answer.issueDatePrefix', { date: formatLongDate(answerDocument.issueDate, dateLang) })}
                </p>
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">{t('documents.viewIncoming.answer.subject')}</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{answerDocument.subject}</p>
                </div>
              </div>
            </div>
          )}

          {/* Card 6: OCR Text & Assistant IA (if present) */}
          {document.ocrText && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {t('documents.viewIncoming.ocr.title')}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{t('documents.viewIncoming.ocr.subtitle')}</p>
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
                      <span className="text-emerald-700 dark:text-emerald-300">{t('documents.viewIncoming.ocr.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300" />
                      <span>{t('documents.viewIncoming.ocr.copy')}</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-sm leading-relaxed text-slate-800 dark:text-slate-200 max-h-60 overflow-y-auto font-sans whitespace-pre-wrap">
                {document.ocrText}
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

      {/* 3. PERSONNEL ASSOCIÉ */}
      {document && (
        <PersonnelAssociatedToDocument
          documentType="IncomingDocument"
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
