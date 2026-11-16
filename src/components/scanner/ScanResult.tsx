import React from 'react';
import { Check, XCircle, AlertTriangle, RotateCcw, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { ScanStage, LiveThumbnail, getScanStageLabel } from '@/services/scannerService';
import ScannedDocumentPreview, { ScanPreviewData } from '@/components/documents/forms/ScannedDocumentPreview';

export type ScanResultData = ScanPreviewData;

interface ScanResultProps {
  t: Record<string, string>;
  scanning: boolean;
  progress: number;
  scanStage?: ScanStage | null;
  scanPage?: number;
  scanResult: ScanResultData | null;
  scanError?: string | null;
  liveThumbnails?: LiveThumbnail[];
  onCreateFromScan: () => void;
  onCancelScan?: () => void;
  onRescan?: () => void;
  onDiscard?: () => void;
  API_URL?: string;
}

const ScanResult: React.FC<ScanResultProps> = ({
  t,
  scanning,
  progress,
  scanStage = null,
  scanPage = 0,
  scanResult,
  scanError = null,
  liveThumbnails = [],
  onCreateFromScan,
  onCancelScan,
  onRescan,
  onDiscard,
}) => {
  const { t: translate, language } = useLanguage();
  const { dir } = useDirection();
  const lang: 'fr' | 'ar' = language === 'ar' ? 'ar' : 'fr';

  if (!scanning && !scanResult && !scanError) return null;

  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const stageLabel = getScanStageLabel(scanStage || 'scanning', scanPage || 0, translate, lang);
  const cancelLabel = (() => {
    const val = translate('scanner.actions.cancel');
    return val && val !== 'scanner.actions.cancel' ? val : lang === 'ar' ? 'إلغاء' : 'Annuler';
  })();
  const retryLabel = (() => {
    const val = translate('scanner.actions.retry');
    return val && val !== 'scanner.actions.retry' ? val : lang === 'ar' ? 'إعادة المحاولة' : 'Réessayer';
  })();

  return (
    <div dir={dir} className="space-y-4">
      {scanning && (
        <Card className="border-zinc-800 bg-zinc-950 text-zinc-100 overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-900/90">
            <CardTitle className="flex items-center justify-between gap-2 text-base text-zinc-100">
              <span>{stageLabel || t.scanning}</span>
              <span className="text-sm font-semibold text-emerald-400">
                <bdi dir="ltr">{clampedProgress}%</bdi>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <Progress
              value={clampedProgress}
              className="h-2.5 bg-zinc-800 [&>div]:bg-emerald-500"
            />

            {liveThumbnails.length > 0 && (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Images className="h-4 w-4 text-emerald-400" />
                    {lang === 'ar' ? 'الصفحات الممسوحة مباشرة' : 'Pages numérisées en direct'}
                  </span>
                  <Badge className="bg-zinc-800 border-zinc-700 text-zinc-200">
                    <bdi dir="ltr">{liveThumbnails.length}</bdi>
                  </Badge>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {liveThumbnails.map((thumb) => (
                    <div
                      key={thumb.page}
                      className="relative flex-shrink-0 w-20 h-28 rounded-md overflow-hidden border border-zinc-700 bg-zinc-950"
                    >
                      <img
                        src={thumb.url}
                        alt={`Page ${thumb.page}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 end-1 rounded bg-zinc-950/85 border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-100">
                        <bdi dir="ltr">P.{thumb.page}</bdi>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {onCancelScan && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelScan}
                  className="border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-900/50 hover:text-white"
                >
                  <XCircle className="w-4 h-4 me-2" />
                  {cancelLabel}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!scanning && scanError && (
        <Card className="border-red-500/40 bg-zinc-950 text-zinc-100">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="h-7 w-7 text-red-400" />
            <p className="text-sm text-red-200">{scanError}</p>
            {onRescan && (
              <Button
                type="button"
                size="sm"
                onClick={onRescan}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                <RotateCcw className="w-4 h-4 me-1.5" />
                {retryLabel}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {scanResult && !scanning && !scanError && (
        <Card className="border-0 shadow-none bg-transparent">
          <ScannedDocumentPreview
            t={t}
            scanResult={scanResult}
            onRemove={onDiscard}
            onRescan={onRescan}
            onUseScan={onCreateFromScan}
          />
          <CardFooter className="pt-3 px-0 justify-end">
            <Button type="button" onClick={onCreateFromScan}>
              <Check className="w-4 h-4 me-2" />
              {t.createRecordFromScan}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default ScanResult;
