import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { getScanFileBlob } from '@/services/scannerService';
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
  [key: string]: unknown;
}

interface ScannedDocumentPreviewProps {
  t?: Record<string, string>;
  scanResult: ScanPreviewData | null;
  onRemove?: () => void;
  onRescan?: () => void;
  onUseScan?: () => void;
  isScanAttached?: boolean;
  API_URL?: string;
}

function inferExtension(scanResult: ScanPreviewData, mimeType: string): string {
  if (typeof scanResult.format === 'string' && scanResult.format.trim()) {
    const fmt = scanResult.format.trim().toLowerCase();
    return fmt === 'jpeg' ? 'jpg' : fmt;
  }
  const pathCandidate = String(scanResult.fileName || scanResult.filename || scanResult.filePath || '').toLowerCase();
  if (pathCandidate.endsWith('.png') || mimeType.includes('png')) return 'png';
  if (pathCandidate.endsWith('.jpg') || pathCandidate.endsWith('.jpeg') || mimeType.includes('jpeg') || mimeType.includes('jpg')) {
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
}) => {
  const { t: translate, language } = useLanguage();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isLoadingBlob, setIsLoadingBlob] = useState<boolean>(false);
  const [blobError, setBlobError] = useState<boolean>(false);
  const [retryCounter, setRetryCounter] = useState<number>(0);

  const scanId = typeof scanResult?.scanId === 'string' ? scanResult.scanId : undefined;
  const filePath = typeof scanResult?.filePath === 'string' ? scanResult.filePath : undefined;

  useEffect(() => {
    if (!scanResult) {
      setBlobUrl(null);
      setMimeType('');
      setBlobError(false);
      return;
    }

    const canFetchProtectedFile = Boolean(scanId || filePath);
    if (!canFetchProtectedFile) {
      setBlobUrl(null);
      setBlobError(false);
      return;
    }

    const controller = new AbortController();
    let createdObjectUrl: string | null = null;
    let isActive = true;

    const loadPreview = async () => {
      setIsLoadingBlob(true);
      setBlobError(false);

      try {
        let blob: Blob;
        const isProtectedScanEndpoint = Boolean(
          scanId && (!filePath || filePath.startsWith('/api/scan/file/') || filePath.startsWith('api/scan/file/'))
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

        if (!isActive) return;
        createdObjectUrl = URL.createObjectURL(blob);
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
      }
    };
  }, [scanResult, scanId, filePath, retryCounter]);

  if (!scanResult) return null;

  const ext = inferExtension(scanResult, mimeType);
  const isImage = ext === 'jpg' || ext === 'jpeg' || ext === 'png' || mimeType.startsWith('image/');
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

  return (
    <Card className="mt-4 border-[#e2e8f0] bg-white">
      <CardHeader className="pb-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
        <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[#1a202c]">
            <FileText className="h-5 w-5 text-emerald-600" />
            <span>{tr('scanner.preview.title', 'Aperçu du document numérisé', 'معاينة المستند الممسوح ضوئياً')}</span>
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            {scanResult.format && (
              <Badge variant="outline" className="uppercase">
                {String(scanResult.format)}
              </Badge>
            )}
            {pageCount > 0 && (
              <Badge variant="secondary">
                {pageCount} {language === 'ar' ? 'صفحة' : pageCount > 1 ? 'pages' : 'page'}
              </Badge>
            )}
            {isScanAttached && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                {tr('scanner.actions.scanAttached', 'Scan rattaché au courrier', 'تم إرفاق المسح بالمراسلة')}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span className="text-sm font-medium truncate" title={displayName}>
              {displayName}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {blobUrl && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-4 w-4" />
                  <span>{tr('scanner.actions.openPreview', 'Ouvrir dans un onglet', 'فتح في تبويب جديد')}</span>
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={blobUrl} download={displayName} className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{tr('scanner.actions.downloadPreview', 'Télécharger', 'تنزيل')}</span>
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Protected Blob Preview */}
        <div className="border border-slate-200 rounded bg-slate-50 overflow-hidden">
          {isLoadingBlob ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-600">
              <Loader2 className="h-6 w-6 animate-spin text-[#2c5282]" />
              <p className="text-sm">{tr('scanner.preview.loading', 'Chargement de l’aperçu...', 'جاري تحميل المعاينة...')}</p>
            </div>
          ) : blobError ? (
            <div className="flex flex-col items-center justify-center h-56 gap-3 p-4 text-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
              <p className="text-sm text-slate-700">
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
              >
                <RefreshCw className="h-4 w-4 me-1" />
                {tr('scanner.actions.retryPreview', 'Réessayer l’aperçu', 'إعادة محاولة المعاينة')}
              </Button>
            </div>
          ) : blobUrl ? (
            isImage ? (
              <div className="p-3 bg-slate-100 flex justify-center">
                <img
                  src={blobUrl}
                  alt={displayName}
                  className="max-h-[420px] w-auto rounded border bg-white object-contain"
                />
              </div>
            ) : (
              <iframe
                src={blobUrl}
                title={tr('scanner.preview.title', 'Aperçu du document numérisé', 'معاينة المستند الممسوح ضوئياً')}
                className="w-full h-[420px] bg-white border-0"
              />
            )
          ) : null}
        </div>

        {/* OCR Text Preview */}
        {scanResult.ocrText && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {t.ocrText || (language === 'ar' ? 'النص المستخرج (OCR)' : 'Texte extrait (OCR)')}
            </h4>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded max-h-32 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap text-slate-700">
                {scanResult.ocrText.length > 400
                  ? `${scanResult.ocrText.substring(0, 400)}...`
                  : scanResult.ocrText}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons: Refaire / Utiliser ce scan / Jeter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e2e8f0]">
          <div className="flex flex-wrap items-center gap-2">
            {onRescan && (
              <Button type="button" variant="outline" size="sm" onClick={onRescan}>
                <RotateCcw className="h-4 w-4 me-1" />
                {tr('scanner.actions.rescan', 'Refaire', 'إعادة المسح')}
              </Button>
            )}
            {onUseScan && (
              <Button
                type="button"
                variant={isScanAttached ? 'secondary' : 'default'}
                size="sm"
                onClick={onUseScan}
                className={isScanAttached ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : ''}
              >
                <CheckCircle2 className="h-4 w-4 me-1" />
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
            >
              <Trash2 className="h-4 w-4 me-1" />
              {tr('scanner.actions.discard', 'Jeter', 'تجاهل وحذف')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScannedDocumentPreview;
