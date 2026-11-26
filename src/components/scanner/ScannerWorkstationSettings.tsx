import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Scan,
  Save,
  RotateCcw,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Languages,
  FileText,
  Palette,
  Layers,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import {
  ScannerPreferences,
  ScannerResolution,
  ScannerFormat,
  ScannerColorMode,
  ScannerPaperSize,
  ScannerOcrLanguage,
  SCANNER_PREFERENCES_UPDATED_EVENT,
  getDefaultScannerBridgeUrl,
  loadScannerPreferences,
  saveScannerPreferences,
  resetScannerPreferences,
} from '@/utils/scannerPreferences';
import {
  ScannerBridgeTestResult,
  testScannerBridgeConnection,
} from '@/services/scannerService';

interface ScannerWorkstationSettingsProps {
  compact?: boolean;
  onSaved?: (prefs: ScannerPreferences) => void;
  onClose?: () => void;
}

const RESOLUTION_OPTIONS: ReadonlyArray<{
  value: ScannerResolution;
  arLabel: string;
  frLabel: string;
  arDesc: string;
  frDesc: string;
  recommended?: boolean;
}> = [
  {
    value: '150',
    arLabel: '150 DPI',
    frLabel: '150 DPI',
    arDesc: 'سريع للمسودات',
    frDesc: 'Rapide pour brouillons',
  },
  {
    value: '300',
    arLabel: '300 DPI',
    frLabel: '300 DPI',
    arDesc: 'قياسي وموصى به لـ OCR',
    frDesc: 'Standard recommandé pour l’OCR',
    recommended: true,
  },
  {
    value: '600',
    arLabel: '600 DPI',
    frLabel: '600 DPI',
    arDesc: 'عالي الدقة للوثائق الرسمية',
    frDesc: 'Haute résolution pour documents officiels',
  },
];

const COLOR_MODE_OPTIONS: ReadonlyArray<{
  value: ScannerColorMode;
  arLabel: string;
  frLabel: string;
  arHint: string;
  frHint: string;
}> = [
  {
    value: 'Color',
    arLabel: 'ملون (Color)',
    frLabel: 'Couleur (Color)',
    arHint: 'أفضل للأختام والترويسات الملونة',
    frHint: 'Idéal pour cachets et en-têtes couleur',
  },
  {
    value: 'Grayscale',
    arLabel: 'تدرج رمادي (Grayscale)',
    frLabel: 'Niveaux de gris (Grayscale)',
    arHint: 'توازن مثالي بين الحجم ووضوح OCR',
    frHint: 'Bon équilibre taille / lisibilité OCR',
  },
  {
    value: 'BlackAndWhite',
    arLabel: 'أبيض وأسود (B&W)',
    frLabel: 'Noir et blanc (N&B)',
    arHint: 'أصغر حجم للمستندات النصية الصافية',
    frHint: 'Fichiers légers pour texte pur',
  },
];

const ScannerWorkstationSettings: React.FC<ScannerWorkstationSettingsProps> = ({
  compact = false,
  onSaved,
  onClose,
}) => {
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isAr = language === 'ar';

  const [prefs, setPrefs] = useState<ScannerPreferences>(() => loadScannerPreferences());
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ScannerBridgeTestResult | null>(null);

  useEffect(() => {
    const syncFromEvent = (ev: Event) => {
      const customEv = ev as CustomEvent<ScannerPreferences>;
      if (customEv.detail) {
        setPrefs(customEv.detail);
      } else {
        setPrefs(loadScannerPreferences());
      }
    };
    window.addEventListener(SCANNER_PREFERENCES_UPDATED_EVENT, syncFromEvent);
    return () => {
      window.removeEventListener(SCANNER_PREFERENCES_UPDATED_EVENT, syncFromEvent);
    };
  }, []);

  const handleSave = () => {
    const saved = saveScannerPreferences(prefs);
    setPrefs(saved);
    toast.success(
      isAr
        ? 'تم حفظ إعدادات الماسح الضوئي و OCR لهذا الجهاز بنجاح'
        : 'Paramètres du scanner et OCR enregistrés pour ce poste'
    );
    onSaved?.(saved);
    onClose?.();
  };

  const handleReset = () => {
    const defaults = resetScannerPreferences();
    setPrefs(defaults);
    setTestResult(null);
    toast.success(
      isAr
        ? 'تمت استعادة الإعدادات الافتراضية للماسح الضوئي'
        : 'Paramètres du scanner réinitialisés par défaut'
    );
    onSaved?.(defaults);
  };

  const handleTestConnection = async () => {
    if (testingConnection) return;
    setTestingConnection(true);
    try {
      const result = await testScannerBridgeConnection(prefs.bridgeUrl);
      setTestResult(result);
      if (result.state === 'connected') {
        toast.success(isAr ? result.messageAr : result.messageFr);
      } else if (result.state === 'service_only') {
        toast.warning(isAr ? result.messageAr : result.messageFr);
      } else {
        toast.error(isAr ? result.messageAr : result.messageFr);
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const defaultBridgePlaceholder = getDefaultScannerBridgeUrl();

  const content = (
    <div dir={dir} className="space-y-6">
      {/* Workstation Scope Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#4a5568]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Monitor className="h-4 w-4 text-[#2c5282] shrink-0" />
          <span>
            {isAr
              ? 'يتم حفظ هذه التفضيلات محلياً لهذا الحاسوب لتعبئة نافذة المسح الضوئي تلقائياً في البريد الوارد والصادر.'
              : 'Ces préférences sont enregistrées localement sur ce poste pour pré-remplir automatiquement le scanner du courrier entrant et sortant.'}
          </span>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-white border border-[#cbd5e1] text-[#2c5282] whitespace-nowrap">
          {isAr ? 'إعداد محطة العمل' : 'Profil poste local'}
        </span>
      </div>

      {/* 1. Resolution (DPI) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="text-base font-bold text-[#1a202c] flex items-center gap-2">
            <Scan className="h-4 w-4 text-[#2c5282]" />
            <span>
              {isAr
                ? 'الدقة الافتراضية للمسح (Résolution DPI)'
                : 'Résolution par défaut (DPI)'}
            </span>
          </Label>
          <span className="text-xs text-[#64748b] tabular-nums">
            <bdi dir="ltr">{prefs.resolution} DPI</bdi>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {RESOLUTION_OPTIONS.map((option) => {
            const isSelected = prefs.resolution === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPrefs((prev) => ({ ...prev, resolution: option.value }))}
                className={`text-start rounded-md border p-3.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] ${
                  isSelected
                    ? 'border-[#2c5282] bg-[#ebf8ff]/60 text-[#1a202c]'
                    : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#4a5568]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-[#1a202c] tabular-nums">
                    <bdi dir="ltr">{isAr ? option.arLabel : option.frLabel}</bdi>
                  </span>
                  {option.recommended && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FFCB56] text-[#1a202c] whitespace-nowrap">
                      {isAr ? 'موصى به' : 'Recommandé'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#4a5568] mt-1.5">
                  {isAr ? option.arDesc : option.frDesc}
                </p>
                <p className="text-[11px] text-[#64748b] mt-0.5">
                  {isAr ? option.frDesc : option.arDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="bg-[#e2e8f0]" />

      {/* 2. Color Mode, Format, Paper Size */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <Label htmlFor="scanner-color-mode" className="text-sm font-bold text-[#1a202c] flex items-center gap-1.5">
            <Palette className="h-4 w-4 text-[#2c5282]" />
            <span>{isAr ? 'وضع الألوان (Mode couleur)' : 'Mode couleur'}</span>
          </Label>
          <Select
            value={prefs.colorMode}
            onValueChange={(value) =>
              setPrefs((prev) => ({ ...prev, colorMode: value as ScannerColorMode }))
            }
          >
            <SelectTrigger id="scanner-color-mode" className="h-11 text-sm border-[#cbd5e1] bg-white rounded">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_MODE_OPTIONS.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {isAr ? mode.arLabel : mode.frLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-[#64748b]">
            {COLOR_MODE_OPTIONS.find((m) => m.value === prefs.colorMode)?.[
              isAr ? 'arHint' : 'frHint'
            ]}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scanner-paper-size" className="text-sm font-bold text-[#1a202c] flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#2c5282]" />
            <span>{isAr ? 'حجم الورق (Format papier)' : 'Format de papier'}</span>
          </Label>
          <Select
            value={prefs.paperSize}
            onValueChange={(value) =>
              setPrefs((prev) => ({ ...prev, paperSize: value as ScannerPaperSize }))
            }
          >
            <SelectTrigger id="scanner-paper-size" className="h-11 text-sm border-[#cbd5e1] bg-white rounded">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">
                {isAr ? 'A4 (210 × 297 مم — قياسي)' : 'A4 (210 × 297 mm — Standard)'}
              </SelectItem>
              <SelectItem value="Letter">
                {isAr ? 'Letter (216 × 279 مم)' : 'Letter (216 × 279 mm)'}
              </SelectItem>
              <SelectItem value="Legal">
                {isAr ? 'Legal (216 × 356 مم)' : 'Legal (216 × 356 mm)'}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-[#64748b]">
            {isAr
              ? 'حجم الصفحة الافتراضي لوثائق البريد'
              : 'Dimension de page appliquée par défaut'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scanner-default-format" className="text-sm font-bold text-[#1a202c] flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#2c5282]" />
            <span>{isAr ? 'صيغة الملف (Format fichier)' : 'Format de sortie'}</span>
          </Label>
          <Select
            value={prefs.format}
            onValueChange={(value) =>
              setPrefs((prev) => ({ ...prev, format: value as ScannerFormat }))
            }
          >
            <SelectTrigger id="scanner-default-format" className="h-11 text-sm border-[#cbd5e1] bg-white rounded">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                {isAr ? 'PDF (متعدد الصفحات — موصى به)' : 'PDF (Multi-pages — recommandé)'}
              </SelectItem>
              <SelectItem value="jpg">JPEG (Image)</SelectItem>
              <SelectItem value="png">PNG (Image haute qualité)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-[#64748b]">
            {isAr
              ? 'صيغة الحفظ المبدئية عند فتح الماسح'
              : 'Extension présélectionnée à l’ouverture du scanner'}
          </p>
        </div>
      </div>

      {/* 3. Feeder (ADF) & Duplex */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between gap-4 p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded-md">
          <div className="space-y-1">
            <Label htmlFor="scanner-use-adf" className="text-sm font-bold text-[#1a202c] cursor-pointer">
              {isAr ? 'التغذية التلقائية (ADF / Chargeur)' : 'Chargeur automatique (ADF)'}
            </Label>
            <p className="text-xs text-[#4a5568]">
              {isAr
                ? 'اعتماد ملقم الأوراق التلقائي بدلاً من الزجاج المسطح للملفات متعددة الصفحات'
                : 'Utiliser le bac d’alimentation automatique au lieu du plateau vitré'}
            </p>
          </div>
          <Switch
            id="scanner-use-adf"
            checked={prefs.useAdf}
            onCheckedChange={(checked) =>
              setPrefs((prev) => ({
                ...prev,
                useAdf: checked,
                duplex: checked ? prev.duplex : false,
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded-md">
          <div className="space-y-1">
            <Label htmlFor="scanner-duplex" className="text-sm font-bold text-[#1a202c] cursor-pointer">
              {isAr ? 'المسح على الوجهين (Recto-verso / Duplex)' : 'Numérisation recto-verso (Duplex)'}
            </Label>
            <p className="text-xs text-[#4a5568]">
              {isAr
                ? 'مسح وجهي الورقة في تمريرة واحدة عندما يدعم الماسح هذه الميزة'
                : 'Numériser les deux faces en un passage si le matériel le prend en charge'}
            </p>
          </div>
          <Switch
            id="scanner-duplex"
            checked={prefs.duplex}
            onCheckedChange={(checked) =>
              setPrefs((prev) => ({
                ...prev,
                duplex: checked,
                useAdf: checked ? true : prev.useAdf,
              }))
            }
          />
        </div>
      </div>

      <Separator className="bg-[#e2e8f0]" />

      {/* 4. OCR & Local Bridge Preferences */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <div className="flex items-center justify-between gap-4 p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded-md">
            <div className="space-y-1">
              <Label htmlFor="scanner-auto-ocr" className="text-sm font-bold text-[#1a202c] cursor-pointer">
                {isAr
                  ? 'تشغيل OCR تلقائياً بعد المسح'
                  : 'Lancer l’OCR automatiquement après numérisation'}
              </Label>
              <p className="text-xs text-[#4a5568]">
                {isAr
                  ? 'استخراج النص وتعبئة الحقول المقترحة تلقائياً بعد انتهاء المسح الضوئي'
                  : 'Extraire le texte et pré-remplir les champs détectés automatiquement'}
              </p>
            </div>
            <Switch
              id="scanner-auto-ocr"
              checked={prefs.autoOcr}
              onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, autoOcr: checked }))}
            />
          </div>

          <div className="space-y-2 p-4 bg-[#f7fafc] border border-[#e2e8f0] rounded-md">
            <Label htmlFor="scanner-ocr-languages" className="text-sm font-bold text-[#1a202c] flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-[#2c5282]" />
              <span>
                {isAr ? 'لغات التعرف الضوئي الافتراضية (OCR)' : 'Langues OCR par défaut'}
              </span>
            </Label>
            <Select
              value={prefs.ocrLanguages}
              onValueChange={(value) =>
                setPrefs((prev) => ({ ...prev, ocrLanguages: value as ScannerOcrLanguage }))
              }
            >
              <SelectTrigger id="scanner-ocr-languages" className="h-10 text-sm border-[#cbd5e1] bg-white rounded">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ara+fra">
                  {isAr ? 'العربية + الفرنسية (ara+fra — موصى به)' : 'Arabe + Français (ara+fra — recommandé)'}
                </SelectItem>
                <SelectItem value="ara">
                  {isAr ? 'العربية فقط (ara)' : 'Arabe uniquement (ara)'}
                </SelectItem>
                <SelectItem value="fra">
                  {isAr ? 'الفرنسية فقط (fra)' : 'Français uniquement (fra)'}
                </SelectItem>
                <SelectItem value="ara+fra+eng">
                  {isAr ? 'العربية + الفرنسية + الإنجليزية (ara+fra+eng)' : 'Arabe + Français + Anglais (ara+fra+eng)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Local Bridge URL & Connection Tester */}
        <div className="p-4 bg-white border border-[#e2e8f0] rounded-md space-y-3">
          <div className="space-y-1">
            <Label htmlFor="scanner-bridge-url" className="text-sm font-bold text-[#1a202c]">
              {isAr
                ? 'عنوان خدمة الماسح الضوئي / الجسر المحلي (Local Bridge URL)'
                : 'URL du service scanner / pont local'}
            </Label>
            <p className="text-xs text-[#64748b]">
              {isAr
                ? `العنوان الافتراضي المدمج: ${defaultBridgePlaceholder} — يمكن تغييره إذا كان الماسح يعمل عبر منفذ محلي خاص.`
                : `Point d’accès par défaut : ${defaultBridgePlaceholder} — modifiable si un pont local dédié est utilisé sur ce poste.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Input
              id="scanner-bridge-url"
              dir="ltr"
              value={prefs.bridgeUrl}
              onChange={(e) => setPrefs((prev) => ({ ...prev, bridgeUrl: e.target.value }))}
              placeholder={defaultBridgePlaceholder}
              className="h-11 font-mono text-sm border-[#cbd5e1] bg-white rounded flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="h-11 px-4 text-sm font-semibold border-[#2c5282] text-[#2c5282] hover:bg-[#ebf8ff] rounded whitespace-nowrap shrink-0 gap-2"
            >
              {testingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              <span>
                {testingConnection
                  ? isAr
                    ? 'جاري الاختبار...'
                    : 'Test en cours...'
                  : isAr
                    ? 'اختبار الاتصال بالماسح الضوئي'
                    : 'Tester la connexion'}
              </span>
            </Button>
          </div>

          {testResult && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-md border px-3.5 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2 ${
                testResult.state === 'connected'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : testResult.state === 'service_only'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {testResult.state === 'connected' ? (
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0" />
                ) : testResult.state === 'service_only' ? (
                  <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-[#DC2626] shrink-0" />
                )}
                <span className="font-medium">
                  {isAr ? testResult.messageAr : testResult.messageFr}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs opacity-85 tabular-nums">
                <span dir="ltr" className="font-mono">
                  {testResult.endpointTested}
                </span>
                <span dir="ltr" className="font-mono font-semibold">
                  {testResult.latencyMs} ms
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-[#e2e8f0] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          className="h-11 px-5 text-sm font-semibold border-[#cbd5e1] text-[#4a5568] hover:bg-gray-50 rounded whitespace-nowrap shrink-0 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>
            {isAr ? 'استعادة الإعدادات الافتراضية' : 'Réinitialiser par défaut'}
          </span>
        </Button>

        <div className="flex items-center gap-2 justify-end">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-5 text-sm font-medium border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 rounded whitespace-nowrap shrink-0"
            >
              {isAr ? 'إغلاق' : 'Fermer'}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            className="h-11 px-7 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded shadow-none whitespace-nowrap shrink-0 gap-2"
          >
            <Save className="h-4 w-4" />
            <span>
              {isAr
                ? 'حفظ إعدادات الماسح الضوئي'
                : 'Enregistrer la configuration'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="bg-white border border-[#e2e8f0] rounded shadow-sm">
      <CardHeader className="p-6 border-b border-[#e2e8f0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-2.5">
              <div className="w-9 h-9 rounded bg-[#2c5282]/10 border border-[#2c5282]/20 flex items-center justify-center text-[#2c5282] shrink-0">
                <Scan className="h-5 w-5 text-[#2c5282]" />
              </div>
              <span>
                {isAr
                  ? 'إعدادات الماسح الضوئي والتعرف الضوئي (Scanner & OCR)'
                  : 'Configuration du Scanner et de l’OCR'}
              </span>
            </CardTitle>
            <CardDescription className="text-sm text-[#5f6b7d] mt-1">
              {isAr
                ? 'ضبط الدقة الافتراضية، وضع الألوان، وحدة التغذية التلقائية (ADF)، ولغات OCR الخاصة بهذا الجهاز'
                : 'Définissez la résolution, le mode couleur, le chargeur ADF et les paramètres OCR de ce poste'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">{content}</CardContent>
    </Card>
  );
};

export default ScannerWorkstationSettings;
