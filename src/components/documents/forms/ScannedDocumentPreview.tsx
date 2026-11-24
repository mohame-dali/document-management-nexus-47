import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Eye,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Download,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { getScanFileBlob, OcrStatus } from '@/services/scannerService';
import api from '@/services/apiService';

export interface ScanPreviewData {
  scanId?: string;
  fileName?: string;
  filename?: string;
  filePath?: string;
  fileUrl?: string;
  format?: string;
  pageCount?: number;
  pages?: number;
  serialNumber?: string | number;
  documentType?: string;
  ocrText?: string;
  // ASYNC OCR FIX: Track background OCR status without blocking preview or actions
  ocrStatus?: OcrStatus;
  [key: string]: unknown;
}

interface ScannedDocumentPreviewProps {
  t?: Record<string, string>;
  scanResult: ScanPreviewData | null;
  onRemove?: () => void;
  onRescan?: () => void;
  onUseScan?: () => void;
  isScanAttached?: boolean;
  embedded?: boolean;
  API_URL?: string;
}

function inferExtension(scanResult: ScanPreviewData, mimeType: string): string {
  if (typeof scanResult.format === 'string' && scanResult.format.trim()) {
    const fmt = scanResult.format.trim().toLowerCase();
    return fmt === 'jpeg' ? 'jpg' : fmt;
  }
  const pathCandidate = String(
    scanResult.fileName || scanResult.filename || scanResult.filePath || ''
  ).toLowerCase();
  if (pathCandidate.endsWith('.png') || mimeType.includes('png')) return 'png';
  if (
    pathCandidate.endsWith('.jpg') ||
    pathCandidate.endsWith('.jpeg') ||
    mimeType.includes('jpeg') ||
    mimeType.includes('jpg')
  ) {
    return 'jpg';
  }
  return 'pdf';
}

const ScannedDocumentPreview: React.FC<ScannedDocumentPreviewProps> = ({
  t = {},
  scanResult,
  onRemove,
  onRescan,
  onUseScan,
  isScanAttached = false,
  embedded = false,
}) => {
  const { t: translate, language } = useLanguage();
  const { dir } = useDirection();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isLoadingBlob, setIsLoadingBlob] = useState<boolean>(false);
  const [blobError, setBlobError] = useState<boolean>(false);
  const [retryCounter, setRetryCounter] = useState<number>(0);
  const [showOcr, setShowOcr] = useState<boolean>(false);

  const objectUrlRef = useRef<string | null>(null);

  const scanId = typeof scanResult?.scanId === 'string' ? scanResult.scanId : undefined;
  const filePath = typeof scanResult?.filePath === 'string' ? scanResult.filePath : undefined;

  useEffect(() => {
    const revokeCurrentUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    // Synchronously clear any previous/stale Object URL before evaluating or loading
    revokeCurrentUrl();
    setBlobUrl(null);
    setMimeType('');
    setBlobError(false);

    if (!scanResult) {
      setIsLoadingBlob(false);
      return;
    }

    const canFetchProtectedFile = Boolean(scanId || filePath);
    if (!canFetchProtectedFile) {
      setIsLoadingBlob(false);
      return;
    }

    const controller = new AbortController();
    let createdObjectUrl: string | null = null;
    let isActive = true;

    setIsLoadingBlob(true);

    const loadPreview = async () => {
      try {
        let blob: Blob;
        const isProtectedScanEndpoint = Boolean(
          scanId &&
            (!filePath ||
              filePath.startsWith('/api/scan/file/') ||
              filePath.startsWith('api/scan/file/'))
        );

        if (isProtectedScanEndpoint && scanId) {
          blob = await getScanFileBlob(scanId, controller.signal);
        } else if (filePath) {
          const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
          const response = await api.get(cleanPath, {
            baseURL: '',
            responseType: 'blob',
            signal: controller.signal,
            timeout: 60000,
          });
          blob = response.data;
        } else {
          throw new Error('NO_PREVIEW_SOURCE');
        }

        createdObjectUrl = URL.createObjectURL(blob);
        if (!isActive) {
          URL.revokeObjectURL(createdObjectUrl);
          createdObjectUrl = null;
          return;
        }

        objectUrlRef.current = createdObjectUrl;
        setBlobUrl(createdObjectUrl);
        setMimeType(blob.type || '');
      } catch (err: unknown) {
        if (!isActive) return;
        const errObj = err as { name?: string; code?: string };
        if (errObj?.name === 'AbortError' || errObj?.code === 'ERR_CANCELED') {
          return;
        }
        setBlobUrl(null);
        setBlobError(true);
      } finally {
        if (isActive) {
          setIsLoadingBlob(false);
        }
      }
    };

    loadPreview();

    return () => {
      isActive = false;
      controller.abort();
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
        if (objectUrlRef.current === createdObjectUrl) {
          objectUrlRef.current = null;
        }
        createdObjectUrl = null;
      }
      revokeCurrentUrl();
    };
  }, [scanResult, scanId, filePath, retryCounter]);

  if (!scanResult) return null;

  const ext = inferExtension(scanResult, mimeType);
  const isImage =
    ext === 'jpg' || ext === 'jpeg' || ext === 'png' || mimeType.startsWith('image/');
  const pageCount = Number(scanResult.pageCount ?? scanResult.pages ?? 0);
  const displayName =
    (scanResult.fileName as string) ||
    (scanResult.filename as string) ||
    (scanId ? `scan-${scanId.slice(0, 8)}.${ext}` : filePath?.split('/').pop() || `scan.${ext}`);

  const tr = (key: string, frDefault: string, arDefault: string) => {
    const val = translate(key);
    if (val && val !== key) return val;
    return language === 'ar' ? arDefault : frDefault;
  };

  const handleOpenInNewTab = () => {
    if (!blobUrl) return;
    const newTab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (newTab) {
      newTab.opener = null;
    }
  };

  const studioContent = (
    <div
      dir={dir}
      className="flex flex-col flex-1 min-h-[520px] bg-zinc-950 text-zinc-100 justify-between"
    >
      {/* Top Preview Metadata Bar */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <FileText className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span className="text-sm font-medium text-zinc-100 truncate max-w-[240px]" title={displayName}>
            {displayName}
          </span>
          {scanResult.format && (
            <Badge
              variant="outline"
              className="uppercase border-zinc-700 bg-zinc-950 text-zinc-200 text-xs"
            >
              {String(scanResult.format)}
            </Badge>
          )}
          {pageCount > 0 && (
            <Badge className="bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs">
              <bdi dir="ltr">{pageCount}</bdi>{' '}
              {language === 'ar' ? 'صفحة' : pageCount > 1 ? 'pages' : 'page'}
            </Badge>
          )}
          {isScanAttached && (
            <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 me-1" />
              {tr('scanner.actions.scanAttached', 'Scan rattaché au courrier', 'تم إرفاق المسح بالمراسلة')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {blobUrl && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:text-white flex items-center gap-1.5"
              >
                <Eye className="h-4 w-4" />
                <span>
                  {tr('scanner.actions.openPreview', 'Ouvrir dans un onglet', 'فتح في تبويب جديد')}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:text-white"
              >
                <a href={blobUrl} download={displayName} className="flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  <span>{tr('scanner.actions.downloadPreview', 'Télécharger', 'تنزيل')}</span>
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Central Dark Document Viewport */}
      <div className="flex-1 min-h-[380px] bg-zinc-950 p-3 flex items-center justify-center">
        {isLoadingBlob ? (
          <div className="flex flex-col items-center justify-center h-[380px] w-full gap-3 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm">
              {tr('scanner.preview.loading', 'Chargement de l’aperçu...', 'جاري تحميل المعاينة...')}
            </p>
          </div>
        ) : blobError ? (
          <div className="flex flex-col items-center justify-center h-[380px] w-full gap-3 p-4 text-center">
            <div className="h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-sm text-zinc-300 max-w-md">
              {tr(
                'scanner.preview.error',
                'Impossible de charger l’aperçu du document numérisé.',
                'تعذر تحميل معاينة المستند الممسوح ضوئياً.'
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRetryCounter((c) => c + 1)}
              className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4 me-1.5" />
              {tr('scanner.actions.retryPreview', 'Réessayer l’aperçu', 'إعادة محاولة المعاينة')}
            </Button>
          </div>
        ) : blobUrl ? (
          isImage ? (
            <div className="w-full flex justify-center items-center bg-zinc-900/70 rounded-lg border border-zinc-800 p-4">
              <img
                src={blobUrl}
                alt={displayName}
                className="max-h-[460px] w-auto rounded border border-zinc-700 bg-zinc-950 object-contain shadow-md"
              />
            </div>
          ) : (
            <iframe
              src={blobUrl}
              title={tr(
                'scanner.preview.title',
                'Aperçu du document numérisé',
                'معاينة المستند الممسوح ضوئياً'
              )}
              className="w-full h-[460px] rounded-lg border border-zinc-800 bg-white"
            />
          )
        ) : null}
      </div>

      {/* ASYNC OCR FIX: Non-blocking background OCR status indicator while PDF & action buttons remain usable */}
      {!scanResult.ocrText && scanResult.ocrStatus === 'processing' && (
        <div className="border-t border-zinc-800 bg-zinc-900/60 px-4 py-2 flex items-center gap-2 text-xs text-zinc-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400 flex-shrink-0" />
          <span>
            {tr(
              'scanner.ocr.backgroundProcessing',
              'Extraction OCR en cours en arrière-plan (vous pouvez déjà utiliser et enregistrer ce document)...',
              'جاري استخراج النص (OCR) في الخلفية (يمكنك استخدام المستند وحفظه الآن)...'
            )}
          </span>
        </div>
      )}

      {/* Collapsible Dark OCR Drawer */}
      {scanResult.ocrText && (
        <div className="border-t border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setShowOcr((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-zinc-300 hover:text-white"
          >
            <span>
              {t.ocrText || (language === 'ar' ? 'النص المستخرج (OCR)' : 'Texte extrait (OCR)')}
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              {showOcr
                ? tr('scanner.actions.hideOcr', 'Masquer le texte OCR', 'إخفاء النص المستخرج')
                : tr('scanner.actions.showOcr', 'Afficher le texte OCR', 'عرض النص المستخرج (OCR)')}
              {showOcr ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>

          {showOcr && (
            <div className="mt-2 bg-zinc-950 border border-zinc-800 p-3 rounded-md max-h-36 overflow-y-auto">
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-zinc-300 text-start">
                {scanResult.ocrText.length > 1000
                  ? `${scanResult.ocrText.substring(0, 1000)}...`
                  : scanResult.ocrText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Studio Action Footer: Refaire / Utiliser ce scan / Jeter */}
      <div className="bg-zinc-900/90 border-t border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {onRescan && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRescan}
              className="border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800 hover:text-white"
            >
              <RotateCcw className="h-4 w-4 me-1.5" />
              {tr('scanner.actions.rescan', 'Refaire', 'إعادة المسح')}
            </Button>
          )}
          {onUseScan && (
            <Button
              type="button"
              size="sm"
              onClick={onUseScan}
              className={
                isScanAttached
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }
            >
              <CheckCircle2 className="h-4 w-4 me-1.5" />
              {isScanAttached
                ? tr('scanner.actions.scanAttached', 'Scan rattaché au courrier', 'تم إرفاق المسح بالمراسلة')
                : tr('scanner.actions.useScan', 'Utiliser ce scan', 'استخدام هذا المسح')}
            </Button>
          )}
        </div>

        {onRemove && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            className="bg-red-600/90 hover:bg-red-600 text-white"
          >
            <Trash2 className="h-4 w-4 me-1.5" />
            {tr('scanner.actions.discard', 'Jeter', 'تجاهل وحذف')}
          </Button>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return studioContent;
  }

  return (
    <Card className="mt-4 overflow-hidden border-zinc-800 bg-zinc-950 text-zinc-100">
      <CardHeader className="pb-3 border-b border-zinc-800 bg-zinc-900">
        <CardTitle className="text-base flex items-center gap-2 text-zinc-100">
          <FileText className="h-5 w-5 text-emerald-400" />
          <span>
            {tr('scanner.preview.title', 'Aperçu du document numérisé', 'معاينة المستند الممسوح ضوئياً')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">{studioContent}</CardContent>
    </Card>
  );
};

export default ScannedDocumentPreview;
