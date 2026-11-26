export const SCANNER_PREFERENCES_STORAGE_KEY = 'dms_scanner_preferences';
export const SCANNER_PREFERENCES_UPDATED_EVENT = 'dms-scanner-preferences-updated';

export type ScannerResolution = '150' | '300' | '600';
export type ScannerFormat = 'pdf' | 'jpg' | 'png';
export type ScannerColorMode = 'Color' | 'Grayscale' | 'BlackAndWhite';
export type ScannerPaperSize = 'A4' | 'Letter' | 'Legal';
export type ScannerOcrLanguage = 'ara+fra' | 'ara' | 'fra' | 'ara+fra+eng';

export interface ScannerPreferences {
  resolution: ScannerResolution;
  format: ScannerFormat;
  colorMode: ScannerColorMode;
  paperSize: ScannerPaperSize;
  useAdf: boolean;
  duplex: boolean;
  autoOcr: boolean;
  ocrLanguages: ScannerOcrLanguage;
  bridgeUrl: string;
}

export interface FormScanSettings {
  resolution: string;
  format: string;
  colorMode?: string;
  paperSize?: string;
  documentSource?: string;
  duplex?: string;
  autoOcr?: string;
  languages?: string;
}

export function getDefaultScannerBridgeUrl(): string {
  const envBridge = import.meta.env.VITE_SCANNER_BRIDGE_URL;
  if (typeof envBridge === 'string' && envBridge.trim()) {
    return envBridge.trim().replace(/\/+$/, '');
  }
  const apiUrl = import.meta.env.VITE_API_URL;
  if (typeof apiUrl === 'string' && apiUrl.trim()) {
    return `${apiUrl.trim().replace(/\/+$/, '')}/scan`;
  }
  return '/api/scan';
}

export const DEFAULT_SCANNER_PREFERENCES: ScannerPreferences = {
  resolution: '300',
  format: 'pdf',
  colorMode: 'Color',
  paperSize: 'A4',
  useAdf: false,
  duplex: false,
  autoOcr: true,
  ocrLanguages: 'ara+fra',
  bridgeUrl: getDefaultScannerBridgeUrl(),
};

const VALID_RESOLUTIONS: ReadonlyArray<ScannerResolution> = ['150', '300', '600'];
const VALID_FORMATS: ReadonlyArray<ScannerFormat> = ['pdf', 'jpg', 'png'];
const VALID_COLOR_MODES: ReadonlyArray<ScannerColorMode> = ['Color', 'Grayscale', 'BlackAndWhite'];
const VALID_PAPER_SIZES: ReadonlyArray<ScannerPaperSize> = ['A4', 'Letter', 'Legal'];
const VALID_OCR_LANGUAGES: ReadonlyArray<ScannerOcrLanguage> = ['ara+fra', 'ara', 'fra', 'ara+fra+eng'];

function normalizeResolution(value: unknown): ScannerResolution {
  const str = String(value ?? '').trim();
  if (VALID_RESOLUTIONS.includes(str as ScannerResolution)) {
    return str as ScannerResolution;
  }
  return DEFAULT_SCANNER_PREFERENCES.resolution;
}

function normalizeFormat(value: unknown): ScannerFormat {
  const str = String(value ?? '').trim().toLowerCase();
  if (str === 'jpeg') return 'jpg';
  if (VALID_FORMATS.includes(str as ScannerFormat)) {
    return str as ScannerFormat;
  }
  return DEFAULT_SCANNER_PREFERENCES.format;
}

function normalizeColorMode(value: unknown): ScannerColorMode {
  const str = String(value ?? '').trim();
  if (VALID_COLOR_MODES.includes(str as ScannerColorMode)) {
    return str as ScannerColorMode;
  }
  const lower = str.toLowerCase();
  if (lower === 'color') return 'Color';
  if (lower === 'grayscale' || lower === 'gray') return 'Grayscale';
  if (lower === 'blackandwhite' || lower === 'bw' || lower === 'black_and_white') {
    return 'BlackAndWhite';
  }
  return DEFAULT_SCANNER_PREFERENCES.colorMode;
}

function normalizePaperSize(value: unknown): ScannerPaperSize {
  const str = String(value ?? '').trim();
  const matched = VALID_PAPER_SIZES.find((size) => size.toLowerCase() === str.toLowerCase());
  return matched || DEFAULT_SCANNER_PREFERENCES.paperSize;
}

function normalizeOcrLanguages(value: unknown): ScannerOcrLanguage {
  const str = String(value ?? '').trim();
  if (VALID_OCR_LANGUAGES.includes(str as ScannerOcrLanguage)) {
    return str as ScannerOcrLanguage;
  }
  return DEFAULT_SCANNER_PREFERENCES.ocrLanguages;
}

export function sanitizeScannerPreferences(raw: Partial<ScannerPreferences> | null | undefined): ScannerPreferences {
  const defaultBridge = getDefaultScannerBridgeUrl();
  const bridgeCandidate =
    typeof raw?.bridgeUrl === 'string' && raw.bridgeUrl.trim()
      ? raw.bridgeUrl.trim().replace(/\/+$/, '')
      : defaultBridge;

  return {
    resolution: normalizeResolution(raw?.resolution),
    format: normalizeFormat(raw?.format),
    colorMode: normalizeColorMode(raw?.colorMode),
    paperSize: normalizePaperSize(raw?.paperSize),
    useAdf: typeof raw?.useAdf === 'boolean' ? raw.useAdf : DEFAULT_SCANNER_PREFERENCES.useAdf,
    duplex: typeof raw?.duplex === 'boolean' ? raw.duplex : DEFAULT_SCANNER_PREFERENCES.duplex,
    autoOcr: typeof raw?.autoOcr === 'boolean' ? raw.autoOcr : DEFAULT_SCANNER_PREFERENCES.autoOcr,
    ocrLanguages: normalizeOcrLanguages(raw?.ocrLanguages),
    bridgeUrl: bridgeCandidate,
  };
}

export function loadScannerPreferences(): ScannerPreferences {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SCANNER_PREFERENCES, bridgeUrl: getDefaultScannerBridgeUrl() };
  }

  try {
    const raw = window.localStorage.getItem(SCANNER_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SCANNER_PREFERENCES, bridgeUrl: getDefaultScannerBridgeUrl() };
    }
    const parsed = JSON.parse(raw) as Partial<ScannerPreferences>;
    return sanitizeScannerPreferences(parsed);
  } catch {
    return { ...DEFAULT_SCANNER_PREFERENCES, bridgeUrl: getDefaultScannerBridgeUrl() };
  }
}

export function saveScannerPreferences(next: Partial<ScannerPreferences>): ScannerPreferences {
  const current = loadScannerPreferences();
  const merged = sanitizeScannerPreferences({ ...current, ...next });

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SCANNER_PREFERENCES_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Ignore storage quota errors gracefully
    }
    window.dispatchEvent(new CustomEvent(SCANNER_PREFERENCES_UPDATED_EVENT, { detail: merged }));
  }

  return merged;
}

export function resetScannerPreferences(): ScannerPreferences {
  const defaults: ScannerPreferences = {
    ...DEFAULT_SCANNER_PREFERENCES,
    bridgeUrl: getDefaultScannerBridgeUrl(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SCANNER_PREFERENCES_STORAGE_KEY, JSON.stringify(defaults));
    } catch {
      // Ignore storage quota errors gracefully
    }
    window.dispatchEvent(new CustomEvent(SCANNER_PREFERENCES_UPDATED_EVENT, { detail: defaults }));
  }

  return defaults;
}

export function preferencesToFormScanSettings(prefs: ScannerPreferences): FormScanSettings {
  return {
    resolution: prefs.resolution,
    format: prefs.format,
    colorMode: prefs.colorMode,
    paperSize: prefs.paperSize,
    documentSource: prefs.useAdf ? 'Feeder' : 'Flatbed',
    duplex: prefs.duplex ? 'true' : 'false',
    autoOcr: prefs.autoOcr ? 'true' : 'false',
    languages: prefs.ocrLanguages,
  };
}
