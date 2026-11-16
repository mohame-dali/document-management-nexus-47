import { useState, useEffect, useRef, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createOutgoingDocument } from '@/services/documentService';
import { getNextSerialNumber, validateSerialNumber } from '@/services/serialNumberService';
import { getErrorMessage } from '@/utils/errorMessages';
import { useLanguage } from '@/contexts/LanguageProvider';
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

const BASE_SCAN_TIMEOUT_MS = 120000;

export interface OutgoingFormTranslations {
  required?: string;
  scanComplete?: string;
  [key: string]: string | undefined;
}

export interface OutgoingScanResultData {
  scanId?: string;
  fileName?: string;
  filePath?: string;
  url?: string;
  format?: string;
  pageCount?: number;
  serialNumber?: number | string;
  year?: number | string;
  ocrText?: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface OutgoingScanMutationRunner {
  mutate: (
    options: Record<string, unknown>,
    callbacks?: {
      onSuccess?: (response: OutgoingScanResultData) => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
}

export interface OutgoingFormValues {
  serialNumber: string;
  subject: string;
  assignedTo: string[];
  issueDate: Date;
  department: string;
  typeDocument?: string;
  pourInfo?: string[];
  ocrText?: string;
}

export const useOutgoingDocumentForm = (
  t: OutgoingFormTranslations,
  currentDepartmentId?: string,
  scanData?: OutgoingScanResultData | null
) => {
  const navigate = useNavigate();
  const { t: translate, language } = useLanguage();
  const lang: 'fr' | 'ar' = language === 'ar' ? 'ar' : 'fr';

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<string>(scanData ? 'scan' : 'upload');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState<ScanStage | null>(null);
  const [scanPage, setScanPage] = useState(0);
  const [scanResult, setScanResult] = useState<OutgoingScanResultData | null>(scanData || null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [liveThumbnails, setLiveThumbnails] = useState<LiveThumbnail[]>([]);
  const [isScanAttached, setIsScanAttached] = useState<boolean>(Boolean(scanData));
  const [scanSettings, setScanSettings] = useState({
    resolution: '300',
    format: 'pdf',
  });
  const [isManualSerialNumber, setIsManualSerialNumber] = useState(false);

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
      if (scanAbortRef.current) {
        scanAbortRef.current.abort();
        scanAbortRef.current = null;
      }
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

  const formSchema = z.object({
    serialNumber: z.string().min(1, t.required),
    subject: z.string().min(1, t.required),
    assignedTo: z.string().array().min(1, t.required),
    issueDate: z.date(),
    department: z.string().min(1, t.required),
    typeDocument: z.string().optional(),
    pourInfo: z.string().array().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serialNumber: '',
      subject: '',
      assignedTo: [],
      issueDate: new Date(),
      department: currentDepartmentId || '',
      typeDocument: '',
      pourInfo: [],
    },
  });

  const applyOcrAutoFill = useCallback(
    (data: OutgoingScanResultData | null | undefined) => {
      if (!data) return;
      if (data.serialNumber && !isManualSerialNumber) {
        form.setValue('serialNumber', String(data.serialNumber));
      }
      if (data.ocrText) {
        const lines = data.ocrText.split('\n');

        const subjectLine = lines.find((line) => {
          const l = line.toLowerCase();
          return l.includes('subject:') || l.includes('re:') || l.includes('objet:') || line.includes('الموضوع');
        });
        if (subjectLine) {
          const subject = subjectLine.replace(/subject:|re:|objet:|الموضوع\s*:?/i, '').trim();
          if (subject && !form.getValues('subject')) {
            form.setValue('subject', subject);
          }
        }

        const assignedToLine = lines.find((line) => {
          const l = line.toLowerCase();
          return l.includes('to:') || l.includes('recipient:') || l.includes('destinataire:') || line.includes('إلى');
        });
        if (assignedToLine) {
          const assignedTo = assignedToLine.replace(/to:|recipient:|destinataire:|إلى\s*:?/i, '').trim();
          if (assignedTo && !form.getValues('assignedTo').length) {
            form.setValue('assignedTo', [assignedTo]);
          }
        }
      }
    },
    [form, isManualSerialNumber]
  );

  // Auto-update serial number when issue date changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'issueDate' && value.issueDate && !isManualSerialNumber) {
        const year = new Date(value.issueDate).getFullYear();
        if (!isNaN(year) && year > 1900) {
          getNextSerialNumber(year, 'outgoing')
            .then((nextNumber) => {
              form.setValue('serialNumber', nextNumber.toString());
            })
            .catch((error) => {
              console.error('Error fetching next serial number:', error);
            });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, isManualSerialNumber]);

  // Initial serial number fetch
  useEffect(() => {
    if (!isManualSerialNumber) {
      const currentDate = form.getValues('issueDate');
      if (currentDate) {
        const year = new Date(currentDate).getFullYear();
        if (!isNaN(year) && year > 1900) {
          getNextSerialNumber(year, 'outgoing')
            .then((nextNumber) => {
              form.setValue('serialNumber', nextNumber.toString());
            })
            .catch((error) => {
              console.error('Error fetching initial serial number:', error);
            });
        }
      }
    }
  }, [form, isManualSerialNumber]);

  useEffect(() => {
    if (scanData) {
      setScanResult(scanData);
      setIsScanAttached(true);
      setActiveTab('scan');
      applyOcrAutoFill(scanData);
    }
  }, [scanData, applyOcrAutoFill]);

  const handleSerialNumberChange = (value: string) => {
    setIsManualSerialNumber(Boolean(value && value !== ''));
    if (value && value.trim() !== '') {
      const numericValue = parseInt(value, 10);
      if (isNaN(numericValue) || numericValue <= 0) {
        form.setError('serialNumber', {
          type: 'manual',
          message: 'يجب أن يكون الرقم التسلسلي رقماً صحيحاً موجباً',
        });
        return;
      }

      const issueDate = form.getValues('issueDate');
      if (issueDate) {
        const year = new Date(issueDate).getFullYear();
        if (!isNaN(year) && year > 1900) {
          validateSerialNumber(value, year, 'outgoing')
            .then((isValid) => {
              if (!isValid) {
                form.setError('serialNumber', {
                  type: 'manual',
                  message: 'هذا الرقم التسلسلي موجود بالفعل لهذا العام',
                });
              } else {
                form.clearErrors('serialNumber');
              }
            })
            .catch((error) => {
              console.error('Error validating serial number:', error);
            });
        }
      }
    } else {
      setIsManualSerialNumber(false);
      form.clearErrors('serialNumber');
    }
  };

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    if (files.length > 0) {
      setIsScanAttached(false);
    } else if (scanResult) {
      setIsScanAttached(true);
    }
  };

  const handleScanSettingChange = (key: string, value: string) => {
    setScanSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRemoveScan = () => {
    const previousScanId = scanResult?.scanId;
    if (typeof previousScanId === 'string' && previousScanId.trim()) {
      deleteScan(previousScanId).catch(() => {});
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
    const attachedLabel = translate('scanner.actions.scanAttached');
    toast.success(
      attachedLabel && attachedLabel !== 'scanner.actions.scanAttached'
        ? attachedLabel
        : lang === 'ar'
          ? 'تم إرفاق المسح بالمراسلة'
          : 'Scan rattaché au courrier'
    );
  };

  const handleCancelScan = () => {
    const scanId = activeScanIdRef.current;
    cancelledByUserRef.current = true;
    stopPolling();
    clearLiveThumbnails();
    if (scanAbortRef.current) {
      scanAbortRef.current.abort();
      scanAbortRef.current = null;
    }
    if (scanId) {
      cancelScanJob(scanId).catch(() => {});
    }
    activeScanIdRef.current = null;
    setScanning(false);
    setScanError(null);
    setScanStage(null);
    setScanPage(0);
    setScanProgress(0);
    toast.info(
      getScannerErrorMessage({ response: { data: { code: 'SCAN_CANCELLED' } } }, translate, lang)
    );
  };

  const handleStartScan = (scanTemporaryDocumentMutation: OutgoingScanMutationRunner) => {
    if (scanning) return;

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

      const elapsedMs = Date.now() - scanStartTimeRef.current;
      const maxAllowedMs = BASE_SCAN_TIMEOUT_MS * Math.max(1, maxPagesSeenRef.current);
      if (elapsedMs > maxAllowedMs) {
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
        if (page > maxPagesSeenRef.current) {
          maxPagesSeenRef.current = page;
        }
        const stage = jobStatus.stage || 'scanning';
        setScanStage(stage);
        setScanPage(page);
        setScanProgress(getScanStageProgress(stage, page));

        const availablePages = Number(jobStatus.availablePages || page || 0);
        if (availablePages > 0 && stage !== 'done' && stage !== 'error') {
          for (let p = 1; p <= availablePages; p++) {
            if (fetchedThumbPagesRef.current.has(p)) continue;
            fetchedThumbPagesRef.current.add(p);
            getScanPageThumbnailBlob(scanId, p, thumbController.signal)
              .then((blob) => {
                if (!isMountedRef.current || activeScanIdRef.current !== scanId) {
                  return;
                }
                const thumbUrl = URL.createObjectURL(blob);
                thumbnailUrlsRef.current.push(thumbUrl);
                setLiveThumbnails((prev) => {
                  if (prev.some((item) => item.page === p)) {
                    return prev;
                  }
                  return [...prev, { page: p, url: thumbUrl }].sort((a, b) => a.page - b.page);
                });
              })
              .catch(() => {
                fetchedThumbPagesRef.current.delete(p);
              });
          }
        }
      } catch {
        // Ignore transient polling 404 before backend job registration
      }
    }, 1000);

    const scanOptions = {
      documentType: 'outgoing',
      format: scanSettings.format,
      resolution: Number(scanSettings.resolution),
      temporary: true,
      scanId,
      signal: controller.signal,
    };

    scanTemporaryDocumentMutation.mutate(scanOptions, {
      onSuccess: (response: OutgoingScanResultData) => {
        stopPolling();
        clearLiveThumbnails();
        scanAbortRef.current = null;
        activeScanIdRef.current = null;
        if (!isMountedRef.current) return;

        const rawData = (
          response?.data && typeof response.data === 'object' ? response.data : response
        ) as OutgoingScanResultData;

        const resolvedScanId = String(rawData?.scanId || scanId);
        localScanIdRef.current = resolvedScanId;
        const normalizedScan: OutgoingScanResultData = {
          ...rawData,
          scanId: resolvedScanId,
          filePath: rawData?.filePath || `/api/scan/file/${resolvedScanId}`,
          format: rawData?.format || scanSettings.format,
          pageCount: Number(rawData?.pageCount || maxPagesSeenRef.current || 1),
        };

        setScanning(false);
        setScanError(null);
        setScanStage('done');
        setScanPage(Number(normalizedScan.pageCount || 1));
        setScanProgress(100);
        setScanResult(normalizedScan);
        setSelectedFiles([]);
        setIsScanAttached(true);
        toast.success(t.scanComplete || getScanStageLabel('done', 0, translate, lang));

        applyOcrAutoFill(normalizedScan);
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
          if (!wasManualCancel) {
            toast.info(getScannerErrorMessage(error, translate, lang));
          }
          return;
        }

        const errMsg = getScannerErrorMessage(error, translate, lang);
        setScanStage('error');
        setScanError(errMsg);
        toast.error(errMsg);
      },
    });
  };

  const onSubmit = async (data: OutgoingFormValues) => {
    try {
      const formData = new FormData();

      formData.append('serialNumber', data.serialNumber);
      formData.append('subject', data.subject);

      if (data.assignedTo && data.assignedTo.length > 0) {
        formData.append('assignedTo', data.assignedTo.join(','));
      }

      if (data.pourInfo && data.pourInfo.length > 0) {
        formData.append('pourInfo', data.pourInfo.join(','));
      }

      if (data.issueDate) {
        formData.append('issueDate', data.issueDate.toISOString());
      }

      formData.append('departmentId', data.department);

      if (data.typeDocument) {
        formData.append('typeDocument', data.typeDocument);
      }

      const activeScan = scanResult || scanData || null;
      if (selectedFiles.length > 0) {
        formData.append('document', selectedFiles[0]);
      } else if (activeScan && (activeScan.scanId || activeScan.filePath)) {
        if (activeScan.scanId) {
          formData.append('scanId', String(activeScan.scanId));
        }
        const docPath =
          activeScan.filePath || (activeScan.scanId ? `/api/scan/file/${activeScan.scanId}` : '');
        if (docPath) {
          formData.append('scannedDocumentPath', docPath);
        }

        const resolvedOcr = activeScan.ocrText || data.ocrText;
        if (resolvedOcr) {
          formData.append('ocrText', resolvedOcr);
        }

        if (activeScan.serialNumber && !isManualSerialNumber) {
          formData.set('serialNumber', activeScan.serialNumber.toString());
        }

        if (activeScan.year) {
          formData.append('year', activeScan.year.toString());
        }
      }

      await createOutgoingDocument(formData);
      hasSubmittedRef.current = true;
      localScanIdRef.current = null;
      toast.success(t.createSuccess);
      navigate('/dashboard/outgoing-documents');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error(getErrorMessage(error, t.createError));
    }
  };

  return {
    form,
    selectedFiles,
    activeTab,
    scanning,
    scanProgress,
    scanStage,
    scanPage,
    scanResult,
    scanError,
    liveThumbnails,
    isScanAttached,
    scanSettings,
    handleFileSelect,
    handleScanSettingChange,
    handleStartScan,
    handleCancelScan,
    handleUseScan,
    setActiveTab,
    onSubmit,
    handleSerialNumberChange,
    isManualSerialNumber,
    handleRemoveScan,
  };
};

export default useOutgoingDocumentForm;
