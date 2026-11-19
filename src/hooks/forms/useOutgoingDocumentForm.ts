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
  OcrStatus,
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
const DRAFT_KEY = 'dms:draft:outgoing';
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000; // 2 heures
const SENSITIVE_KEYS = new Set(['password', 'token', 'tokens', 'accessToken', 'refreshToken']);

function sanitizeDraftValues<T extends Record<string, unknown>>(raw: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!SENSITIVE_KEYS.has(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

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
  ocrStatus?: OcrStatus;
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
  scanData?: OutgoingScanResultData | null,
  isEditMode = false
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
  const isManualSerialNumberRef = useRef(false);
  const [restoredDraftAt, setRestoredDraftAt] = useState<number | null>(null);
  const hasHydratedDraftRef = useRef<boolean>(false);

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
      if (hasSubmittedRef.current) {
        return;
      }
      if (scanAbortRef.current) {
        scanAbortRef.current.abort();
        scanAbortRef.current = null;
      }
      if (activeScanIdRef.current) {
        cancelScanJob(activeScanIdRef.current).catch(() => {});
        activeScanIdRef.current = null;
      }
      if (localScanIdRef.current) {
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

  // Restaurer le brouillon depuis sessionStorage au montage (hors mode édition, TTL 2h)
  useEffect(() => {
    if (isEditMode) {
      hasHydratedDraftRef.current = true;
      return;
    }

    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          values?: Record<string, unknown>;
          department?: string;
          isManualSerialNumber?: boolean;
          savedAt?: number;
        };

        if (
          draft &&
          typeof draft.savedAt === 'number' &&
          Date.now() - draft.savedAt < DRAFT_TTL_MS &&
          draft.values &&
          typeof draft.values === 'object'
        ) {
          const sanitized = sanitizeDraftValues(draft.values);
          const restoredDept =
            typeof draft.department === 'string'
              ? draft.department
              : typeof sanitized.department === 'string'
                ? sanitized.department
                : currentDepartmentId || '';

          const nextValues: z.infer<typeof formSchema> = {
            serialNumber: typeof sanitized.serialNumber === 'string' ? sanitized.serialNumber : '',
            subject: typeof sanitized.subject === 'string' ? sanitized.subject : '',
            assignedTo: Array.isArray(sanitized.assignedTo)
              ? sanitized.assignedTo.filter((item): item is string => typeof item === 'string')
              : [],
            issueDate: parseOptionalDate(sanitized.issueDate) || new Date(),
            department: restoredDept,
            typeDocument: typeof sanitized.typeDocument === 'string' ? sanitized.typeDocument : '',
            pourInfo: Array.isArray(sanitized.pourInfo)
              ? sanitized.pourInfo.filter((item): item is string => typeof item === 'string')
              : [],
          };

          const hasMeaningfulContent = Boolean(
            nextValues.subject.trim() ||
              nextValues.assignedTo.length > 0 ||
              (nextValues.pourInfo && nextValues.pourInfo.length > 0) ||
              nextValues.typeDocument?.trim() ||
              draft.isManualSerialNumber
          );

          if (hasMeaningfulContent) {
            if (draft.isManualSerialNumber && nextValues.serialNumber) {
              isManualSerialNumberRef.current = true;
              setIsManualSerialNumber(true);
            }
            form.reset(nextValues);
            setRestoredDraftAt(draft.savedAt);
          }
        } else {
          sessionStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    } finally {
      hasHydratedDraftRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  // Auto-save du brouillon dans sessionStorage à chaque modification du formulaire
  useEffect(() => {
    if (isEditMode) return;

    const subscription = form.watch((values, { name }) => {
      if (!hasHydratedDraftRef.current || hasSubmittedRef.current || !name) {
        return;
      }

      try {
        const sanitized = sanitizeDraftValues(values as Record<string, unknown>);
        const payload = {
          values: sanitized,
          personnelId: (sanitized.personnelId as string | undefined) ?? undefined,
          department: typeof sanitized.department === 'string' ? sanitized.department : '',
          departments: typeof sanitized.department === 'string' && sanitized.department ? [sanitized.department] : [],
          isManualSerialNumber,
          savedAt: Date.now(),
        };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch {
        // Ignorer les erreurs de quota sessionStorage
      }
    });

    return () => subscription.unsubscribe();
  }, [form, isEditMode, isManualSerialNumber]);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignorer
    }
    setRestoredDraftAt(null);
    isManualSerialNumberRef.current = false;
    setIsManualSerialNumber(false);
    form.reset({
      serialNumber: '',
      subject: '',
      assignedTo: [],
      issueDate: new Date(),
      department: currentDepartmentId || '',
      typeDocument: '',
      pourInfo: [],
    });
    const currentYear = new Date().getFullYear();
    getNextSerialNumber(currentYear, 'outgoing')
      .then((nextNumber) => {
        form.setValue('serialNumber', nextNumber.toString());
      })
      .catch(() => {});
  }, [form, currentDepartmentId]);

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
    if (!isManualSerialNumber && !isManualSerialNumberRef.current) {
      const currentDate = form.getValues('issueDate');
      if (currentDate) {
        const year = new Date(currentDate).getFullYear();
        if (!isNaN(year) && year > 1900) {
          getNextSerialNumber(year, 'outgoing')
            .then((nextNumber) => {
              if (!isManualSerialNumberRef.current) {
                form.setValue('serialNumber', nextNumber.toString());
              }
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
    const isManual = Boolean(value && value !== '');
    isManualSerialNumberRef.current = isManual;
    setIsManualSerialNumber(isManual);
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
      isManualSerialNumberRef.current = false;
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
    hasSubmittedRef.current = false;

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

        // ASYNC OCR FIX: Stop polling immediately once physical PDF is ready (do not wait on background OCR)
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
                if (!isMountedRef.current || activeScanIdRef.current !== scanId) {
                  return;
                }
                if (
                  !(blob instanceof Blob) ||
                  blob.size === 0 ||
                  (blob.type && !blob.type.startsWith('image/'))
                ) {
                  fetchedThumbPagesRef.current.delete(p);
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

  const isScanInProgress =
    scanning || (scanStage !== null && scanStage !== 'done' && scanStage !== 'error');

  const onSubmit = async (data: OutgoingFormValues) => {
    if (isScanInProgress) {
      toast.warning(
        lang === 'ar'
          ? 'يرجى انتظار انتهاء المسح الضوئي ومعالجة النص قبل إرسال المستند.'
          : 'Veuillez attendre la fin de la numérisation et du traitement OCR avant de soumettre.'
      );
      return;
    }

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

      const activeScan = scanResult;
      const resolvedScanId =
        activeScan?.scanId ||
        (typeof activeScan?.id === 'string' ? activeScan.id : undefined);
      const resolvedFilePath =
        activeScan?.filePath ||
        (typeof activeScan?.fileUrl === 'string' ? activeScan.fileUrl : undefined);

      if (selectedFiles.length > 0) {
        formData.append('document', selectedFiles[0]);
      } else if (activeScan && (resolvedScanId || resolvedFilePath)) {
        if (resolvedScanId) {
          formData.append('scanId', String(resolvedScanId));
        }
        const docPath =
          resolvedFilePath || (resolvedScanId ? `/api/scan/file/${resolvedScanId}` : '');
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
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignorer
      }
      setRestoredDraftAt(null);
      activeScanIdRef.current = null;
      localScanIdRef.current = null;
      scanAbortRef.current = null;
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
    isScanInProgress,
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
    restoredDraftAt,
    clearDraft,
  };
};

export default useOutgoingDocumentForm;
