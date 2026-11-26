
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { updateIncomingDocument } from '@/services/documentService';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import SerialInfoFields from './incoming/SerialInfoFields';
import CorrespondenceFields from './incoming/CorrespondenceFields';
import DocumentDetailsFields from './incoming/DocumentDetailsFields';
import AttachmentSection from './incoming/AttachmentSection';
import { IncomingDocument, Department } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { getErrorMessage } from '@/utils/errorMessages';
import {
  ScanStage,
  LiveThumbnail,
  createScanId,
  getScanJobStatus,
  getScanPageThumbnailBlob,
  cancelScanJob,
  deleteScan,
  getScanStageProgress,
  getScanStageLabel,
  getScannerErrorCode,
  getScannerErrorMessage,
} from '@/services/scannerService';

interface ScanMutationRunner {
  mutate: (
    options: Record<string, unknown>,
    callbacks?: {
      onSuccess?: (response: Record<string, unknown>) => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
}

interface EditIncomingDocumentFormProps {
  document: IncomingDocument;
  departments?: Department[];
  scannerStatus?: Record<string, unknown> | null;
  loadingScannerStatus?: boolean;
  scanTemporaryDocumentMutation?: ScanMutationRunner;
}

const createFormSchema = (requiredMsg: string) =>
  z.object({
    serialNumber: z.string().min(1, requiredMsg),
    year: z.string().min(1, requiredMsg),
    subject: z.string().min(1, requiredMsg),
    source: z.string().min(1, requiredMsg),
    arrivalDate: z.date(),
    correspondenceNumber: z.string().min(1, requiredMsg),
    correspondenceDate: z.date(),
    typeDocument: z.string().optional(),
    activity: z.string().optional(),
    dateActivity: z.date().optional().nullable(),
    departments: z.string().array().optional()
  });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

const EditIncomingDocumentForm: React.FC<EditIncomingDocumentFormProps> = ({ 
  document, 
  departments = [],
  scannerStatus,
  loadingScannerStatus = false,
  scanTemporaryDocumentMutation
}) => {
  interface ScanResultData {
    scanId?: string;
    ocrText?: string;
    filePath?: string;
    format?: string;
    pageCount?: number;
    data?: Record<string, unknown>;
    [key: string]: unknown;
  }

  const navigate = useNavigate();
  const { t: translate, language } = useLanguage();
  const lang: 'fr' | 'ar' = language === 'ar' ? 'ar' : 'fr';

  const formSchema = useMemo(
    () => createFormSchema(translate('documents.forms.validation.required')),
    [translate]
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState<ScanStage | null>(null);
  const [scanPage, setScanPage] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [liveThumbnails, setLiveThumbnails] = useState<LiveThumbnail[]>([]);
  const [isScanAttached, setIsScanAttached] = useState(false);
  const [scanSettings, setScanSettings] = useState({
    resolution: '600',
    format: 'pdf'
  });

  const isMountedRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  const thumbAbortRef = useRef<AbortController | null>(null);
  const activeScanIdRef = useRef<string | null>(null);
  const thumbnailUrlsRef = useRef<string[]>([]);
  const fetchedThumbPagesRef = useRef<Set<number>>(new Set());
  const localScanIdRef = useRef<string | null>(null);
  const hasSubmittedRef = useRef<boolean>(false);
  const scanStartTimeRef = useRef<number>(0);
  const maxPagesSeenRef = useRef<number>(1);
  const cancelledByUserRef = useRef<boolean>(false);

  const clearLiveThumbnails = useCallback(() => {
    if (thumbAbortRef.current) {
      thumbAbortRef.current.abort();
      thumbAbortRef.current = null;
    }
    fetchedThumbPagesRef.current.clear();
    if (thumbnailUrlsRef.current.length > 0) {
      for (const url of thumbnailUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      thumbnailUrlsRef.current = [];
    }
    if (isMountedRef.current) {
      setLiveThumbnails([]);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
      clearLiveThumbnails();
      scanAbortRef.current?.abort();
      if (activeScanIdRef.current) {
        cancelScanJob(activeScanIdRef.current).catch(() => {});
        activeScanIdRef.current = null;
      }
      if (!hasSubmittedRef.current && localScanIdRef.current) {
        deleteScan(localScanIdRef.current).catch(() => {});
        localScanIdRef.current = null;
      }
    };
  }, [stopPolling, clearLiveThumbnails]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serialNumber: document.serialNumber?.toString() || '',
      year: document.year?.toString() || new Date().getFullYear().toString(),
      subject: document.subject || '',
      source: document.source || '',
      arrivalDate: document.arrivalDate ? new Date(document.arrivalDate) : new Date(),
      correspondenceNumber: document.correspondenceNumber || '',
      correspondenceDate: document.correspondenceDate ? new Date(document.correspondenceDate) : new Date(),
      typeDocument: document.typeDocument || '',
      activity: document.activity || '',
      dateActivity: document.dateActivity ? new Date(document.dateActivity) : null,
      departments: document.assignedTo?.map(dept => 
        typeof dept.id === 'string' ? dept.id : dept.id._id || dept.id.toString()
      ) || []
    }
  });

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      setIsScanAttached(false);
    } else if (scanResult) {
      setIsScanAttached(true);
    }
  };

  const handleScanSettingChange = (key: string, value: string) => {
    setScanSettings({
      ...scanSettings,
      [key]: value
    });
  };

  const handleCancelScan = () => {
    const scanId = activeScanIdRef.current;
    cancelledByUserRef.current = true;
    stopPolling();
    clearLiveThumbnails();
    scanAbortRef.current?.abort();
    scanAbortRef.current = null;
    if (scanId) {
      cancelScanJob(scanId).catch(() => {});
    }
    activeScanIdRef.current = null;
    setScanning(false);
    setScanError(null);
    setScanStage(null);
    setScanPage(0);
    setScanProgress(0);
    toast.info(getScannerErrorMessage({ response: { data: { code: 'SCAN_CANCELLED' } } }, translate, lang));
  };

  const handleStartScan = () => {
    if (!scanTemporaryDocumentMutation || scanning) return;

    if (scanResult?.scanId && typeof scanResult.scanId === 'string') {
      deleteScan(scanResult.scanId).catch(() => {});
      localScanIdRef.current = null;
    }

    stopPolling();
    clearLiveThumbnails();
    const scanId = createScanId();
    const controller = new AbortController();
    const thumbController = new AbortController();

    activeScanIdRef.current = scanId;
    scanAbortRef.current = controller;
    thumbAbortRef.current = thumbController;
    scanStartTimeRef.current = Date.now();
    maxPagesSeenRef.current = 1;
    cancelledByUserRef.current = false;

    setScanning(true);
    setScanError(null);
    setScanStage('detecting');
    setScanPage(0);
    setScanProgress(getScanStageProgress('detecting', 0));

    pollTimerRef.current = setInterval(async () => {
      if (!isMountedRef.current || activeScanIdRef.current !== scanId) {
        stopPolling();
        return;
      }
      if (Date.now() - scanStartTimeRef.current > 120000 * Math.max(1, maxPagesSeenRef.current)) {
        stopPolling();
        clearLiveThumbnails();
        activeScanIdRef.current = null;
        controller.abort();
        cancelScanJob(scanId).catch(() => {});
        if (isMountedRef.current) {
          const timeoutMsg = getScannerErrorMessage({ code: 'CLIENT_TIMEOUT' }, translate, lang);
          setScanning(false);
          setScanStage('error');
          setScanError(timeoutMsg);
          setScanProgress(0);
          toast.error(timeoutMsg);
        }
        return;
      }
      try {
        const jobStatus = await getScanJobStatus(scanId);
        if (!isMountedRef.current || activeScanIdRef.current !== scanId) return;
        const page = Number(jobStatus.page || 0);
        if (page > maxPagesSeenRef.current) maxPagesSeenRef.current = page;
        const stage = jobStatus.stage || 'scanning';
        setScanStage(stage);
        setScanPage(page);
        setScanProgress(getScanStageProgress(stage, page));

        // ASYNC OCR FIX: Stop polling immediately once physical scan reaches done/error
        if (stage === 'done' || stage === 'error') {
          stopPolling();
          return;
        }

        const availablePages = Number(jobStatus.availablePages || page || 0);
        if (availablePages > 0) {
          for (let p = 1; p <= availablePages; p++) {
            if (fetchedThumbPagesRef.current.has(p)) continue;
            fetchedThumbPagesRef.current.add(p);
            getScanPageThumbnailBlob(scanId, p, thumbController.signal)
              .then((blob) => {
                if (!isMountedRef.current || activeScanIdRef.current !== scanId) return;
                const thumbUrl = URL.createObjectURL(blob);
                thumbnailUrlsRef.current.push(thumbUrl);
                setLiveThumbnails((prev) => {
                  if (prev.some((item) => item.page === p)) return prev;
                  return [...prev, { page: p, url: thumbUrl }].sort((a, b) => a.page - b.page);
                });
              })
              .catch(() => {
                fetchedThumbPagesRef.current.delete(p);
              });
          }
        }
      } catch {
        // Ignore transient polling 404
      }
    }, 1000);

    const scanOptions = {
      documentType: 'incoming',
      format: scanSettings.format,
      resolution: Number(scanSettings.resolution),
      temporary: true,
      scanId,
      signal: controller.signal,
    };

    scanTemporaryDocumentMutation.mutate(scanOptions, {
      onSuccess: (response: Record<string, unknown>) => {
        stopPolling();
        clearLiveThumbnails();
        scanAbortRef.current = null;
        activeScanIdRef.current = null;
        if (!isMountedRef.current) return;

        const raw = ((response?.data && typeof response.data === 'object' ? response.data : response) || {}) as ScanResultData;
        const resolvedScanId = String(raw.scanId || scanId);
        localScanIdRef.current = resolvedScanId;
        const normalized: ScanResultData = {
          ...raw,
          scanId: resolvedScanId,
          filePath: raw.filePath || `/api/scan/file/${resolvedScanId}`,
          format: raw.format || scanSettings.format,
          pageCount: Number(raw.pageCount || maxPagesSeenRef.current || 1),
        };

        setScanning(false);
        setScanError(null);
        setScanStage('done');
        setScanPage(Number(normalized.pageCount || 1));
        setScanProgress(100);
        setScanResult(normalized);
        setIsScanAttached(true);
        setSelectedFiles([]);
        toast.success(getScanStageLabel('done', 0, translate, lang));

        if (normalized.ocrText) {
          const text = normalized.ocrText;
          const subjectPatterns = [
            /الموضوع\s*:?\s*(.+)/i,
            /subject\s*:?\s*(.+)/i,
            /objet\s*:?\s*(.+)/i,
            /re\s*:?\s*(.+)/i
          ];
          for (const pattern of subjectPatterns) {
            const match = text.match(pattern);
            if (match && match[1]?.trim()) {
              form.setValue('subject', match[1].trim());
              break;
            }
          }
          const sourcePatterns = [
            /من\s*:?\s*(.+)/i,
            /المرسل\s*:?\s*(.+)/i,
            /from\s*:?\s*(.+)/i,
            /sender\s*:?\s*(.+)/i,
            /expéditeur\s*:?\s*(.+)/i
          ];
          for (const pattern of sourcePatterns) {
            const match = text.match(pattern);
            if (match && match[1]?.trim()) {
              form.setValue('source', match[1].trim());
              break;
            }
          }
        }
      },
      onError: (error: unknown) => {
        stopPolling();
        clearLiveThumbnails();
        scanAbortRef.current = null;
        activeScanIdRef.current = null;
        if (!isMountedRef.current) return;

        const wasManualCancel = cancelledByUserRef.current;
        cancelledByUserRef.current = false;
        setScanning(false);
        setScanProgress(0);
        if (wasManualCancel || getScannerErrorCode(error) === 'SCAN_CANCELLED') {
          setScanStage(null);
          setScanError(null);
          return;
        }
        const errMsg = getScannerErrorMessage(error, translate, lang);
        setScanStage('error');
        setScanError(errMsg);
        toast.error(errMsg);
      }
    });
  };

  const handleRemoveScan = () => {
    if (scanResult?.scanId && typeof scanResult.scanId === 'string') {
      deleteScan(scanResult.scanId).catch(() => {});
    }
    localScanIdRef.current = null;
    clearLiveThumbnails();
    setScanResult(null);
    setScanError(null);
    setIsScanAttached(false);
    setScanStage(null);
    setScanPage(0);
    setScanProgress(0);
  };

  const handleUseScan = () => {
    if (!scanResult) return;
    setSelectedFiles([]);
    setIsScanAttached(true);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();
      
      formData.append('serialNumber', data.serialNumber);
      formData.append('year', data.year);
      formData.append('subject', data.subject);
      formData.append('source', data.source);
      
      if (data.arrivalDate) {
        formData.append('arrivalDate', data.arrivalDate.toISOString());
      }
      if (data.correspondenceDate) {
        formData.append('correspondenceDate', data.correspondenceDate.toISOString());
      }
      
      formData.append('correspondenceNumber', data.correspondenceNumber);
      
      if (data.departments && data.departments.length) {
        const cleanDepartmentIds = data.departments.filter(id => id && id.length === 24);
        formData.append('departmentIds', cleanDepartmentIds.join(','));
      }
      
      if (data.activity) {
        formData.append('activity', data.activity);
        if (data.dateActivity) {
          formData.append('dateActivity', data.dateActivity.toISOString());
        }
      }
      if (data.typeDocument) {
        formData.append('typeDocument', data.typeDocument);
      }
      
      if (selectedFiles.length > 0) {
        formData.append('document', selectedFiles[0]);
      } else if (scanResult && (scanResult.scanId || scanResult.filePath)) {
        if (scanResult.scanId) {
          formData.append('scanId', String(scanResult.scanId));
        }
        if (scanResult.filePath) {
          formData.append('scannedDocumentPath', scanResult.filePath);
        }
        if (scanResult.ocrText) {
          formData.append('ocrText', scanResult.ocrText);
        }
      }
      
      await updateIncomingDocument(document._id, formData);
      hasSubmittedRef.current = true;
      localScanIdRef.current = null;
      toast.success(translate('documents.editIncoming.updateSuccess'));
      navigate('/dashboard/incoming-documents');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error(getErrorMessage(error, translate('documents.editIncoming.updateError'), lang));
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/incoming-documents');
  };

  const t = {
    title: translate('documents.editIncoming.title'),
    serialInfo: translate('documents.forms.sections.serialInfo'),
    correspondence: translate('documents.forms.sections.correspondence'),
    documentDetails: translate('documents.forms.sections.details'),
    attachments: translate('documents.forms.sections.attachments'),
    attachmentsDesc: translate('documents.editIncoming.attachmentsDesc'),
    cancel: translate('documents.createIncoming.cancel'),
    submit: translate('documents.editIncoming.submit'),
    uploadTab: translate('documents.createIncoming.uploadTab'),
    scanTab: translate('documents.createIncoming.scanTab'),
    scanComplete: translate('documents.createIncoming.scanComplete'),
    scanFailed: translate('documents.createIncoming.scanFailed'),
    scanDocument: translate('documents.createIncoming.scanDocument'),
    scannerNotConfigured: translate('documents.createIncoming.scannerNotConfigured'),
    configureScanner: translate('documents.createIncoming.configureScanner'),
    resolution: translate('documents.createIncoming.resolution'),
    format: translate('documents.createIncoming.format'),
    pdfFormat: 'PDF',
    jpegFormat: 'JPEG',
    pngFormat: 'PNG',
    subject: translate('documents.createIncoming.subject'),
    subjectDesc: translate('documents.createIncoming.subjectDesc'),
    source: translate('documents.createIncoming.source'),
    sourceDesc: translate('documents.createIncoming.sourceDesc'),
    serialNumber: translate('documents.createIncoming.serialNumber'),
    serialNumberDesc: translate('documents.createIncoming.serialNumberDesc'),
    arrivalDate: translate('documents.createIncoming.arrivalDate'),
    arrivalDateDesc: translate('documents.createIncoming.arrivalDateDesc'),
    selectDate: translate('documents.createIncoming.selectDate'),
    assignedTo: translate('documents.forms.assignedDepartments'),
    assignedToDesc: translate('documents.forms.assignedDepartmentsDesc'),
    year: translate('documents.forms.year'),
    yearDesc: translate('documents.forms.yearDesc')
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card className="shadow-sm border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            {t.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Serial Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-green-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t.serialInfo}</h3>
                </div>
                
                <div className="bg-green-50/50 dark:bg-green-500/5 rounded p-6 border border-green-200/50 dark:border-green-500/20">
                  <SerialInfoFields form={form} t={t} />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Correspondence Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-blue-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t.correspondence}</h3>
                </div>
                
                <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded p-6 border border-blue-200/50 dark:border-blue-500/20">
                  <CorrespondenceFields form={form} />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Document Details Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-purple-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t.documentDetails}</h3>
                </div>
                
                <div className="bg-purple-50/50 dark:bg-purple-500/5 rounded p-6 border border-purple-200/50 dark:border-purple-500/20">
                  <DocumentDetailsFields form={form} t={t} departments={departments} />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Attachment Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-orange-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t.attachments}</h3>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    {t.attachmentsDesc}
                  </span>
                </div>
                
                <div className="bg-orange-50/50 dark:bg-orange-500/5 rounded p-6 border border-orange-200/50 dark:border-orange-500/20">
                  <AttachmentSection
                    t={t}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onFileSelect={handleFileSelect}
                    scanSettings={scanSettings}
                    handleScanSettingChange={handleScanSettingChange}
                    scanning={scanning}
                    scanProgress={scanProgress}
                    scanResult={scanResult}
                    scanError={scanError}
                    liveThumbnails={liveThumbnails}
                    scannerStatus={scannerStatus}
                    loadingScannerStatus={loadingScannerStatus}
                    handleStartScan={handleStartScan}
                    onRemoveScan={handleRemoveScan}
                    scanStage={scanStage}
                    scanPage={scanPage}
                    onCancelScan={handleCancelScan}
                    onRescan={handleStartScan}
                    onUseScan={handleUseScan}
                    isScanAttached={isScanAttached}
                  />
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-6 py-4 rounded-b flex items-center justify-between gap-3 shadow-[0_-6px_16px_-6px_rgba(15,23,42,0.08)]">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            className="h-10 px-5 min-w-24 font-medium border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t.cancel}
          </Button>
          <Button 
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={form.formState.isSubmitting || scanning}
            className="h-10 px-6 min-w-32 font-semibold bg-[#2c5282] hover:bg-[#234269] text-white shadow-sm"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t.submit}
              </>
            ) : (
              t.submit
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EditIncomingDocumentForm;
