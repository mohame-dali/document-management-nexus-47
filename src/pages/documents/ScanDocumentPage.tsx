import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useDirection } from '@/i18n/useDirection';
import { useLanguage } from '@/contexts/LanguageProvider';

import ScannerSetup from '@/components/scanner/ScannerSetup';
import ScanSettingsComponent from '@/components/scanner/ScanSettings';
import ScanResult, { ScanResultData } from '@/components/scanner/ScanResult';
import RecentScans from '@/components/scanner/RecentScans';

import {
  ScanStage,
  LiveThumbnail,
  getScannerStatus,
  listScanners,
  selectScanner,
  scanDocument,
  scanTemporaryDocument,
  getRecentScans,
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

const ScanDocumentPage: React.FC = () => {
  const navigate = useNavigate();
  const { dir } = useDirection();
  const { t: translate, language } = useLanguage();
  const lang: 'fr' | 'ar' = language === 'ar' ? 'ar' : 'fr';

  const translations = useMemo(() => {
    if (lang === 'ar') {
      return {
        title: 'مسح الوثائق',
        scannerSetup: 'إعداد الماسح الضوئي',
        availableScanners: 'الماسحات الضوئية المتاحة',
        noScannersDetected: 'لم يتم اكتشاف أي ماسح ضوئي',
        refreshScanners: 'تحديث قائمة الماسحات الضوئية',
        searchingScanners: 'جاري البحث عن الماسحات الضوئية...',
        selectScanner: 'اختر ماسح ضوئي',
        scanSettings: 'إعدادات المسح',
        documentType: 'نوع المستند',
        incoming: 'وارد',
        outgoing: 'صادر',
        resolution: 'الدقة',
        format: 'الصيغة',
        scanDocument: 'بدء المسح',
        scanning: 'جاري المسح...',
        scanComplete: 'تم المسح بنجاح',
        scanFailed: 'فشل المسح',
        viewDocument: 'عرض المستند',
        createRecordFromScan: 'استخدام هذا المسح',
        recentScans: 'عمليات المسح الأخيرة',
        noRecentScans: 'لا توجد عمليات مسح حديثة',
        scanInfo: 'معلومات المسح',
        ocrText: 'نص مستخرج من التعرف الضوئي على الحروف (OCR)',
        noOcrText: 'لم يتم استخراج أي نص',
        error: 'حدث خطأ',
        scannerSelected: 'تم اختيار الماسح الضوئي',
      };
    }
    return {
      title: 'Numérisation des documents',
      scannerSetup: 'Configuration du scanner',
      availableScanners: 'Scanners disponibles',
      noScannersDetected: 'Aucun scanner physique détecté',
      refreshScanners: 'Actualiser la liste des scanners',
      searchingScanners: 'Recherche de scanners en cours...',
      selectScanner: 'Sélectionner un scanner',
      scanSettings: 'Paramètres de numérisation',
      documentType: 'Type de document',
      incoming: 'Courrier entrant',
      outgoing: 'Courrier sortant',
      resolution: 'Résolution',
      format: 'Format',
      scanDocument: 'Numériser (aperçu temporaire)',
      scanning: 'Numérisation en cours...',
      scanComplete: 'Numérisation terminée',
      scanFailed: 'Échec de la numérisation',
      viewDocument: 'Aperçu du document',
      createRecordFromScan: 'Utiliser ce scan',
      recentScans: 'Numérisations récentes',
      noRecentScans: 'Aucune numérisation récente',
      scanInfo: 'Résultat de la numérisation',
      ocrText: 'Texte extrait (OCR)',
      noOcrText: 'Aucun texte extrait',
      error: 'Erreur',
      scannerSelected: 'Scanner sélectionné',
    };
  }, [lang]);

  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState('');
  const [scanSettings, setScanSettings] = useState({
    documentType: 'incoming',
    resolution: '300',
    format: 'pdf',
  });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanStage, setScanStage] = useState<ScanStage | null>(null);
  const [scanPage, setScanPage] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [liveThumbnails, setLiveThumbnails] = useState<LiveThumbnail[]>([]);
  const [lastTemporaryMode, setLastTemporaryMode] = useState(true);

  const isMountedRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  const thumbAbortRef = useRef<AbortController | null>(null);
  const activeScanIdRef = useRef<string | null>(null);
  const thumbnailUrlsRef = useRef<string[]>([]);
  const fetchedThumbPagesRef = useRef<Set<number>>(new Set());
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
    };
  }, [stopPolling, clearLiveThumbnails]);

  // Get scanner status
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['scannerStatus'],
    queryFn: getScannerStatus,
  });

  useEffect(() => {
    const devId = statusData?.selectedDevice?.id || statusData?.data?.deviceId || statusData?.deviceId;
    if (typeof devId === 'string' && devId && devId !== 'Not selected') {
      setSelectedScanner(devId);
    }
  }, [statusData]);

  // List available scanners (uses server cache on initial load)
  const {
    data: scannersData,
    isLoading: isScannersLoading,
    isFetching: isScannersFetching,
  } = useQuery({
    queryKey: ['scanners'],
    queryFn: () => listScanners({ refresh: false }),
  });

  const handleRefreshScanners = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const freshScanners = await listScanners({ refresh: true });
      queryClient.setQueryData(['scanners'], freshScanners);
    } catch (error: unknown) {
      queryClient.setQueryData(['scanners'], []);
      toast.error(getScannerErrorMessage(error, translate, lang));
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  };

  // Get recent scans
  const { data: recentScansData, isLoading: isRecentScansLoading, refetch: refetchRecentScans } = useQuery({
    queryKey: ['recentScans'],
    queryFn: () => getRecentScans(),
  });

  // Select scanner mutation
  const selectScannerMutation = useMutation({
    mutationFn: (deviceId: string) => selectScanner(deviceId),
    onSuccess: () => {
      toast.success(translations.scannerSelected);
      refetchStatus();
    },
    onError: (error: unknown) => {
      toast.error(getScannerErrorMessage(error, translate, lang));
    },
  });

  // Scan document mutation
  const scanDocumentMutation = useMutation({
    mutationFn: (options: {
      temporary: boolean;
      documentType: string;
      resolution: string;
      format: string;
      scanId: string;
      signal: AbortSignal;
    }) => {
      if (options.temporary) {
        return scanTemporaryDocument({
          documentType: options.documentType,
          format: options.format as 'pdf' | 'jpg' | 'jpeg' | 'png',
          resolution: Number(options.resolution),
          scanId: options.scanId,
          signal: options.signal,
        });
      }
      return scanDocument({
        documentType: (options.documentType === 'outgoing' ? 'outgoing' : 'incoming'),
        config: {
          format: options.format as 'pdf' | 'jpg' | 'jpeg' | 'png',
          resolution: Number(options.resolution),
        },
        scanId: options.scanId,
        signal: options.signal,
      });
    },
    onSuccess: (response, variables) => {
      stopPolling();
      clearLiveThumbnails();
      scanAbortRef.current = null;
      activeScanIdRef.current = null;
      if (!isMountedRef.current) return;

      const resolvedScanId = String(response?.scanId || variables.scanId);
      const normalized: ScanResultData = {
        ...response,
        scanId: resolvedScanId,
        filePath: response?.filePath || `/api/scan/file/${resolvedScanId}`,
        documentType: response?.documentType || variables.documentType,
        format: response?.format || variables.format,
        pageCount: Number(response?.pageCount || maxPagesSeenRef.current || 1),
      };

      setScanning(false);
      setScanError(null);
      setScanStage('done');
      setScanPage(Number(normalized.pageCount || 1));
      setProgress(100);
      setScanResult(normalized);
      toast.success(translations.scanComplete || getScanStageLabel('done', 0, translate, lang));
      refetchRecentScans();
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
      setProgress(0);

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

  const handleScanSettingChange = (key: string, value: string) => {
    setScanSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
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
    setProgress(0);
    toast.info(
      getScannerErrorMessage({ response: { data: { code: 'SCAN_CANCELLED' } } }, translate, lang)
    );
  };

  const handleScanDocument = (temporary = true) => {
    if (scanning) return;

    if (scanResult?.scanId && typeof scanResult.scanId === 'string') {
      deleteScan(scanResult.scanId).catch(() => {});
    }

    stopPolling();
    clearLiveThumbnails();
    const scanId = createScanId();
    const controller = new AbortController();
    const thumbController = new AbortController();

    setLastTemporaryMode(temporary);
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
    setProgress(getScanStageProgress('detecting', 0));

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
          setProgress(0);
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
        setProgress(getScanStageProgress(stage, page));

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
        // Ignore transient 404 before job registers on backend
      }
    }, 1000);

    scanDocumentMutation.mutate({
      ...scanSettings,
      temporary,
      scanId,
      signal: controller.signal,
    });
  };

  const handleDiscardScan = () => {
    const scanId = scanResult?.scanId;
    if (typeof scanId === 'string' && scanId) {
      deleteScan(scanId).catch(() => {});
    }
    clearLiveThumbnails();
    setScanResult(null);
    setScanError(null);
    setScanStage(null);
    setScanPage(0);
    setProgress(0);
  };

  const handleCreateFromScan = () => {
    if (!scanResult) return;

    const targetType = (scanResult.documentType as string) || scanSettings.documentType;
    if (targetType === 'incoming') {
      navigate('/dashboard/incoming-documents/create', {
        state: {
          scanData: scanResult,
          autoFill: true,
        },
      });
    } else {
      navigate('/dashboard/outgoing-documents/create', {
        state: {
          scanData: scanResult,
          autoFill: true,
        },
      });
    }
  };

  return (
    <div className="container mx-auto p-4" dir={dir}>
      <h1 className="text-2xl font-bold mb-6">{translations.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ScannerSetup
            t={translations}
            selectedScanner={selectedScanner}
            onSelectScanner={(deviceId) => {
              setSelectedScanner(deviceId);
              selectScannerMutation.mutate(deviceId);
            }}
            onRefreshScanners={handleRefreshScanners}
            scannersData={scannersData || []}
            isScannersLoading={isScannersLoading || isScannersFetching || isScanning}
            isScanning={isScannersLoading || isScannersFetching || isScanning}
          />

          <ScanSettingsComponent
            t={translations}
            scanSettings={scanSettings}
            onSettingChange={handleScanSettingChange}
            onScanDocument={handleScanDocument}
            selectedScanner={selectedScanner}
            scanning={scanning}
          />

          <ScanResult
            t={translations}
            scanning={scanning}
            progress={progress}
            scanStage={scanStage}
            scanPage={scanPage}
            scanResult={scanResult}
            scanError={scanError}
            liveThumbnails={liveThumbnails}
            onCreateFromScan={handleCreateFromScan}
            onCancelScan={handleCancelScan}
            onRescan={() => handleScanDocument(lastTemporaryMode)}
            onDiscard={handleDiscardScan}
          />
        </div>

        <div>
          <RecentScans
            t={translations}
            recentScansData={recentScansData || []}
            isRecentScansLoading={isRecentScansLoading}
            onSelectScan={(scan: Record<string, unknown>) => {
              setScanResult(scan as ScanResultData);
              setScanSettings((prev) => ({
                ...prev,
                documentType: (scan.documentType as string) || 'incoming',
              }));
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ScanDocumentPage;
