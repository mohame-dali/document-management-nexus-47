import React from 'react';
import { Scan, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageProvider';

interface ScanSettings {
  documentType: string;
  resolution: string;
  format: string;
  colorMode?: string;
  paperSize?: string;
  documentSource?: string;
  duplex?: string;
  autoOcr?: string;
  languages?: string;
}

interface ScanSettingsProps {
  t: Record<string, string>;
  scanSettings: ScanSettings;
  onSettingChange: (key: string, value: string) => void;
  onScanDocument: (temporary: boolean) => void;
  selectedScanner: string;
  scanning: boolean;
  onOpenSettings?: () => void;
}

const ScanSettingsComponent: React.FC<ScanSettingsProps> = ({
  t,
  scanSettings,
  onSettingChange,
  onScanDocument,
  selectedScanner,
  scanning,
  onOpenSettings,
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const normalizedFormat =
    scanSettings.format?.toLowerCase() === 'jpeg'
      ? 'jpg'
      : scanSettings.format?.toLowerCase() || 'pdf';
  const colorMode = scanSettings.colorMode || 'Color';
  const documentSource = scanSettings.documentSource || 'Flatbed';
  const paperSize = scanSettings.paperSize || 'A4';
  const autoOcrEnabled = scanSettings.autoOcr !== 'false';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>{t.scanSettings}</CardTitle>
        {onOpenSettings && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            disabled={scanning}
            title={
              isAr
                ? 'إعدادات الماسح الضوئي الافتراضية و OCR'
                : 'Paramètres par défaut Scanner & OCR'
            }
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isAr ? 'الإعدادات الافتراضية' : 'Paramètres par défaut'}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t.documentType}</h3>
          <RadioGroup
            value={scanSettings.documentType}
            onValueChange={(value) => onSettingChange('documentType', value)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="incoming" id="option-incoming" />
              <Label htmlFor="option-incoming">{t.incoming}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="outgoing" id="option-outgoing" />
              <Label htmlFor="option-outgoing">{t.outgoing}</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t.resolution}</Label>
            <Select
              value={scanSettings.resolution}
              onValueChange={(value) => onSettingChange('resolution', value)}
              disabled={scanning}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="150">150 DPI</SelectItem>
                <SelectItem value="300">300 DPI</SelectItem>
                <SelectItem value="600">600 DPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.format}</Label>
            <Select
              value={normalizedFormat}
              onValueChange={(value) => onSettingChange('format', value)}
              disabled={scanning}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="jpg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'وضع الألوان' : 'Mode couleur'}</Label>
            <Select
              value={colorMode}
              onValueChange={(value) => onSettingChange('colorMode', value)}
              disabled={scanning}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Color">{isAr ? 'ملون (Color)' : 'Couleur (Color)'}</SelectItem>
                <SelectItem value="Grayscale">{isAr ? 'تدرج رمادي' : 'Niveaux de gris'}</SelectItem>
                <SelectItem value="BlackAndWhite">{isAr ? 'أبيض وأسود' : 'Noir et blanc'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'مصدر الورق والحجم' : 'Source & format papier'}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={documentSource}
                onValueChange={(value) => onSettingChange('documentSource', value)}
                disabled={scanning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flatbed">{isAr ? 'زجاج مسطح' : 'Plateau'}</SelectItem>
                  <SelectItem value="Feeder">{isAr ? 'ADF تلقائي' : 'Chargeur ADF'}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paperSize}
                onValueChange={(value) => onSettingChange('paperSize', value)}
                disabled={scanning}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 bg-muted/30">
          <div className="space-y-0.5">
            <Label htmlFor="scan-page-auto-ocr" className="text-sm font-medium cursor-pointer">
              {isAr ? 'تشغيل OCR تلقائياً بعد المسح' : 'Lancer l’OCR automatiquement après numérisation'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? `اللغات النشطة: ${scanSettings.languages || 'ara+fra'}`
                : `Langues actives : ${scanSettings.languages || 'ara+fra'}`}
            </p>
          </div>
          <Switch
            id="scan-page-auto-ocr"
            checked={autoOcrEnabled}
            disabled={scanning}
            onCheckedChange={(checked) => onSettingChange('autoOcr', checked ? 'true' : 'false')}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => onScanDocument(true)}
          disabled={!selectedScanner || scanning}
        >
          <Scan className="w-4 h-4 me-2" />
          {t.scanDocument}
        </Button>

        <Button
          onClick={() => onScanDocument(false)}
          disabled={!selectedScanner || scanning}
        >
          <FileText className="w-4 h-4 me-2" />
          {t.createRecordFromScan}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScanSettingsComponent;
