import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createIncomingDocument } from '@/services/documentService';
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
const DRAFT_KEY = 'dms:draft:incoming';
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

export interface FormTranslations {
  required?: string;
  scanComplete?: string;
  [key: string]: string | undefined;
}

export interface ScanResultData {
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

export interface ScanMutationRunner {
  mutate: (
    options: Record<string, unknown>,
    callbacks?: {
      onSuccess?: (response: ScanResultData) => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
}

export const useIncomingDocumentForm = (
  t: FormTranslations,
  currentDepartmentId?: string,
  scanData?: ScanResultData | null,
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
  const [scanResult, setScanResult] = useState<ScanResultData | null>(scanData || null);
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

  const formSchema = useMemo(
    () =>
      z
        .object({
          serialNumber: z
            .string()
            .min(1, t.required || translate('documents.forms.validation.required')),
          subject: z
            .string()
            .min(1, t.required || translate('documents.forms.validation.required')),
          source: z
            .string()
            .min(1, t.required || translate('documents.forms.validation.required')),
          arrivalDate: z.date(),
          correspondenceNumber: z
            .string()
            .min(1, t.required || translate('documents.forms.validation.required')),
          correspondenceDate: z.date(),
          typeDocument: z.string().optional(),
          activity: z.string().optional().or(z.literal('')),
          dateActivity: z.date().optional(),
          departments: z
            .array(z.string())
            .min(1, translate('documents.forms.validation.minOneDepartment')),
          description: z.string().optional(),
        })
        .refine(
          (data) => {
            if (data.activity && data.activity.trim() !== '' && !data.dateActivity) {
              return false;
            }
            return true;
          },
          {
            message: translate('documents.forms.validation.activityDateRequired'),
            path: ['dateActivity'],
          }
        ),
    [t.required, translate]
  );

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serialNumber: '',
      subject: '',
      source: '',
      arrivalDate: new Date(),
      correspondenceNumber: '',
      correspondenceDate: new Date(),
      typeDocument: '',
      activity: '',
      dateActivity: undefined,
      departments: currentDepartmentId ? [currentDepartmentId] : [],
      description: '',
    },
  });

  const applyOcrAutoFill = useCallback(
    (data: ScanResultData | null | undefined) => {
      if (!data) return;
      if (data.serialNumber && !isManualSerialNumber) {
        form.setValue('serialNumber', String(data.serialNumber));
      }
      if (data.ocrText) {
        const text = data.ocrText;
        const lines = text.split('\n');

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

        const sourceLine = lines.find((line) => {
          const l = line.toLowerCase();
          return l.includes('from:') || l.includes('sender:') || l.includes('expéditeur:') || line.includes('من:') || line.includes('المرسل');
        });
        if (sourceLine) {
          const source = sourceLine.replace(/from:|sender:|expéditeur:|من\s*:?|المرسل\s*:?/i, '').trim();
          if (source && !form.getValues('source')) {
            form.setValue('source', source);
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
          departments?: string[];
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
          const restoredDepartments = Array.isArray(draft.departments)
            ? draft.departments.filter((d): d is string => typeof d === 'string')
            : Array.isArray(sanitized.departments)
              ? sanitized.departments.filter((d): d is string => typeof d === 'string')
              : currentDepartmentId
                ? [currentDepartmentId]
                : [];

          const arrivalDate = parseOptionalDate(sanitized.arrivalDate) || new Date();
          const correspondenceDate = parseOptionalDate(sanitized.correspondenceDate) || new Date();
          const dateActivity = parseOptionalDate(sanitized.dateActivity);

          const nextValues: FormValues = {
            serialNumber: typeof sanitized.serialNumber === 'string' ? sanitized.serialNumber : '',
            subject: typeof sanitized.subject === 'string' ? sanitized.subject : '',
            source: typeof sanitized.source === 'string' ? sanitized.source : '',
            arrivalDate,
            correspondenceNumber:
              typeof sanitized.correspondenceNumber === 'string' ? sanitized.correspondenceNumber : '',
            correspondenceDate,
            typeDocument: typeof sanitized.typeDocument === 'string' ? sanitized.typeDocument : '',
            activity: typeof sanitized.activity === 'string' ? sanitized.activity : '',
            dateActivity,
            departments: restoredDepartments,
            description: typeof sanitized.description === 'string' ? sanitized.description : '',
          };

          const hasMeaningfulContent = Boolean(
            nextValues.subject.trim() ||
              nextValues.source.trim() ||
              nextValues.correspondenceNumber.trim() ||
              nextValues.description?.trim() ||
              nextValues.activity?.trim() ||
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
          departments: Array.isArray(sanitized.departments) ? sanitized.departments : [],
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
      source: '',
      arrivalDate: new Date(),
      correspondenceNumber: '',
      correspondenceDate: new Date(),
      typeDocument: '',
      activity: '',
      dateActivity: undefined,
      departments: currentDepartmentId ? [currentDepartmentId] : [],
      description: '',
    });
    const currentYear = new Date().getFullYear();
    getNextSerialNumber(currentYear, 'incoming')
      .then((nextNumber) => {
        form.setValue('serialNumber', nextNumber.toString());
      })
      .catch(() => {});
  }, [form, currentDepartmentId]);

  // Auto-update serial number when arrival date changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'arrivalDate' && value.arrivalDate && !isManualSerialNumber) {
        const year = new Date(value.arrivalDate).getFullYear();
        if (!isNaN(year) && year > 1900) {
          getNextSerialNumber(year, 'incoming')
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
      const currentDate = form.getValues('arrivalDate');
      if (currentDate) {
        const year = new Date(currentDate).getFullYear();
        if (!isNaN(year) && year > 1900) {
          getNextSerialNumber(year, 'incoming')
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

  // Sync external scanData passed via navigation state
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
          message: translate('documents.forms.validation.serialNumberPositive'),
        });
        return;
      }

      const arrivalDate = form.getValues('arrivalDate');
      if (arrivalDate) {
        const year = new Date(arrivalDate).getFullYear();
        if (!isNaN(year) && year > 1900) {
          validateSerialNumber(value, year, 'incoming')
            .then((isValid) => {
              if (!isValid) {
                form.setError('serialNumber', {
                  type: 'manual',
                  message: translate('documents.forms.validation.serialNumberExists'),
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

  const handleStartScan = (scanTemporaryDocumentMutation: ScanMutationRunner) => {
    if (scanning) return;

    // If rescanning over a previous temporary scan, delete old temp file cleanly
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
        // Transient 404 before job registers on backend is ignored during polling
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
      onSuccess: (response: ScanResultData) => {
        stopPolling();
        clearLiveThumbnails();
        scanAbortRef.current = null;
        activeScanIdRef.current = null;
        if (!isMountedRef.current) return;

        const rawData = (
          response?.data && typeof response.data === 'object' ? response.data : response
        ) as ScanResultData;

        const resolvedScanId = String(rawData?.scanId || scanId);
        localScanIdRef.current = resolvedScanId;
        const normalizedScan: ScanResultData = {
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

  const onSubmit = async (data: FormValues & { ocrText?: string }) => {
    if (isScanInProgress) {
      toast.warning(translate('documents.forms.validation.waitScanFinish'));
      return;
    }

    try {
      const formData = new FormData();

      formData.append('serialNumber', data.serialNumber);
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
        formData.append('departmentIds', data.departments.join(','));
      }

      if (data.description) {
        formData.append('description', data.description);
      }

      if (data.activity && data.activity.trim() !== '') {
        formData.append('activity', data.activity);
        if (data.dateActivity) {
          formData.append('dateActivity', data.dateActivity.toISOString());
        }
      }

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

      await createIncomingDocument(formData);
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
      navigate('/dashboard/incoming-documents');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error(getErrorMessage(error, t.createError, lang));
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
    onSubmit,
    setActiveTab,
    handleSerialNumberChange,
    isManualSerialNumber,
    handleRemoveScan,
    restoredDraftAt,
    clearDraft,
  };
};
