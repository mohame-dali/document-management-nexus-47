import React, { useState, useRef, useEffect } from 'react';
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
  ChevronLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

  // Dialog states
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isResponsibleDialogOpen, setIsResponsibleDialogOpen] = useState(false);

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
    data: answerDocument, 
    isLoading: isAnswerLoading 
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

  // Loading state
  if (isDocLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-[#2c5282] dark:text-blue-400 animate-spin" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('documents.viewIncoming.loading.title')}</h2>
        <p className="text-base text-slate-600 dark:text-slate-300">{t('documents.viewIncoming.loading.description')}</p>
      </div>
    );
  }

  // Error / Not Found state
  if (isDocError || !document) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-6 sm:p-8">
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-lg bg-red-50/90 dark:bg-red-950/50 border border-red-200/80 dark:border-red-800/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('documents.viewIncoming.notFound.title')}</h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('documents.viewIncoming.notFound.description')}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/dashboard/incoming-documents')}
              className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
            >
              {t('documents.viewIncoming.notFound.backButton')}
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
    : (document.folder ? t('documents.viewIncoming.fallback.specificFolder') : t('documents.viewIncoming.fallback.noFolder'));

  // Responsible user resolution
  const responsibleName: string = typeof document.responsibleUser === 'object' && document.responsibleUser
    ? document.responsibleUser.username
    : (typeof document.responsibleUser === 'string' && document.responsibleUser
        ? document.responsibleUser
        : t('documents.viewIncoming.fallback.noResponsible'));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-4">
      
      {/* Fil d'Ariane (Breadcrumbs) */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <Link to="/dashboard" className="hover:text-[#2c5282] dark:hover:text-blue-300 transition-colors">{t('documents.viewIncoming.breadcrumb.home')}</Link>
        <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-300 rtl:rotate-0 ltr:rotate-180" />
        <Link to="/dashboard/incoming-documents" className="hover:text-[#2c5282] dark:hover:text-blue-300 transition-colors">{t('documents.viewIncoming.breadcrumb.incomingDocuments')}</Link>
        <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-300 rtl:rotate-0 ltr:rotate-180" />
        <span className="text-slate-900 dark:text-slate-100 font-medium truncate max-w-md">
          {document.subject || t('documents.viewIncoming.fallback.untitled', { serialNumber: document.serialNumber })}
        </span>
      </nav>

      {/* 1. EN-TÊTE DE PAGE (Header with Navigation & Key Actions) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Navigation & Titles */}
        <div className="flex items-start sm:items-center gap-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/incoming-documents')}
            className="h-10 px-4 text-base font-semibold text-[#2c5282] dark:text-blue-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            <span>{t('documents.viewIncoming.button.backToList')}</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] dark:text-blue-300 leading-normal tabular-nums">
                {t('documents.viewIncoming.title.incomingNumber', { serialNumber: document.serialNumber })}
              </h1>
              <span className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {t('documents.viewIncoming.title.yearSuffix', { year: document.year })}
              </span>
            </div>
            <p className="text-base text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {t('documents.viewIncoming.subtitle')}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {document.scannedDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={handleScrollToPDF}
              className="h-11 px-4 text-base font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <Eye className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
              <span>{t('documents.viewIncoming.button.previewPdf')}</span>
            </Button>
          )}

          {canEdit && (
            <Button
              type="button"
              onClick={() => navigate(`/dashboard/incoming-documents/${id}/edit`)}
              className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 transition-colors duration-200"
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

      {/* 2. RÉSUMÉ EXÉCUTIF (Executive Summary Card) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
        {/* Top Badges & Status Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Serial & Year Tag */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 tabular-nums">
              <FileInput className="h-4 w-4" />
              <span>{t('documents.viewIncoming.badge.incomingNumber', { serialNumber: document.serialNumber, year: document.year })}</span>
              <CopyReferenceButton value={`#${document.serialNumber} / ${document.year}`} />
            </div>

            {/* Director Read-Only Badge */}
            {isDirector && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold bg-[#FFD758] text-[#1a202c] border border-[#FFCB56] shadow-xs">
                <Building2 className="h-4 w-4 text-[#1a202c]" />
                {t('documents.viewIncoming.badge.director')}
              </span>
            )}

            {/* Answer Status Badge */}
            {isAnswerDeleted ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-semibold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {t('documents.viewIncoming.badge.answerInTrash')}
              </span>
            ) : document.answer ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t('documents.viewIncoming.badge.processedAndReplied')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold bg-amber-50/90 dark:bg-amber-950/50 text-[#1a202c] dark:text-amber-200 border border-[#FFD758] dark:border-amber-800/60">
                <Clock className="h-4 w-4 text-[#d69e2e] dark:text-amber-400" />
                {t('documents.viewIncoming.badge.pendingProcessing')}
              </span>
            )}

            {/* Document Type Badge (Institutional Gold with Dark Text) */}
            {document.typeDocument && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-base font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
                <Bookmark className="h-4 w-4 text-[#1a202c]" />
                {document.typeDocument}
              </span>
            )}

            {/* Urgency Alert Badge if applicable */}
            {urgency && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-base font-bold ${urgency.badgeColor}`}>
                <AlertTriangle className="h-4 w-4" />
                {t('documents.viewIncoming.badge.priority', { priority: urgency.label })}
              </span>
            )}
          </div>

          {/* Registration Date Pill */}
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 tabular-nums">
            <Clock className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <span>{t('documents.viewIncoming.badge.registeredOn', { date: formatDateTime(document.createdAt, dateLang) })}</span>
          </div>
        </div>

        {/* Document Main Subject (H2 display) */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wider uppercase">
            {t('documents.viewIncoming.subject.title')}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
            {document.subject}
          </h2>
        </div>

        {/* 4 Key Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* 1. Source / Sender */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Building2 className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <span className="font-semibold">{t('documents.viewIncoming.metric.source')}</span>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate" title={document.source || t('documents.viewIncoming.fallback.unspecified')}>
              {document.source || t('documents.viewIncoming.fallback.unspecified')}
            </p>
          </div>

          {/* 2. Arrival Date */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Calendar className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <span className="font-semibold">{t('documents.viewIncoming.metric.arrivalDate')}</span>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              <bdi dir={dateDir}>{formatLongDate(document.arrivalDate, dateLang)}</bdi>
            </p>
          </div>

          {/* 3. Original Correspondence */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Hash className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <span className="font-semibold">{t('documents.viewIncoming.metric.originalCorrespondence')}</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap tabular-nums">
              {document.correspondenceNumber ? (
                <>
                  <span><bdi dir="ltr">#{document.correspondenceNumber}</bdi></span>
                  <CopyReferenceButton value={document.correspondenceNumber} />
                  {document.correspondenceDate && (
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-normal me-1.5 tabular-nums">
                      (<bdi dir={dateDir}>{formatLongDate(document.correspondenceDate, dateLang)}</bdi>)
                    </span>
                  )}
                </>
              ) : (
                t('documents.viewIncoming.fallback.notRecorded')
              )}
            </div>
          </div>

          {/* 4. Responsible Officer */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <User className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <span className="font-semibold">{t('documents.viewIncoming.metric.responsible')}</span>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('documents.viewIncoming.adminInfo.sectionTitle')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-base">
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.adminInfo.internalSerial')}</span>
                <div className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  <bdi dir="ltr">#{document.serialNumber} / {document.year}</bdi>
                  <CopyReferenceButton value={`#${document.serialNumber} / ${document.year}`} />
                </div>
              </div>

              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.adminInfo.arrivalDateAtInstitution')}</span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100 tabular-nums"><bdi dir={dateDir}>{formatLongDate(document.arrivalDate, dateLang)}</bdi></span>
              </div>

              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.adminInfo.senderCorrespondenceNumber')}</span>
                <div className="inline-flex items-center gap-1.5 text-base font-medium text-slate-900 dark:text-slate-100 tabular-nums">
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
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.adminInfo.originalIssueDate')}</span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  {document.correspondenceDate ? <bdi dir={dateDir}>{formatLongDate(document.correspondenceDate, dateLang)}</bdi> : t('documents.viewIncoming.fallback.unspecified')}
                </span>
              </div>

              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.adminInfo.documentType')}</span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100">{document.typeDocument || t('documents.viewIncoming.fallback.unclassified')}</span>
              </div>

              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.adminInfo.relatedActivity')}</span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100">
                  {document.activity ? (
                    <span className="inline-flex items-center gap-1.5 text-[#2c5282] dark:text-blue-300 font-semibold">
                      <Bookmark className="h-4 w-4" />
                      {document.activity}
                      {document.dateActivity && (
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-normal tabular-nums">
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
          </div>

          {/* Section: Sender & Target Departments */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('documents.viewIncoming.sender.sectionTitle')}
              </h3>
            </div>

            <div className="space-y-4 text-base">
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.sender.sourceLabel')}</span>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {document.source || t('documents.viewIncoming.fallback.unspecified')}
                </p>
              </div>

              <Separator className="dark:bg-slate-800" />

              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">{t('documents.viewIncoming.sender.assignedDepartments')}</span>
                {document.assignedTo && document.assignedTo.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {document.assignedTo.map((dept, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
                      >
                        <Users className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                        {dept.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-base text-slate-700 dark:text-slate-300">{t('documents.viewIncoming.sender.noDepartments')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: OCR Text (if present) */}
          {document.ocrText && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {t('documents.viewIncoming.ocr.title')}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{t('documents.viewIncoming.ocr.subtitle')}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyOcr}
                  className="h-10 px-3 text-sm font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
                >
                  {isCopiedOcr ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-300">{t('documents.viewIncoming.ocr.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                      <span>{t('documents.viewIncoming.ocr.copy')}</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-base leading-relaxed text-slate-800 dark:text-slate-200 max-h-72 overflow-y-auto font-sans whitespace-pre-wrap">
                {document.ocrText}
              </div>
            </div>
          )}

          {/* Section: Assistant IA (Résumé automatique + Traduction AR ↔ FR) */}
          {document.ocrText && (
            <DocumentAIAssistant
              ocrText={document.ocrText}
              documentId={document._id}
              documentTitle={document.subject}
            />
          )}

          {/* Section: Linked Answer / Outgoing Document */}
          {isAnswerDeleted && populatedAnswer ? (
            <div className="bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/60 rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-amber-200/80 dark:border-amber-800/60 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-900 dark:text-amber-200">
                      {t('documents.viewIncoming.answer.deletedInTrashTitle')}
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      {t('documents.viewIncoming.answer.deletedInTrashSubtitle')}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700">
                  {t('documents.viewIncoming.answer.deletedInTrashBadge')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-base">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.answer.outgoingNumberAndDate')}</span>
                  <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    <bdi dir="ltr">#{populatedAnswer.serialNumber} / {populatedAnswer.year}</bdi>
                    <CopyReferenceButton value={`#${populatedAnswer.serialNumber} / ${populatedAnswer.year}`} />
                  </div>
                  {populatedAnswer.issueDate && (
                    <span className="text-xs text-slate-700 dark:text-slate-300 me-1.5 block tabular-nums">
                      {t('documents.viewIncoming.answer.issueDatePrefix', { date: formatLongDate(populatedAnswer.issueDate, dateLang) })}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.answer.subject')}</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                    {populatedAnswer.subject}
                  </p>
                </div>
              </div>
            </div>
          ) : answerDocument && (
            <div className="bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80 dark:border-emerald-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                    <FileOutput className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-200">
                      {t('documents.viewIncoming.answer.title')}
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">{t('documents.viewIncoming.answer.subtitle')}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/dashboard/outgoing-documents/${answerDocument._id}`)}
                  className="h-9 px-3.5 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  <span>{t('documents.viewIncoming.answer.viewDetails')}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-base">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.answer.outgoingNumberAndDate')}</span>
                  <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    <bdi dir="ltr">#{answerDocument.serialNumber} / {answerDocument.year}</bdi>
                    <CopyReferenceButton value={`#${answerDocument.serialNumber} / ${answerDocument.year}`} />
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 me-1.5 block tabular-nums">
                    {t('documents.viewIncoming.answer.issueDatePrefix', { date: formatLongDate(answerDocument.issueDate, dateLang) })}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('documents.viewIncoming.answer.subject')}</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('documents.viewIncoming.sidebar.folder.title')}</h3>
              </div>
              {canOrganizeDocuments && (
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  onClick={() => setIsFolderDialogOpen(true)}
                  className="h-10 px-3 text-sm font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  {t('documents.viewIncoming.sidebar.folder.change')}
                </Button>
              )}
            </div>

            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-3">
              <FolderTree className="h-6 w-6 text-slate-700 dark:text-slate-300 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-700 dark:text-slate-300 block">{t('documents.viewIncoming.sidebar.folder.current')}</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">{folderName}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {t('documents.viewIncoming.sidebar.folder.description')}
            </p>
          </div>

          {/* Card: Responsible Officer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('documents.viewIncoming.sidebar.responsible.title')}</h3>
              </div>
              {canAssignOrRespond && (
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  onClick={() => setIsResponsibleDialogOpen(true)}
                  className="h-10 px-3 text-sm font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  {t('documents.viewIncoming.sidebar.responsible.assign')}
                </Button>
              )}
            </div>

            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center flex-shrink-0 font-bold">
                {responsibleName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-xs text-slate-700 dark:text-slate-300 block">{t('documents.viewIncoming.sidebar.responsible.assignedTo')}</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">{responsibleName}</span>
              </div>
            </div>
          </div>

          {/* Card: Document Stats & Timeline Highlights */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <History className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('documents.viewIncoming.sidebar.summary.title')}</h3>
            </div>

            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">{t('documents.viewIncoming.sidebar.summary.arrivalRegistration')}</span>
                  <span className="tabular-nums"><bdi dir={dateDir}>{formatLongDate(document.arrivalDate, dateLang)}</bdi></span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${document.responsibleUser ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`} />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">{t('documents.viewIncoming.sidebar.summary.responsibleAssignment')}</span>
                  <span>{document.responsibleUser ? responsibleName : t('documents.viewIncoming.sidebar.summary.pending')}</span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2
                  className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    isAnswerDeleted
                      ? 'text-amber-500'
                      : document.answer
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300'
                  }`}
                />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">{t('documents.viewIncoming.sidebar.summary.outgoingAnswer')}</span>
                  <span>
                    {isAnswerDeleted
                      ? t('documents.viewIncoming.sidebar.summary.answerInTrash')
                      : document.answer
                        ? t('documents.viewIncoming.sidebar.summary.answerReady')
                        : t('documents.viewIncoming.sidebar.summary.noAnswerYet')}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. PIÈCES JOINTES ET VISUALISATION PDF (Attachments & PDF Viewer) */}
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
            : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6'
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#ebf4ff] dark:bg-blue-950/50 border border-[#bee3f8] dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c] dark:text-slate-100">
                {t('documents.viewIncoming.attachments.title')}
              </h2>
              <p className="text-base text-slate-700 dark:text-slate-300">
                {t('documents.viewIncoming.attachments.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Tabs (if dual preview exists) */}
            {document.scannedDocument && answerDocument?.scannedDocument && (
              <div className="inline-flex items-center border border-[#cbd5e1] dark:border-slate-700 rounded bg-white dark:bg-slate-900 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPreviewTab('incoming')}
                  className={`h-9 px-3 text-sm font-semibold transition-colors duration-200 ${
                    previewTab === 'incoming' ? 'bg-[#2c5282] text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {t('documents.viewIncoming.viewer.tab.incoming')}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('answer')}
                  className={`h-9 px-3 text-sm font-semibold border-s border-[#cbd5e1] dark:border-slate-700 transition-colors duration-200 ${
                    previewTab === 'answer' ? 'bg-[#2c5282] text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {t('documents.viewIncoming.viewer.tab.answer')}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('split')}
                  className={`h-9 px-3 text-sm font-semibold border-s border-[#cbd5e1] dark:border-slate-700 transition-colors duration-200 ${
                    previewTab === 'split' ? 'bg-[#2c5282] text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {t('documents.viewIncoming.viewer.tab.split')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PDF Content Display */}
        {document.scannedDocument || answerDocument?.scannedDocument ? (
          <div className="space-y-4">
            {/* Expandable PDF Preview Toolbar */}
            {(() => {
              const activePdfPath =
                previewTab === 'answer' && answerDocument?.scannedDocument
                  ? answerDocument.scannedDocument
                  : document.scannedDocument || answerDocument?.scannedDocument || '';

              return (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPdfExpanded((prev) => !prev)}
                      className="h-9 px-3 text-xs sm:text-sm font-semibold border-slate-300 dark:border-slate-600 text-[#2c5282] dark:text-blue-200 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md flex items-center gap-1.5"
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
                        className="h-9 px-3 text-xs sm:text-sm font-semibold border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
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

            {/* Split View for Dual Preview */}
            {previewTab === 'split' && document.scannedDocument && answerDocument?.scannedDocument ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left (Incoming) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded">
                    <div className="flex items-center gap-2">
                      <FileInput className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                      <span className="text-base font-bold text-[#1a202c] dark:text-slate-100">{t('documents.viewIncoming.viewer.label.originalIncoming')}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="h-10 px-3 text-xs font-semibold text-[#2c5282] dark:text-blue-200 border-[#cbd5e1] dark:border-slate-700"
                    >
                      <Download className="h-3.5 w-3.5 me-1" />
                      {t('documents.viewIncoming.viewer.button.download')}
                    </Button>
                  </div>
                  <div className="border border-[#e2e8f0] dark:border-slate-800 rounded overflow-hidden min-h-[500px]">
                    <PDFViewer documentPath={document.scannedDocument} expanded={isPdfExpanded} />
                  </div>
                </div>

                {/* Right (Outgoing Answer) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded">
                    <div className="flex items-center gap-2">
                      <FileOutput className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      <span className="text-base font-bold text-emerald-900 dark:text-emerald-200">{t('documents.viewIncoming.viewer.label.outgoingAnswer')}</span>
                    </div>
                    {answerDocument.scannedDocument && (
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={() => downloadDocument(answerDocument.scannedDocument!, `answer-${answerDocument.serialNumber}.pdf`)}
                        className="h-10 px-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200 border-[#cbd5e1] dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded flex items-center gap-1.5"
                      >
                        <Download className="h-4 w-4" />
                        <span>{t('documents.viewIncoming.viewer.button.download')}</span>
                      </Button>
                    )}
                  </div>
                  <div className="border border-[#e2e8f0] dark:border-slate-800 rounded overflow-hidden min-h-[500px]">
                    <PDFViewer documentPath={answerDocument.scannedDocument} expanded={isPdfExpanded} />
                  </div>
                </div>
              </div>
            ) : previewTab === 'answer' && answerDocument?.scannedDocument ? (
              /* Answer Document Viewer */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded">
                  <div className="flex items-center gap-2">
                    <FileOutput className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    <span className="text-base font-bold text-[#1a202c] dark:text-slate-100">
                      {t('documents.viewIncoming.viewer.label.answerAttachment', { serialNumber: answerDocument.serialNumber, year: answerDocument.year })}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(answerDocument.scannedDocument!, `answer-${answerDocument.serialNumber}.pdf`)}
                    className="h-9 px-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200 border-[#cbd5e1] dark:border-slate-700"
                  >
                    <Download className="h-4 w-4 me-1.5" />
                    {t('documents.viewIncoming.viewer.button.downloadPdf')}
                  </Button>
                </div>
                <div className="border border-[#e2e8f0] dark:border-slate-800 rounded overflow-hidden min-h-[600px]">
                  <PDFViewer documentPath={answerDocument.scannedDocument} expanded={isPdfExpanded} />
                </div>
              </div>
            ) : document.scannedDocument ? (
              /* Incoming Document Single Viewer */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded">
                  <div className="flex items-center gap-2">
                    <FileInput className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
                    <span className="text-base font-bold text-[#1a202c] dark:text-slate-100">
                      {t('documents.viewIncoming.viewer.label.incomingAttachment', { serialNumber: document.serialNumber, year: document.year })}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="h-10 px-3 text-sm font-semibold text-[#2c5282] dark:text-blue-200 border-[#cbd5e1] dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4 me-1.5" />
                    {t('documents.viewIncoming.viewer.button.downloadPdf')}
                  </Button>
                </div>
                <div className="border border-[#e2e8f0] dark:border-slate-800 rounded overflow-hidden min-h-[600px]">
                  <PDFViewer documentPath={document.scannedDocument} expanded={isPdfExpanded} />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* Empty Attachments State */
          <div className="p-8 sm:p-12 text-center bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 rounded-lg space-y-3">
            <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-700 dark:text-slate-300">
              <Paperclip className="h-7 w-7 text-slate-700 dark:text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('documents.viewIncoming.attachments.empty.title')}</h3>
            <p className="text-base text-slate-700 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {t('documents.viewIncoming.attachments.empty.description')}
            </p>
            {canEdit && (
              <Button
                type="button"
                onClick={() => navigate(`/dashboard/incoming-documents/${id}/edit`)}
                className="h-10 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
              >
                {t('documents.viewIncoming.attachments.empty.attachButton')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 5. ACTIONS DISPONIBLES (Dedicated Administrative Actions Bar) */}
      <div ref={actionsSectionRef} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-4">
        <div className="pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('documents.viewIncoming.actions.title')}
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 mt-0.5">
            {t('documents.viewIncoming.actions.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          {/* Action 1: Preview PDF */}
          {document.scannedDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={handleScrollToPDF}
              className="h-11 px-5 text-base font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <Eye className="h-4 w-4" />
              <span>{t('documents.viewIncoming.actions.previewPdf')}</span>
            </Button>
          )}

          {/* Action 2: Process / Reply */}
          {canAssignOrRespond && (
            <Button
              type="button"
              onClick={() => setIsResponseDialogOpen(true)}
              className="h-11 px-5 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <MessageSquare className="h-4 w-4 text-[#1a202c]" />
              <span>{document.answer ? t('documents.viewIncoming.actions.editOrReplaceAnswer') : t('documents.viewIncoming.actions.processAndReply')}</span>
            </Button>
          )}

          {/* Action 3: Archive in folder */}
          {canOrganizeDocuments && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFolderDialogOpen(true)}
              className="h-11 px-5 text-base font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <FolderOpen className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              <span>{t('documents.viewIncoming.actions.archiveInFolder')}</span>
            </Button>
          )}

          {/* Action 4: Transfer / Assign responsible */}
          {canAssignOrRespond && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResponsibleDialogOpen(true)}
              className="h-11 px-5 text-base font-semibold text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60 bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <UserPlus className="h-4 w-4 text-purple-700 dark:text-purple-300" />
              <span>{t('documents.viewIncoming.actions.assignResponsible')}</span>
            </Button>
          )}

          {/* Action 5: Return to list */}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/incoming-documents')}
            className="h-11 px-5 text-base font-medium text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200 ms-auto"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            <span>{t('documents.viewIncoming.actions.backToList')}</span>
          </Button>
        </div>
      </div>

      {/* 5.5 PERSONNEL ASSOCIÉ */}
      {document && (
        <PersonnelAssociatedToDocument
          documentType="IncomingDocument"
          documentId={document._id}
          document={document}
        />
      )}

      {/* 6. HISTORIQUE DE TRAITEMENT (Processing History & Audit Trail) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
        <div className="pb-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('documents.viewIncoming.timeline.title')}
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-300">
                {t('documents.viewIncoming.timeline.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        {auditTimeline.length > 0 ? (
          <div className="relative border-s border-slate-300 dark:border-slate-700 ps-6 ms-3 space-y-6">
            {auditTimeline.map((item, index) => (
              <div key={item._id || index} className="relative group">
                <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white dark:border-slate-900" />
                <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {item.action || t('documents.viewIncoming.timeline.fallback.action')}
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium tabular-nums">
                      <bdi dir={dateDir}>{formatDateTime(item.createdAt, dateLang)}</bdi>
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('documents.viewIncoming.timeline.performedBy')} <span className="font-semibold text-slate-900 dark:text-slate-100">{item.userDetails?.username || t('documents.viewIncoming.timeline.fallback.systemUser')}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Institutional Lifecycle Fallback Timeline */
          <div className="relative border-s border-slate-300 dark:border-slate-700 ps-6 ms-3 space-y-6">
            {/* Step 1: Document Arrival / Registration */}
            <div className="relative">
              <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white dark:border-slate-900" />
              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {t('documents.viewIncoming.timeline.lifecycle.step1.title')}
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium tabular-nums">
                    <bdi dir={dateDir}>{formatDateTime(document.createdAt || document.arrivalDate, dateLang)}</bdi>
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t('documents.viewIncoming.timeline.lifecycle.step1.description', {
                    serialNumber: document.serialNumber,
                    year: document.year,
                    source: document.source || t('documents.viewIncoming.fallback.unspecified')
                  })}
                </p>
              </div>
            </div>

            {/* Step 2: Department Assignment */}
            {document.assignedTo && document.assignedTo.length > 0 && (
              <div className="relative">
                <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white dark:border-slate-900" />
                <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 block">
                    {t('documents.viewIncoming.timeline.lifecycle.step2.title')}
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('documents.viewIncoming.timeline.lifecycle.step2.description', {
                      departments: document.assignedTo.map(d => d.name).join(listSeparator)
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Responsible Officer Assignment */}
            {document.responsibleUser && (
              <div className="relative">
                <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white dark:border-slate-900" />
                <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 block">
                    {t('documents.viewIncoming.timeline.lifecycle.step3.title')}
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('documents.viewIncoming.timeline.lifecycle.step3.description', {
                      name: responsibleName
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Folder Categorization */}
            {document.folder && (
              <div className="relative">
                <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white dark:border-slate-900" />
                <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 block">
                    {t('documents.viewIncoming.timeline.lifecycle.step4.title')}
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('documents.viewIncoming.timeline.lifecycle.step4.description', {
                      folder: folderName
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Answer / Processing Completion */}
            {document.answer && (
              <div className="relative">
                <div
                  className={`absolute -start-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                    isAnswerDeleted ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                />
                <div
                  className={`rounded-lg p-4 space-y-1 border ${
                    isAnswerDeleted
                      ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-base font-bold ${isAnswerDeleted ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-900 dark:text-emerald-200'}`}>
                      {isAnswerDeleted
                        ? t('documents.viewIncoming.answer.deletedInTrashTitle')
                        : t('documents.viewIncoming.timeline.lifecycle.step5.title')}
                    </span>
                    {!isAnswerDeleted && answerDocument?.issueDate && (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                        <bdi dir={dateDir}>{formatLongDate(answerDocument.issueDate, dateLang)}</bdi>
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isAnswerDeleted ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                    {isAnswerDeleted
                      ? t('documents.viewIncoming.answer.deletedInTrashSubtitle')
                      : t('documents.viewIncoming.timeline.lifecycle.step5.description', {
                          serialNumber: answerDocument ? answerDocument.serialNumber : (populatedAnswer?.serialNumber || ''),
                          year: answerDocument ? answerDocument.year : (populatedAnswer?.year || '')
                        })}
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
