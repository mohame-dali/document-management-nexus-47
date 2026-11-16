import React from 'react';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileScan, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageProvider';
import { ScanStage, getScanStageLabel } from '@/services/scannerService';
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

const ScannerTab: React.FC<ScannerTabProps> = ({
  t,
  scanSettings,
  handleScanSettingChange,
  scanning,
  scanProgress,
  scanResult,
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
  const lang: 'fr' | 'ar' = language === 'ar' ? 'ar' : 'fr';

  const rawDeviceId = scannerStatus?.data?.deviceId ?? scannerStatus?.deviceId;
  const isScannerConfigured = Boolean(rawDeviceId && rawDeviceId !== 'Not selected');

  const normalizedSelectFormat =
    scanSettings.format?.toLowerCase() === 'jpeg' ? 'jpg' : (scanSettings.format?.toLowerCase() || 'pdf');

  const stageLabel = getScanStageLabel(scanStage || 'scanning', scanPage || 0, translate, lang);
  const cancelLabel = (() => {
    const k = 'scanner.actions.cancel';
    const val = translate(k);
    if (val && val !== k) return val;
    return lang === 'ar' ? 'إلغاء' : 'Annuler';
  })();

  return (
    <div className="space-y-4">
      {/* Scanner setup and controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormLabel>{t.format || (lang === 'ar' ? 'الصيغة' : 'Format')}</FormLabel>
          <Select
            value={normalizedSelectFormat}
            onValueChange={(value) => handleScanSettingChange('format', value)}
            disabled={scanning}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder={lang === 'ar' ? 'اختر الصيغة' : 'Sélectionner le format'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">{t.pdfFormat || 'PDF'}</SelectItem>
              <SelectItem value="jpg">{t.jpegFormat || 'JPEG'}</SelectItem>
              <SelectItem value="png">{t.pngFormat || 'PNG'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <FormLabel>{t.resolution || (lang === 'ar' ? 'الدقة (DPI)' : 'Résolution (DPI)')}</FormLabel>
          <Select
            value={scanSettings.resolution}
            onValueChange={(value) => handleScanSettingChange('resolution', value)}
            disabled={scanning}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder={lang === 'ar' ? 'اختر الدقة' : 'Sélectionner la résolution'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="150">150 DPI</SelectItem>
              <SelectItem value="300">300 DPI</SelectItem>
              <SelectItem value="600">600 DPI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scanner status warning */}
      {scannerStatus?.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{scannerStatus.error}</AlertDescription>
        </Alert>
      )}

      {/* Scan button, real stage progress and cancel */}
      <div className="flex flex-col items-center space-y-4">
        {loadingScannerStatus ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{lang === 'ar' ? 'جاري التحقق من حالة الماسح الضوئي...' : 'Vérification du scanner...'}</span>
          </div>
        ) : isScannerConfigured ? (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <Button
              type="button"
              onClick={handleStartScan}
              disabled={scanning}
              className="flex-1 min-w-[180px]"
            >
              {scanning ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {stageLabel || t.scanning || (lang === 'ar' ? 'جاري المسح...' : 'Numérisation...')}
                </>
              ) : (
                <>
                  <FileScan className="me-2 h-4 w-4" />
                  {t.scanDocument || (lang === 'ar' ? 'مسح المستند' : 'Numériser le document')}
                </>
              )}
            </Button>

            {scanning && onCancelScan && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancelScan}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="me-2 h-4 w-4" />
                {cancelLabel}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center space-y-2 w-full">
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <p className="text-amber-900 font-medium">
                {t.scannerNotConfigured ||
                  (lang === 'ar' ? 'الماسح الضوئي غير مهيأ' : 'Scanner non configuré')}
              </p>
              <p className="text-amber-700 text-sm mt-1">
                {lang === 'ar'
                  ? 'يرجى توصيل الماسح الضوئي وتحديده في صفحة الإعداد أولاً.'
                  : 'Veuillez connecter votre scanner et le sélectionner dans la page de configuration.'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/scan')}
              disabled={scanning}
            >
              {t.configureScanner || (lang === 'ar' ? 'إعداد الماسح الضوئي' : 'Configurer le scanner')}
            </Button>
          </div>
        )}

        {/* Real backend scan progress */}
        {scanning && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span>{stageLabel}</span>
              <span className="font-medium">
                <bdi dir="ltr">{Math.min(Math.max(scanProgress, 0), 100)}%</bdi>
              </span>
            </div>
            <Progress value={Math.min(Math.max(scanProgress, 0), 100)} className="h-2.5" />
          </div>
        )}
      </div>

      {/* Protected Scan Preview */}
      {scanResult && !scanning && (
        <ScannedDocumentPreview
          t={t}
          scanResult={scanResult}
          onRemove={onRemoveScan}
          onRescan={onRescan || handleStartScan}
          onUseScan={onUseScan}
          isScanAttached={isScanAttached}
        />
      )}
    </div>
  );
};

export default ScannerTab;
