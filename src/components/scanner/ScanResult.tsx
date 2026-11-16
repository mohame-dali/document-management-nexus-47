import React from 'react';
import { Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageProvider';
import { ScanStage, getScanStageLabel } from '@/services/scannerService';
import ScannedDocumentPreview, { ScanPreviewData } from '@/components/documents/forms/ScannedDocumentPreview';

export type ScanResultData = ScanPreviewData;

interface ScanResultProps {
  t: Record<string, string>;
  scanning: boolean;
  progress: number;
  scanStage?: ScanStage | null;
  scanPage?: number;
  scanResult: ScanResultData | null;
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
  onCreateFromScan,
  onCancelScan,
  onRescan,
  onDiscard,
}) => {
  const { t: translate, language } = useLanguage();
  const lang: 'fr' | 'ar' = language === 'ar' ? 'ar' : 'fr';

  if (!scanning && !scanResult) return null;

  const stageLabel = getScanStageLabel(scanStage || 'scanning', scanPage || 0, translate, lang);
  const cancelLabel = (() => {
    const val = translate('scanner.actions.cancel');
    return val && val !== 'scanner.actions.cancel' ? val : lang === 'ar' ? 'إلغاء' : 'Annuler';
  })();

  return (
    <>
      {scanning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span>{stageLabel || t.scanning}</span>
              <span className="text-sm font-medium text-muted-foreground">
                <bdi dir="ltr">{Math.min(Math.max(progress, 0), 100)}%</bdi>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={Math.min(Math.max(progress, 0), 100)} className="h-2.5" />
            {onCancelScan && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelScan}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 me-2" />
                  {cancelLabel}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {scanResult && !scanning && (
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
    </>
  );
};

export default ScanResult;
