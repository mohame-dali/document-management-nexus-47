import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FileScan,
  Loader2,
  AlertTriangle,
  XCircle,
  Settings,
  RotateCcw,
  CheckCircle2,
  Images,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import {
  ScanStage,
  LiveThumbnail,
  getScanStageLabel,
} from '@/services/scannerService';
import ScannedDocumentPreview, { ScanPreviewData } from './ScannedDocumentPreview';

interface ScannerStatus {
  error?: string;
  deviceId?: string;
  data?: {
    deviceId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ScannerTabProps {
  t: Record<string, string>;
  scanSettings: {
    resolution: string;
    format: string;
  };
  handleScanSettingChange: (key: string, value: string) => void;
  scanning: boolean;
  scanProgress: number;
  scanResult: ScanPreviewData | null;
  scanError?: string | null;
  liveThumbnails?: LiveThumbnail[];
  scannerStatus?: ScannerStatus | null;
  loadingScannerStatus?: boolean;
  handleStartScan: () => void;
  onRemoveScan?: () => void;
  scanStage?: ScanStage | null;
  scanPage?: number;
  onCancelScan?: () => void;
  onRescan?: () => void;
  onUseScan?: () => void;
  isScanAttached?: boolean;
}

const PIPELINE_STAGES: ScanStage[] = ['detecting', 'preparing', 'scanning', 'processing'];

const ScannerTab: React.FC<ScannerTabProps> = ({
  t,
  scanSettings,
  handleScanSettingChange,
  scanning,
  scanProgress,
  scanResult,
  scanError = null,
  liveThumbnails = [],
  scannerStatus,
  loadingScannerStatus = false,
  handleStartScan,
  onRemoveScan,
  scanStage = null,
  scanPage = 0,
  onCancelScan,
  onRescan,
  onUseScan,
  isScanAttached = false,
}) => {
  const navigate = useNavigate();
  const { t: translate, language } = useLanguage();
  const { dir } = useDirection();
  const lang: 'fr' | 'ar' = language === 'ar' ? 'ar' : 'fr';

  const tr = (key: string, frDefault: string, arDefault: string) => {
    const val = translate(key);
    if (val && val !== key) return val;
    return lang === 'ar' ? arDefault : frDefault;
  };

  const rawDeviceId = scannerStatus?.data?.deviceId ?? scannerStatus?.deviceId;
  const isScannerConfigured = Boolean(rawDeviceId && rawDeviceId !== 'Not selected');

  const normalizedSelectFormat =
    scanSettings.format?.toLowerCase() === 'jpeg'
      ? 'jpg'
      : scanSettings.format?.toLowerCase() || 'pdf';

  const clampedProgress = Math.min(Math.max(scanProgress, 0), 100);
  const stageLabel = getScanStageLabel(scanStage || 'scanning', scanPage || 0, translate, lang);
  const cancelLabel = tr('scanner.actions.cancel', 'Annuler', 'إلغاء');
  const effectiveError = scanError || (typeof scannerStatus?.error === 'string' && scannerStatus.error.trim() ? scannerStatus.error : null);

  // ASYNC OCR FIX: Guarantee cleanup of any component-scoped polling timer on unmount
  const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
        statusPollIntervalRef.current = null;
      }
    };
  }, []);

  // ASYNC OCR FIX: As soon as physical PDF is ready (scanStage === 'done' or scan finished), show PREVIEW immediately without waiting on background OCR
  const isPhysicalScanReady = Boolean(scanResult && (!scanning || scanStage === 'done'));

  // Determine the 4 explicit Dark Studio States:
  // State B: SCANNING
  // State C: ERROR
  // State D: PREVIEW
  // State A: IDLE
  const currentState: 'SCANNING' | 'ERROR' | 'PREVIEW' | 'IDLE' = isPhysicalScanReady
    ? 'PREVIEW'
    : scanning
      ? 'SCANNING'
      : effectiveError
        ? 'ERROR'
        : 'IDLE';

  const activeStageIndex = Math.max(
    0,
    PIPELINE_STAGES.indexOf((scanStage as ScanStage) || 'detecting')
  );

  return (
    <div
      dir={dir}
      className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 overflow-hidden shadow-lg"
    >
      {/* Top Studio Toolbar */}
      <div className="bg-zinc-900/95 border-b border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Device status pill + Config link */}
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs">
            <span
              className={`h-2 w-2 rounded-full flex-shrink-0 ${
                loadingScannerStatus
                  ? 'bg-zinc-400 animate-pulse'
                  : isScannerConfigured
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
              }`}
            />
            <span className="text-zinc-300 truncate max-w-[220px]" title={String(rawDeviceId || '')}>
              {loadingScannerStatus
                ? tr('scanner.checking', 'Vérification du scanner...', 'جاري التحقق من حالة الماسح الضوئي...')
                : isScannerConfigured
                  ? String(rawDeviceId)
                  : t.scannerNotConfigured || tr('scanner.notConfigured', 'Scanner non configuré', 'الماسح الضوئي غير مهيأ')}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/scan')}
            disabled={scanning}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 px-2.5 text-xs"
          >
            <Settings className="h-3.5 w-3.5 me-1.5" />
            {t.configureScanner || (lang === 'ar' ? 'إعداد الماسح الضوئي' : 'Configurer')}
          </Button>
        </div>

        {/* Format & Resolution Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">
              {t.format || (lang === 'ar' ? 'الصيغة' : 'Format')}
            </span>
            <Select
              value={normalizedSelectFormat}
              onValueChange={(value) => handleScanSettingChange('format', value)}
              disabled={scanning}
            >
              <SelectTrigger className="w-[100px] h-8 bg-zinc-950 border-zinc-700 text-zinc-100 text-xs">
                <SelectValue placeholder={lang === 'ar' ? 'الصيغة' : 'Format'} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <SelectItem value="pdf">{t.pdfFormat || 'PDF'}</SelectItem>
                <SelectItem value="jpg">{t.jpegFormat || 'JPEG'}</SelectItem>
                <SelectItem value="png">{t.pngFormat || 'PNG'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">
              {t.resolution || (lang === 'ar' ? 'الدقة' : 'DPI')}
            </span>
            <Select
              value={scanSettings.resolution}
              onValueChange={(value) => handleScanSettingChange('resolution', value)}
              disabled={scanning}
            >
              <SelectTrigger className="w-[110px] h-8 bg-zinc-950 border-zinc-700 text-zinc-100 text-xs">
                <SelectValue placeholder="DPI" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <SelectItem value="150">150 DPI</SelectItem>
                <SelectItem value="300">300 DPI</SelectItem>
                <SelectItem value="600">600 DPI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Dark Central Container (min-h-[520px]) */}
      <div className="min-h-[520px] bg-zinc-950 flex flex-col">
        {/* STATE A: IDLE */}
        {currentState === 'IDLE' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {loadingScannerStatus ? (
              <div className="flex flex-col items-center gap-3 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <span className="text-sm">
                  {lang === 'ar'
                    ? 'جاري التحقق من حالة الماسح الضوئي...'
                    : 'Vérification du scanner...'}
                </span>
              </div>
            ) : !isScannerConfigured ? (
              <div className="max-w-md w-full rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-semibold text-amber-200">
                    {t.scannerNotConfigured ||
                      (lang === 'ar' ? 'الماسح الضوئي غير مهيأ' : 'Scanner non configuré')}
                  </p>
                  <p className="text-sm text-amber-300/80">
                    {lang === 'ar'
                      ? 'يرجى توصيل الماسح الضوئي وتحديده في صفحة الإعداد أولاً.'
                      : 'Veuillez connecter votre scanner et le sélectionner dans la page de configuration.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/scan')}
                  className="border-amber-500/40 bg-zinc-950 text-amber-200 hover:bg-amber-950/60 hover:text-white"
                >
                  <Settings className="h-4 w-4 me-2" />
                  {t.configureScanner ||
                    (lang === 'ar' ? 'إعداد الماسح الضوئي' : 'Configurer le scanner')}
                </Button>
              </div>
            ) : (
              <div className="max-w-md w-full rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center space-y-5">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <FileScan className="h-8 w-8 text-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-semibold text-zinc-100">
                    {tr('scanner.studio.readyTitle', 'Prêt pour la numérisation', 'جاهز للمسح الضوئي')}
                  </h4>
                  <p className="text-sm text-zinc-400">
                    {tr(
                      'scanner.studio.readyHint',
                      'Placez votre document dans le scanner puis lancez la capture.',
                      'ضع المستند في الماسح الضوئي ثم ابدأ عملية المسح.'
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Badge className="bg-zinc-900 border border-zinc-700 text-zinc-200 uppercase">
                    {normalizedSelectFormat}
                  </Badge>
                  <Badge className="bg-zinc-900 border border-zinc-700 text-zinc-200">
                    <bdi dir="ltr">{scanSettings.resolution} DPI</bdi>
                  </Badge>
                </div>

                <Button
                  type="button"
                  onClick={handleStartScan}
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  <FileScan className="me-2 h-5 w-5" />
                  {t.scanDocument || (lang === 'ar' ? 'مسح المستند' : 'Numériser le document')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STATE B: SCANNING */}
        {currentState === 'SCANNING' && (
          <div className="flex-1 flex flex-col justify-between p-6 gap-6">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="max-w-lg w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6">
                {/* Animated Scanner Status */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                    </div>
                    <div className="min-w-0 text-start">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{stageLabel}</p>
                      <p className="text-xs text-zinc-400">
                        {normalizedSelectFormat.toUpperCase()} · <bdi dir="ltr">{scanSettings.resolution} DPI</bdi>
                        {scanPage > 0 && (
                          <>
                            {' · '}
                            {lang === 'ar' ? `الصفحة ${scanPage}` : `Page ${scanPage}`}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-semibold text-emerald-400 flex-shrink-0">
                    <bdi dir="ltr">{clampedProgress}%</bdi>
                  </span>
                </div>

                {/* Real Progress Bar */}
                <Progress
                  value={clampedProgress}
                  className="h-2.5 bg-zinc-800 [&>div]:bg-emerald-500"
                />

                {/* Stage Stepper */}
                <div className="grid grid-cols-4 gap-2">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const isCompleted = idx < activeStageIndex;
                    const isCurrent = idx === activeStageIndex;
                    return (
                      <div
                        key={stage}
                        className={`rounded-md px-2 py-1.5 text-center text-[11px] border transition-colors ${
                          isCurrent
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-medium'
                            : isCompleted
                              ? 'border-zinc-700 bg-zinc-800/80 text-zinc-300'
                              : 'border-zinc-800 bg-zinc-950/60 text-zinc-500'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1 justify-center">
                          {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                          {getScanStageLabel(stage, 0, translate, lang).replace(/\.\.\.$/, '')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Cancel Action */}
                {onCancelScan && (
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancelScan}
                      className="border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-900/50 hover:text-white"
                    >
                      <XCircle className="me-2 h-4 w-4" />
                      {cancelLabel}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Multi-Page Thumbnails Strip inside Dark Stage */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Images className="h-4 w-4 text-emerald-400" />
                  {tr(
                    'scanner.liveThumbnails.title',
                    'Pages numérisées en direct',
                    'الصفحات الممسوحة مباشرة'
                  )}
                </span>
                <Badge className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  <bdi dir="ltr">{liveThumbnails.length}</bdi>
                </Badge>
              </div>

              {liveThumbnails.length > 0 ? (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {liveThumbnails.map((thumb) => (
                    <div
                      key={thumb.page}
                      className="relative flex-shrink-0 rounded-md overflow-hidden border border-zinc-700 bg-zinc-950 shadow-sm"
                    >
                      <img
                        src={thumb.url}
                        alt={`Page ${thumb.page}`}
                        className="h-24 w-20 object-cover block"
                      />
                      <span className="absolute bottom-1 end-1 rounded bg-zinc-950/85 border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-100">
                        <bdi dir="ltr">P.{thumb.page}</bdi>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 rounded-md border border-dashed border-zinc-800 bg-zinc-950/60 text-xs text-zinc-500">
                  {stageLabel}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATE C: ERROR */}
        {currentState === 'ERROR' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full rounded-xl border border-red-500/40 bg-red-950/25 p-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-red-200">
                  {getScanStageLabel('error', 0, translate, lang)}
                </p>
                <p className="text-sm text-red-200/80">{effectiveError}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={onRescan || handleStartScan}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  <RotateCcw className="h-4 w-4 me-1.5" />
                  {tr('scanner.actions.retry', 'Réessayer', 'إعادة المحاولة')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/scan')}
                  className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                >
                  <Settings className="h-4 w-4 me-1.5" />
                  {t.configureScanner ||
                    (lang === 'ar' ? 'إعداد الماسح الضوئي' : 'Configurer le scanner')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STATE D: PREVIEW */}
        {currentState === 'PREVIEW' && scanResult && (
          <ScannedDocumentPreview
            t={t}
            scanResult={scanResult}
            onRemove={onRemoveScan}
            onRescan={onRescan || handleStartScan}
            onUseScan={onUseScan}
            isScanAttached={isScanAttached}
            embedded
          />
        )}
      </div>
    </div>
  );
};

export default ScannerTab;
