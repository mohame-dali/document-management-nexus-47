import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  ChevronLeft,
  Maximize2,
  Minimize2
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
import { formatLongDate, formatDateTime } from '@/utils/formatDate';
import { OutgoingDocument, IncomingDocument } from '@/types';

import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import PDFViewer from '@/components/documents/PDFViewer';
import CopyReferenceButton from '@/components/documents/CopyReferenceButton';
import ScrollToTop from '@/components/common/ScrollToTop';
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

  // Dialog states
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  // User role permissions
  const isDirector = currentUser?.role === 'Director';
  const isAdmin = currentUser?.role === 'Admin';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdminDepartment = currentUser?.role === 'AdminDepartment';

  const canEdit = isAdminTuningDesk || isAdmin;
  const canDelete = isAdminTuningDesk || isAdmin;
  const canOrganizeDocuments = isAdminDepartment || isAdmin;

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
    data: referenceDocument, 
    isLoading: isRefLoading 
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

  // Loading state
  if (isDocLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-[#2c5282] animate-spin" />
        <h2 className="text-xl font-bold text-[#1a202c]">{t('documents.viewOutgoing.loading.title')}</h2>
        <p className="text-base text-[#4a5568]">{t('documents.viewOutgoing.loading.description')}</p>
      </div>
    );
  }

  // Error / Not Found state
  if (isDocError || !document) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8">
        <div className="max-w-xl mx-auto bg-white border border-[#e2e8f0] rounded p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('documents.viewOutgoing.notFound.title')}</h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('documents.viewOutgoing.notFound.description')}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/dashboard/outgoing-documents')}
              className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
            >
              {t('documents.viewOutgoing.notFound.backButton')}
            </Button>
          </div>
        </div>
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-4">
      
      {/* Fil d'Ariane (Breadcrumbs) */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 print:hidden">
        <Link to="/dashboard" className="hover:text-[#2c5282] dark:hover:text-blue-300 transition-colors">{t('documents.viewOutgoing.breadcrumb.home')}</Link>
        <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 rtl:rotate-0 ltr:rotate-180" />
        <Link to="/dashboard/outgoing-documents" className="hover:text-[#2c5282] dark:hover:text-blue-300 transition-colors">{t('documents.viewOutgoing.breadcrumb.outgoingDocuments')}</Link>
        <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 rtl:rotate-0 ltr:rotate-180" />
        <span className="text-slate-900 dark:text-slate-100 font-medium truncate max-w-md">
          {document.subject || t('documents.viewOutgoing.fallback.untitled', { serialNumber: document.serialNumber })}
        </span>
      </nav>

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
            <p className="text-xs text-gray-500">{t('documents.viewOutgoing.print.visa.stampAndSignature')}</p>
          </div>
          <div className="w-1/3">
            <p className="font-bold mb-12">{t('documents.viewOutgoing.print.visa.registryOffice')}</p>
            <p className="text-xs text-gray-500">{t('documents.viewOutgoing.print.visa.visaAndDate')}</p>
          </div>
        </div>
      </div>

      {/* 1. EN-TÊTE DE PAGE (Header with Navigation & Key Actions) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        {/* Left in RTL: Back button + Title */}
        <div className="flex items-start sm:items-center gap-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/outgoing-documents')}
            className="h-10 px-4 text-base font-semibold text-[#2c5282] dark:text-blue-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            <span>{t('documents.viewOutgoing.button.backToList')}</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] dark:text-blue-300 leading-normal tabular-nums">
                {t('documents.viewOutgoing.title.outgoingNumber', { serialNumber: document.serialNumber })}
              </h1>
              <span className="text-base font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                {t('documents.viewOutgoing.title.yearSuffix', { year: document.year })}
              </span>
            </div>
            <p className="text-base text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {t('documents.viewOutgoing.subtitle')}
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
              className="h-11 px-4 text-base font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <Eye className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
              <span>{t('documents.viewOutgoing.button.previewPdf')}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handlePrintFiche}
            className="h-11 px-4 text-base font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200"
          >
            <Printer className="h-4 w-4" />
            <span>{t('documents.viewOutgoing.button.printCard')}</span>
          </Button>

          {canEdit && (
            <Button
              type="button"
              onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
              className="h-11 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 transition-colors duration-200"
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

      {/* 2. RÉSUMÉ EXÉCUTIF (Executive Summary Card) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6 print:hidden">
        {/* Top Badges & Status Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Serial & Year Tag */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 tabular-nums">
              <FileOutput className="h-4 w-4" />
              <span>{t('documents.viewOutgoing.badge.outgoingNumber', { serialNumber: document.serialNumber, year: document.year })}</span>
              <CopyReferenceButton value={`#${document.serialNumber} / ${document.year}`} />
            </div>

            {/* Director Read-Only Badge */}
            {isDirector && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold bg-[#FFD758] text-[#1a202c] border border-[#FFCB56] shadow-xs">
                <Building2 className="h-4 w-4 text-[#1a202c]" />
                {t('documents.viewOutgoing.badge.director')}
              </span>
            )}

            {/* Document Type Badge (Institutional Gold with Dark Text) */}
            {document.typeDocument && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
                <Bookmark className="h-4 w-4 text-[#1a202c]" />
                {document.typeDocument}
              </span>
            )}

            {/* Reference Status Badge */}
            {isReferenceDeleted && populatedReference ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-semibold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {t('documents.viewOutgoing.badge.referenceInTrash', { serialNumber: populatedReference.serialNumber, year: populatedReference.year })}
              </span>
            ) : referenceDocument ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t('documents.viewOutgoing.badge.replyToIncoming', { serialNumber: referenceDocument.serialNumber, year: referenceDocument.year })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-semibold bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                <FileOutput className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                {t('documents.viewOutgoing.badge.initialOutgoing')}
              </span>
            )}

            {/* Folder Status Badge */}
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-medium bg-slate-50/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
              <FolderOpen className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              {folderName}
            </span>
          </div>

          {/* Issue Date Pill */}
          <div className="inline-flex items-center gap-2 text-base font-semibold text-[#2c5282] dark:text-blue-300 bg-slate-50/90 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 tabular-nums">
            <Calendar className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
            <span>{t('documents.viewOutgoing.badge.issueDate')} <bdi dir={dateDir}>{formatLongDate(document.issueDate, dateLang)}</bdi></span>
          </div>
        </div>

        {/* Document Subject Callout Box */}
        <div className="bg-slate-50/80 dark:bg-slate-800/60 border-s-4 border-[#2c5282] dark:border-s-blue-500 border-y border-e border-slate-200/80 dark:border-slate-700/80 rounded-lg p-5 sm:p-6 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('documents.viewOutgoing.subject.title')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopySerial}
                className="h-10 px-3 text-xs font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1"
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
                className="h-10 px-3 text-xs font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1"
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
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
            {document.subject}
          </p>
        </div>

        {/* Executive Metrics Bar (Grid 4 items) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Metric 1: Source */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">{t('documents.viewOutgoing.metric.issuingService')}</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate block" title={sourceName}>
                {sourceName}
              </span>
            </div>
          </div>

          {/* Metric 2: Issue Date */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">{t('documents.viewOutgoing.metric.actualIssueDate')}</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                <bdi dir={dateDir}>{formatLongDate(document.issueDate, dateLang)}</bdi>
              </span>
            </div>
          </div>

          {/* Metric 3: Assigned Destinations Count */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">{t('documents.viewOutgoing.metric.recipients')}</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                {assignedCount > 0 ? t('documents.viewOutgoing.metric.recipientsCount', { count: assignedCount }) : t('documents.viewOutgoing.fallback.unspecified')}
              </span>
            </div>
          </div>

          {/* Metric 4: Pour Info Copies */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200/70 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">{t('documents.viewOutgoing.metric.pourInfo')}</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                {pourInfoCount > 0 ? t('documents.viewOutgoing.metric.pourInfoCount', { count: pourInfoCount }) : t('documents.viewOutgoing.metric.noCopies')}
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
                <Hash className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                بيانات الإصدار والتوثيق الإداري
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-base">
              <div>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1">رقم القيد الصادر:</span>
                <div className="inline-flex items-center gap-1.5 text-base font-bold text-[#2c5282] dark:text-blue-300 tabular-nums">
                  <span>
                    <bdi dir="ltr">#{document.serialNumber}</bdi> لسنة <bdi dir="ltr">{document.year}</bdi>
                  </span>
                  <CopyReferenceButton value={`#${document.serialNumber} / ${document.year}`} />
                </div>
              </div>

              <div>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1">تاريخ الإصدار / الإرسال:</span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  <bdi dir={dateDir}>{formatLongDate(document.issueDate, dateLang)}</bdi>
                </span>
              </div>

              <div>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1">نوع الوثيقة:</span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100">
                  {document.typeDocument || 'غير مصنف'}
                </span>
              </div>

              <div>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1">تاريخ الإنشاء والتسجيل بالمنظومة:</span>
                <span className="text-base font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                  <bdi dir={dateDir}>{formatDateTime(document.createdAt, dateLang)}</bdi>
                </span>
              </div>

              <div className="md:col-span-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1">المصلحة / القسم المصدر:</span>
                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">{sourceName}</span>
                  {sourceId && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">معرّف المصلحة: <bdi dir="ltr">{String(sourceId)}</bdi></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Destinations (Assigned To) & Notification (Pour Info) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
                <Share2 className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                جهات التوجيه والتوزيع الإداري
              </h2>
            </div>

            <div className="space-y-5 text-base">
              {/* Primary Destinations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                    الجهات الموجه إليها (المستلمون الأساسيون):
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                    <bdi dir="ltr">{assignedCount}</bdi> جهة
                  </span>
                </div>

                {document.assignedTo && document.assignedTo.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {document.assignedTo.map((dept, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-sm font-semibold bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60"
                      >
                        <Building2 className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                        {dept}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-sm">
                    لم يتم تحديد جهات توجيه أساسية لهذه الوثيقة
                  </div>
                )}
              </div>

              <Separator className="dark:bg-slate-800" />

              {/* Pour Info (Cc) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    نسخ للإعلام والإطلاع (Pour Information):
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                    <bdi dir="ltr">{pourInfoCount}</bdi> جهة
                  </span>
                </div>

                {document.pourInfo && document.pourInfo.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {document.pourInfo.map((info, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-sm font-semibold bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/60"
                      >
                        <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        {info}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-sm">
                    لا توجد نسخ محددة للإعلام مع هذه المراسلة
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: OCR Extracted Text (if present) */}
          {document.ocrText && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      النص المستخرج آلياً (OCR)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">تم التعرف على النص عبر خوارزميات المسح الضوئي</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
                        <span className="text-emerald-700 dark:text-emerald-300">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
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
                  className="w-full h-10 px-3 ps-9 text-sm border border-slate-300 dark:border-slate-700 focus:border-[#2c5282] rounded-lg bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none"
                />
                <FileSearch className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute top-3 start-3" />
                {ocrSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setOcrSearchQuery('')}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 absolute top-2.5 end-3 font-semibold"
                  >
                    مسح
                  </button>
                )}
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 max-h-72 overflow-y-auto">
                <p className="text-base text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                  {document.ocrText}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 tabular-nums">
                <span>عدد الكلمات التقريبي: <bdi dir="ltr">{document.ocrText.trim().split(/\s+/).length}</bdi> كلمة</span>
                <span>الحروف: <bdi dir="ltr">{document.ocrText.length}</bdi> حرف</span>
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

        </div>

        {/* Right Column (1 Col wide on lg): Reference Link, Folder, Timeline Summary */}
        <div className="space-y-6">

          {/* Card: Linked Reference Document (الوارد المرجعي) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileInput className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">الوثيقة الواردة المرجعية</h3>
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
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/60 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>{t('documents.viewOutgoing.referenceCard.inTrashTitle')}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">رقم القيد الوارد:</span>
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      <bdi dir="ltr">#{populatedReference.serialNumber} / {populatedReference.year}</bdi>
                      <CopyReferenceButton value={`#${populatedReference.serialNumber} / ${populatedReference.year}`} />
                    </div>
                  </div>

                  {populatedReference.subject && (
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">موضوع الوارد:</span>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {populatedReference.subject}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed pt-1 border-t border-amber-200/80 dark:border-amber-800/60">
                    {t('documents.viewOutgoing.referenceCard.inTrashMessage')}
                  </p>
                </div>
              </div>
            ) : referenceDocument ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">رقم القيد الوارد:</span>
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2c5282] dark:text-blue-300 tabular-nums">
                      <bdi dir="ltr">#{referenceDocument.serialNumber} / {referenceDocument.year}</bdi>
                      <CopyReferenceButton value={`#${referenceDocument.serialNumber} / ${referenceDocument.year}`} />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">موضوع الوارد:</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                      {referenceDocument.subject}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/80 dark:border-slate-700/80 tabular-nums">
                    <span>تاريخ الوصول:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums"><bdi dir={dateDir}>{formatLongDate(referenceDocument.arrivalDate, dateLang)}</bdi></span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/incoming-documents/${referenceDocument._id}`)}
                  className="w-full h-10 text-base font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
                >
                  <span>عرض بطاقة الوثيقة الواردة</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center space-y-2">
                <FileOutput className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto opacity-70" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-200">مراسلة صادرة ابتدائية</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  هذه الوثيقة غير مرتبطة بوارد سابق، وصدرت مباشرة بمبادرة إدارية من المصلحة المصدرة.
                </p>
              </div>
            )}
          </div>

          {/* Card: Folder Classification (التصنيف الأرشيفي) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">التصنيف الأرشيفي</h3>
              </div>
              {canOrganizeDocuments && (
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  onClick={() => setIsFolderDialogOpen(true)}
                  className="h-10 px-3 text-sm font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  تعديل
                </Button>
              )}
            </div>

            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg flex items-center gap-3">
              <FolderTree className="h-6 w-6 text-slate-500 dark:text-slate-400 flex-shrink-0" />
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">المجلد الحالي:</span>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">{folderName}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              تصنيف الوثيقة داخل مجلد يضمن سهولة الفهرسة والبحث والرجوع المستقبلي للوثائق المشتركة.
            </p>
          </div>

          {/* Card: Summary of Administrative Steps */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <History className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">ملخص مسار الوثيقة</h3>
            </div>

            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">تسجيل الإصدار:</span>
                  <span className="tabular-nums"><bdi dir={dateDir}>{formatLongDate(document.issueDate, dateLang)}</bdi></span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${assignedCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">تحديد الموجه إليهم:</span>
                  <span className="tabular-nums">{assignedCount > 0 ? <><bdi dir="ltr">{assignedCount}</bdi> جهة</> : 'غير محدد'}</span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${document.folder ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">الأرشفة في مجلد:</span>
                  <span>{document.folder ? folderName : 'لم تؤرشف بعد'}</span>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${document.scannedDocument ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">المسح الضوئي (PDF):</span>
                  <span>{document.scannedDocument ? 'مرفق وممسوح ضوئياً' : 'غير مرفق'}</span>
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
            ? 'fixed inset-3 sm:inset-5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 space-y-4 overflow-y-auto print:hidden'
            : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6 print:hidden'
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#ebf4ff] dark:bg-blue-950/50 border border-[#bee3f8] dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c] dark:text-slate-100">
                الوثائق المرفقة والممسوحة ضوئياً
              </h2>
              <p className="text-base text-[#4a5568] dark:text-slate-300">
                معاينة مستندات PDF المرفقة مع إمكانية التحميل والطباعة المباشرة
              </p>
            </div>
          </div>

          {/* View Mode Tabs (if dual preview exists with reference) */}
          {document.scannedDocument && referenceDocument?.scannedDocument && (
            <div className="inline-flex items-center border border-[#cbd5e1] dark:border-slate-700 rounded bg-white dark:bg-slate-900 overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewTab('outgoing')}
                className={`h-9 px-3 text-sm font-semibold transition-colors duration-200 ${
                  previewTab === 'outgoing' ? 'bg-[#2c5282] text-white' : 'text-[#4a5568] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                الوثيقة الصادرة
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('reference')}
                className={`h-9 px-3 text-sm font-semibold border-s border-[#cbd5e1] dark:border-slate-700 transition-colors duration-200 ${
                  previewTab === 'reference' ? 'bg-[#2c5282] text-white' : 'text-[#4a5568] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                الوارد المرجعي
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('split')}
                className={`h-9 px-3 text-sm font-semibold border-s border-[#cbd5e1] dark:border-slate-700 transition-colors duration-200 ${
                  previewTab === 'split' ? 'bg-[#2c5282] text-white' : 'text-[#4a5568] dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                عرض مقارن جنباً إلى جنب
              </button>
            </div>
          )}
        </div>

        {/* PDF Content Display */}
        {document.scannedDocument || referenceDocument?.scannedDocument ? (
          <div className="space-y-4">
            {/* Expandable PDF Preview Toolbar */}
            {(() => {
              const activePdfPath =
                previewTab === 'reference' && referenceDocument?.scannedDocument
                  ? referenceDocument.scannedDocument
                  : document.scannedDocument || referenceDocument?.scannedDocument || '';

              return (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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
            {previewTab === 'split' && document.scannedDocument && referenceDocument?.scannedDocument ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Right in RTL (Outgoing) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded">
                    <div className="flex items-center gap-2">
                      <FileOutput className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                      <span className="text-base font-bold text-[#1a202c] dark:text-slate-100">الوثيقة الصادرة الحالية</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="h-10 px-3 text-xs font-semibold text-[#2c5282] dark:text-blue-200 border-[#cbd5e1] dark:border-slate-700"
                    >
                      <Download className="h-3.5 w-3.5 me-1" />
                      تحميل
                    </Button>
                  </div>
                  <div className="border border-[#cbd5e1] dark:border-slate-800 rounded bg-[#f8fafc] dark:bg-slate-950 min-h-[600px] overflow-hidden">
                    <PDFViewer documentPath={document.scannedDocument} expanded={isPdfExpanded} />
                  </div>
                </div>

                {/* Left in RTL (Incoming Reference) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded">
                    <div className="flex items-center gap-2">
                      <FileInput className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      <span className="text-base font-bold text-[#1a202c] dark:text-slate-100">
                        الوارد المرجعي (<bdi dir="ltr">#{referenceDocument.serialNumber}</bdi>)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => referenceDocument.scannedDocument && downloadDocument(referenceDocument.scannedDocument, `ref-incoming-${referenceDocument.serialNumber}.pdf`)}
                      className="h-10 px-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300 border-[#cbd5e1] dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded flex items-center gap-1.5"
                    >
                      <Download className="h-4 w-4" />
                      <span>تحميل</span>
                    </Button>
                  </div>
                  <div className="border border-[#cbd5e1] dark:border-slate-800 rounded bg-[#f8fafc] dark:bg-slate-950 min-h-[600px] overflow-hidden">
                    <PDFViewer documentPath={referenceDocument.scannedDocument} expanded={isPdfExpanded} />
                  </div>
                </div>
              </div>
            ) : previewTab === 'reference' && referenceDocument?.scannedDocument ? (
              /* Single Reference Preview */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded">
                  <div className="flex items-center gap-2">
                    <FileInput className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="text-base font-bold text-[#1a202c] dark:text-slate-100">
                      ملف الوثيقة الواردة المرجعية (<bdi dir="ltr">#{referenceDocument.serialNumber}/{referenceDocument.year}</bdi>)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => downloadDocument(referenceDocument.scannedDocument!, `ref-incoming-${referenceDocument.serialNumber}.pdf`)}
                    className="h-10 px-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300 border-[#cbd5e1] dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span>تحميل الوارد</span>
                  </Button>
                </div>
                <div className="border border-[#cbd5e1] dark:border-slate-800 rounded bg-[#f8fafc] dark:bg-slate-950 min-h-[650px] overflow-hidden">
                  <PDFViewer documentPath={referenceDocument.scannedDocument} expanded={isPdfExpanded} />
                </div>
              </div>
            ) : document.scannedDocument ? (
              /* Single Outgoing Preview (Default) */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 rounded">
                  <div className="flex items-center gap-2">
                    <FileOutput className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                    <span className="text-base font-bold text-[#1a202c] dark:text-slate-100">
                      ملف الوثيقة الصادرة (<bdi dir="ltr">#{document.serialNumber}/{document.year}</bdi>)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="h-10 px-3 text-xs font-semibold text-[#2c5282] dark:text-blue-200 border-[#cbd5e1] dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>تحميل ملف PDF</span>
                    </Button>
                  </div>
                </div>
                <div className="border border-[#cbd5e1] dark:border-slate-800 rounded bg-[#f8fafc] dark:bg-slate-950 min-h-[650px] overflow-hidden">
                  <PDFViewer documentPath={document.scannedDocument} expanded={isPdfExpanded} />
                </div>
              </div>
            ) : (
              <div className="p-8 bg-[#f8fafc] dark:bg-slate-800/40 border border-dashed border-[#cbd5e1] dark:border-slate-700 rounded text-center">
                <Paperclip className="h-10 w-10 text-[#718096] mx-auto mb-2 opacity-50" />
                <p className="text-base font-semibold text-[#4a5568] dark:text-slate-300">لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة</p>
              </div>
            )}
          </div>
        ) : (
          /* Empty Attachments State */
          <div className="p-10 bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center space-y-3">
            <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
              <Paperclip className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">لا توجد وثائق ممسوحة ضوئياً مرفقة</h3>
            <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              لم يتم تحميل أي ملف PDF ممسوح ضوئياً لهذه المراسلة الصادرة حتى الآن.
            </p>
            {canEdit && (
              <Button
                type="button"
                onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
                className="h-10 px-5 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-200"
              >
                إرفاق وثيقة ممسوحة ضوئياً
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 5. ACTIONS DISPONIBLES (Dedicated Administrative Actions Bar) */}
      <div ref={actionsSectionRef} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-4 print:hidden">
        <div className="pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            الإجراءات الإدارية المتاحة
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 mt-0.5">
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
              className="h-11 px-5 text-base font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
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
              className="h-11 px-5 text-base font-bold bg-[#FFCB56] hover:bg-[#FFD758] text-[#1a202c] border border-[#FFD758] rounded-lg flex items-center gap-2 transition-colors duration-200"
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
              className="h-11 px-5 text-base font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              <span>تحميل نسخة PDF</span>
            </Button>
          )}

          {/* Action 4: Print Fiche */}
          <Button
            type="button"
            variant="outline"
            onClick={handlePrintFiche}
            className="h-11 px-5 text-base font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors duration-200"
          >
            <Printer className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <span>طباعة بطاقة الوثيقة</span>
          </Button>

          {/* Action 5: Edit Document */}
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
              className="h-11 px-5 text-base font-semibold text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <Edit className="h-4 w-4" />
              <span>تعديل بيانات الوثيقة</span>
            </Button>
          )}

          {/* Action 6: Delete Document (Admin / AdminTuningDesk) */}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="h-11 px-5 text-base font-semibold text-red-600 dark:text-red-400 border-red-200/80 dark:border-red-800/60 bg-red-50/70 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg flex items-center gap-2 transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>حذف الوثيقة</span>
            </Button>
          )}

          {/* Action 7: Return to List */}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/outgoing-documents')}
            className="h-11 px-5 text-base font-medium text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors duration-200 ms-auto"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            <span>العودة إلى قائمة الوثائق</span>
          </Button>
        </div>
      </div>

      {/* 5.5 PERSONNEL ASSOCIÉ (الموظفون المرتبطون بالوثيقة) */}
      {document && (
        <PersonnelAssociatedToDocument
          documentType="OutgoingDocument"
          documentId={document._id}
          document={document}
        />
      )}

      {/* 6. HISTORIQUE DE TRAITEMENT (Processing History & Audit Trail) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6 print:hidden">
        <div className="pb-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                سجل المتابعة والتاريخ الإداري
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-300">
                التتبع الزمني لكافة الإجراءات والعمليات التي تمت على هذه المراسلة الصادرة
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
                      {item.action || 'إجراء إداري'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      <bdi dir={dateDir}>{formatDateTime(item.createdAt, dateLang)}</bdi>
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    قام بالإجراء: <span className="font-semibold text-slate-900 dark:text-slate-100">{item.userDetails?.username || 'مستخدم النظام'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Institutional Lifecycle Fallback Timeline */
          <div className="relative border-s border-slate-300 dark:border-slate-700 ps-6 ms-3 space-y-6">
            {/* Step 1: Document Issue / Registration */}
            <div className="relative">
              <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white dark:border-slate-900" />
              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    تسجيل وقيد الوثيقة في سجل الصادر
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                    <bdi dir={dateDir}>{formatDateTime(document.createdAt || document.issueDate, dateLang)}</bdi>
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  تم تسجيل المراسلة تحت رقم صادر <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums"><bdi dir="ltr">#{document.serialNumber}</bdi></span> لسنة <bdi dir="ltr">{document.year}</bdi> من المصلحة المصدرة: <span className="font-semibold text-slate-900 dark:text-slate-100">{sourceName}</span>.
                </p>
              </div>
            </div>

            {/* Step 2: Destinations Assigned */}
            {document.assignedTo && document.assignedTo.length > 0 && (
              <div className="relative">
                <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-[#2c5282] border-2 border-white dark:border-slate-900" />
                <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 block">
                    توجيه وإرسال المراسلة إلى الجهات المعنية
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    وجهت المراسلة إلى:{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {document.assignedTo.join('، ')}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Pour Info Notifications */}
            {document.pourInfo && document.pourInfo.length > 0 && (
              <div className="relative">
                <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900" />
                <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-4 space-y-1">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 block">
                    إرسال نسخ للإعلام والإطلاع (Pour Info)
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    أرسلت نسخ إعلامية إلى:{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {document.pourInfo.join('، ')}
                    </span>
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
                    أرشفة وتصنيف المراسلة في مجلد
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    تم إدراج الوثيقة ضمن مجلد: <span className="font-semibold text-slate-900 dark:text-slate-100">{folderName}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Reference Incoming Document Link */}
            {isReferenceDeleted && populatedReference ? (
              <div className="relative">
                <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900" />
                <div className="bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-lg p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-base font-bold text-amber-900 dark:text-amber-200">
                      {t('documents.viewOutgoing.referenceCard.inTrashTitle')}
                    </span>
                    <span className="text-xs text-amber-800 dark:text-amber-300 font-medium tabular-nums">
                      <bdi dir="ltr">#{populatedReference.serialNumber} / {populatedReference.year}</bdi>
                    </span>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    {t('documents.viewOutgoing.referenceCard.inTrashMessage')}
                  </p>
                </div>
              </div>
            ) : referenceDocument && (
              <div className="relative">
                <div className="absolute -start-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900" />
                <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                      الربط كإجابة ورد رسمي على مراسلة واردة
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                      وارد رقم <bdi dir="ltr">#{referenceDocument.serialNumber} / {referenceDocument.year}</bdi>
                    </span>
                  </div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">
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
