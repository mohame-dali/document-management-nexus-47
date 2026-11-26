import api from './apiService';

export type ScanStage = 'detecting' | 'preparing' | 'scanning' | 'processing' | 'done' | 'error';

// ASYNC OCR FIX: Separate non-blocking OCR status type
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ScannerErrorCode =
  | 'SCANNER_NOT_FOUND'
  | 'SCANNER_BUSY'
  | 'SCAN_TIMEOUT'
  | 'SCAN_FAILED'
  | 'SCANNER_NO_PAPER'
  | 'SCAN_CANCELLED'
  | 'INVALID_SCAN_PARAMS'
  | 'CLIENT_TIMEOUT';

export interface ScannerConfig {
  resolution?: number | string;
  format?: 'pdf' | 'jpg' | 'jpeg' | 'png' | 'PDF' | 'JPEG' | 'PNG';
  colorMode?: 'Color' | 'Grayscale' | 'BlackAndWhite' | 'color' | 'grayscale' | 'blackAndWhite';
  documentSource?: 'Flatbed' | 'Feeder' | 'flatbed' | 'feeder';
  paperSize?: string;
  duplex?: boolean;
  autoOcr?: boolean;
  scanId?: string;
  languages?: string;
}

export type ScannerConnectionState = 'connected' | 'service_only' | 'offline';

export interface ScannerBridgeTestResult {
  state: ScannerConnectionState;
  reachable: boolean;
  hardwareReady: boolean;
  latencyMs: number;
  deviceId?: string;
  devicesCount?: number;
  platform?: string;
  messageFr: string;
  messageAr: string;
  endpointTested: string;
}

export interface ScannerDevice {
  id: string;
  name: string;
  isDefault?: boolean;
  isAvailable?: boolean;
}

export interface ScannerStatusPayload {
  enabled?: boolean;
  isScanning?: boolean;
  deviceId?: string;
  resolution?: string;
  format?: string;
  platform?: string;
  hasScanimageCmd?: boolean;
  hasWindowsScanTools?: boolean;
  [key: string]: unknown;
}

export interface ScannerStatusResponse {
  success?: boolean;
  data?: ScannerStatusPayload;
  deviceId?: string;
  isAvailable?: boolean;
  selectedDevice?: ScannerDevice;
  devices?: ScannerDevice[];
  error?: string;
  [key: string]: unknown;
}

export interface ScanResult {
  scanId?: string;
  id?: string;
  fileName?: string;
  filename?: string;
  filePath?: string;
  fileUrl?: string;
  path?: string;
  format?: string;
  size?: number;
  pageCount?: number;
  pages?: number;
  ocrText?: string;
  ocrStatus?: OcrStatus;
  createdAt?: string;
  [key: string]: unknown;
}

export interface DocumentScanResult {
  scanId?: string;
  fileName?: string;
  filePath: string;
  fileUrl?: string;
  serialNumber?: number;
  year?: number;
  documentType?: string;
  ocrText?: string;
  ocrStatus?: OcrStatus;
  format?: string;
  pageCount?: number;
  [key: string]: unknown;
}

export interface ScanJobStatus {
  scanId: string;
  stage: ScanStage;
  page: number;
  availablePages?: number;
  ocrStatus?: OcrStatus;
  code?: ScannerErrorCode;
}

export interface LiveThumbnail {
  page: number;
  url: string;
}

const DEFAULT_FALLBACK_MESSAGES: Record<'fr' | 'ar', Record<string, string>> = {
  fr: {
    SCANNER_NOT_FOUND: 'Aucun scanner physique détecté ou module désactivé sur le serveur.',
    SCANNER_BUSY: 'Le scanner est actuellement occupé par une autre tâche.',
    SCAN_TIMEOUT: 'Délai maximal de numérisation dépassé. Vérifiez le scanner et réessayez.',
    SCAN_FAILED: 'Échec matériel lors de la numérisation du document.',
    SCANNER_NO_PAPER: 'Aucun papier détecté dans le scanner ou le chargeur.',
    SCAN_CANCELLED: 'Numérisation annulée.',
    INVALID_SCAN_PARAMS: 'Paramètres de numérisation invalides.',
    CLIENT_TIMEOUT: 'Délai d’attente dépassé côté navigateur.',
    UNKNOWN: 'Une erreur est survenue lors de la numérisation.',
  },
  ar: {
    SCANNER_NOT_FOUND: 'لم يتم العثور على أي ماسح ضوئي متصل أو الوحدة معطلة على الخادم.',
    SCANNER_BUSY: 'الماسح الضوئي مشغول حالياً بعملية مسح أخرى.',
    SCAN_TIMEOUT: 'انتهت المهلة القصوى للمسح الضوئي. يرجى التحقق من الماسح والمحاولة مجدداً.',
    SCAN_FAILED: 'حدث خطأ أثناء المسح الضوئي للمستند.',
    SCANNER_NO_PAPER: 'لم يتم الكشف عن أي ورق في الماسح الضوئي أو وحدة التغذية.',
    SCAN_CANCELLED: 'تم إلغاء عملية المسح الضوئي.',
    INVALID_SCAN_PARAMS: 'إعدادات المسح الضوئي غير صالحة.',
    CLIENT_TIMEOUT: 'انتهت مهلة الانتظار من جهة المتصفح.',
    UNKNOWN: 'حدث خطأ غير متوقع أثناء المسح الضوئي.',
  },
};

export function createScanId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `scan_${Date.now()}_${rand}`;
}

/**
 * Extract backend error code and translate to fr/ar — never exposes "Request failed with status code".
 */
export function getScannerErrorCode(error: unknown): ScannerErrorCode | null {
  if (!error || typeof error !== 'object') return null;
  const err = error as {
    code?: string;
    name?: string;
    response?: { status?: number; data?: { code?: string } };
  };
  const apiCode = err.response?.data?.code;
  if (apiCode && apiCode in DEFAULT_FALLBACK_MESSAGES.fr) {
    return apiCode as ScannerErrorCode;
  }
  if (err.code === 'ECONNABORTED' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
    return err.code === 'ERR_CANCELED' || err.name === 'AbortError' ? 'SCAN_CANCELLED' : 'CLIENT_TIMEOUT';
  }
  if (err.response?.status === 503) return 'SCANNER_NOT_FOUND';
  if (err.response?.status === 504) return 'SCAN_TIMEOUT';
  if (err.response?.status === 400) return 'INVALID_SCAN_PARAMS';
  return null;
}

export function getScannerErrorMessage(
  error: unknown,
  translateFn?: ((key: string, params?: Record<string, unknown>) => string) | null,
  language: 'fr' | 'ar' = 'fr'
): string {
  const code = getScannerErrorCode(error);
  const langTable = DEFAULT_FALLBACK_MESSAGES[language === 'ar' ? 'ar' : 'fr'];

  if (code) {
    if (typeof translateFn === 'function') {
      const i18nKey = `scanner.errors.${code}`;
      const translated = translateFn(i18nKey);
      if (translated && translated !== i18nKey) {
        return translated;
      }
    }
    return langTable[code] || langTable.UNKNOWN;
  }

  const errObj = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  const backendMessage = errObj?.response?.data?.message;
  if (
    typeof backendMessage === 'string' &&
    backendMessage.trim() !== '' &&
    !/^Request failed with status code \d+$/i.test(backendMessage.trim())
  ) {
    return backendMessage;
  }

  if (
    typeof errObj?.message === 'string' &&
    errObj.message.trim() !== '' &&
    !/^Request failed with status code \d+$/i.test(errObj.message.trim())
  ) {
    return errObj.message;
  }

  if (typeof translateFn === 'function') {
    const fallback = translateFn('scanner.errors.UNKNOWN');
    if (fallback && fallback !== 'scanner.errors.UNKNOWN') {
      return fallback;
    }
  }

  return langTable.UNKNOWN;
}

export function getScanStageProgress(stage: ScanStage, page = 0): number {
  switch (stage) {
    case 'detecting':
      return 10;
    case 'preparing':
      return 25;
    case 'scanning':
      return Math.min(35 + Math.max(page, 0) * 12, 85);
    case 'processing':
      return 92;
    case 'done':
      return 100;
    case 'error':
    default:
      return 0;
  }
}

export function getScanStageLabel(
  stage: ScanStage,
  page: number,
  translateFn?: ((key: string, params?: Record<string, unknown>) => string) | null,
  language: 'fr' | 'ar' = 'fr'
): string {
  const fallbackLabels: Record<'fr' | 'ar', Record<string, string>> = {
    fr: {
      detecting: 'Détection du scanner...',
      preparing: 'Préparation de la numérisation...',
      scanning: page > 0 ? `Numérisation (page ${page})...` : 'Numérisation en cours...',
      processing: 'Traitement du document...',
      done: 'Numérisation terminée',
      error: 'Échec de la numérisation',
    },
    ar: {
      detecting: 'جاري الكشف عن الماسح الضوئي...',
      preparing: 'جاري التحضير للمسح الضوئي...',
      scanning: page > 0 ? `جاري المسح الضوئي (الصفحة ${page})...` : 'جاري المسح الضوئي...',
      processing: 'جاري معالجة المستند...',
      done: 'اكتمل المسح الضوئي',
      error: 'فشل المسح الضوئي',
    },
  };

  if (typeof translateFn === 'function') {
    if (stage === 'scanning' && page > 0) {
      const k = 'scanner.stage.scanningPage';
      const val = translateFn(k, { page });
      if (val && val !== k) return val;
    }
    const key = `scanner.stage.${stage}`;
    const val = translateFn(key);
    if (val && val !== key) return val;
  }

  return fallbackLabels[language === 'ar' ? 'ar' : 'fr'][stage] || '';
}

function normalizeFormat(raw?: string): 'pdf' | 'jpg' | 'png' {
  const val = String(raw || 'pdf').trim().toLowerCase();
  if (val === 'jpeg' || val === 'jpg') return 'jpg';
  if (val === 'png') return 'png';
  return 'pdf';
}

// Get scanner status - Admin and AdminTuningDesk only
export const getScannerStatus = async (): Promise<ScannerStatusResponse> => {
  const response = await api.get('/scan/status');
  const payload = response.data || {};
  const inner = payload.data || payload;
  return {
    ...payload,
    data: inner,
    deviceId: inner?.deviceId,
  };
};

export interface ListScannersOptions {
  refresh?: boolean;
}

// List available scanners - Admin and AdminTuningDesk only
export const listScanners = async (
  options?: ListScannersOptions | boolean
): Promise<ScannerDevice[]> => {
  const refresh = typeof options === 'boolean' ? options : Boolean(options?.refresh);
  const response = await api.get('/scan/devices', {
    params: refresh ? { refresh: true } : undefined,
  });
  return response.data?.data || response.data || [];
};

// Select a scanner - Admin and AdminTuningDesk only
export const selectScanner = async (
  deviceId: string
): Promise<{ success: boolean; data?: unknown; device?: ScannerDevice }> => {
  const response = await api.post('/scan/select-device', { deviceId });
  return response.data;
};

/**
 * Test connectivity to either the configured app scanner API or a custom local scanner bridge URL.
 */
export const testScannerBridgeConnection = async (
  customBridgeUrl?: string
): Promise<ScannerBridgeTestResult> => {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const elapsed = () =>
    Math.max(
      1,
      Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
    );

  const rawUrl = (customBridgeUrl || '').trim().replace(/\/+$/, '');
  const apiBase = String(import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
  const defaultApiScanUrl = `${apiBase}/scan`;
  const isInternalBackendEndpoint =
    !rawUrl || rawUrl === '/api/scan' || rawUrl === defaultApiScanUrl;

  if (isInternalBackendEndpoint) {
    try {
      const status = await getScannerStatus();
      const inner = status?.data || {};
      const enabled = Boolean(inner?.enabled);
      const deviceId =
        typeof (inner?.deviceId ?? status?.deviceId) === 'string'
          ? String(inner?.deviceId ?? status?.deviceId)
          : undefined;
      const hasSelectedDevice = Boolean(deviceId && deviceId !== 'Not selected');
      const platform = typeof inner?.platform === 'string' ? inner.platform : undefined;

      let devicesCount = 0;
      if (enabled) {
        try {
          const devices = await listScanners({ refresh: false });
          devicesCount = Array.isArray(devices) ? devices.length : 0;
        } catch {
          devicesCount = 0;
        }
      }

      const latencyMs = elapsed();
      if (enabled && (hasSelectedDevice || devicesCount > 0)) {
        return {
          state: 'connected',
          reachable: true,
          hardwareReady: true,
          latencyMs,
          deviceId: hasSelectedDevice ? deviceId : undefined,
          devicesCount,
          platform,
          endpointTested: defaultApiScanUrl,
          messageFr: hasSelectedDevice
            ? `Service actif et scanner prêt (${deviceId}).`
            : `Service actif — ${devicesCount} scanner(s) détecté(s).`,
          messageAr: hasSelectedDevice
            ? `الخدمة متصلة والماسح الضوئي جاهز (${deviceId}).`
            : `الخدمة متصلة — تم العثور على ${devicesCount} ماسح ضوئي.`,
        };
      }

      return {
        state: 'service_only',
        reachable: true,
        hardwareReady: false,
        latencyMs,
        deviceId: hasSelectedDevice ? deviceId : undefined,
        devicesCount,
        platform,
        endpointTested: defaultApiScanUrl,
        messageFr: enabled
          ? 'Service de numérisation joignable, mais aucun scanner physique sélectionné ou connecté.'
          : 'Service serveur joignable, mais le module scanner matériel est actuellement désactivé.',
        messageAr: enabled
          ? 'خدمة المسح متاحة، لكن لم يتم تحديد أو توصيل أي ماسح ضوئي فعلي.'
          : 'خدمة الخادم متاحة، لكن وحدة الماسح الضوئي الفعلي معطلة حالياً على الخادم.',
      };
    } catch (error: unknown) {
      return {
        state: 'offline',
        reachable: false,
        hardwareReady: false,
        latencyMs: elapsed(),
        endpointTested: defaultApiScanUrl,
        messageFr: getScannerErrorMessage(error, null, 'fr'),
        messageAr: getScannerErrorMessage(error, null, 'ar'),
      };
    }
  }

  // Validate custom URL scheme safely before probing
  if (!/^https?:\/\/.+/i.test(rawUrl) && !rawUrl.startsWith('/')) {
    return {
      state: 'offline',
      reachable: false,
      hardwareReady: false,
      latencyMs: elapsed(),
      endpointTested: rawUrl,
      messageFr: 'Adresse du service scanner invalide (doit commencer par http://, https:// ou /).',
      messageAr: 'عنوان خدمة الماسح الضوئي غير صالح (يجب أن يبدأ بـ http:// أو https:// أو /).',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  const statusUrl = rawUrl.endsWith('/status') ? rawUrl : `${rawUrl}/status`;

  try {
    let response = await fetch(statusUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404 && statusUrl !== rawUrl) {
      response = await fetch(rawUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    }

    const latencyMs = elapsed();
    if (!response.ok) {
      return {
        state: 'offline',
        reachable: false,
        hardwareReady: false,
        latencyMs,
        endpointTested: statusUrl,
        messageFr: `Le service local a répondu avec le code HTTP ${response.status}.`,
        messageAr: `استجابت الخدمة المحلية برمز الخطأ HTTP ${response.status}.`,
      };
    }

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = (await response.json()) as Record<string, unknown>;
    } catch {
      parsed = null;
    }

    const innerData =
      parsed?.data && typeof parsed.data === 'object'
        ? (parsed.data as Record<string, unknown>)
        : parsed;
    const deviceId =
      typeof innerData?.deviceId === 'string' && innerData.deviceId !== 'Not selected'
        ? innerData.deviceId
        : undefined;
    const enabled = innerData?.enabled === undefined ? true : Boolean(innerData.enabled);

    return {
      state: enabled ? 'connected' : 'service_only',
      reachable: true,
      hardwareReady: enabled,
      latencyMs,
      deviceId,
      endpointTested: statusUrl,
      messageFr: enabled
        ? deviceId
          ? `Connexion réussie au service local (${deviceId}).`
          : 'Connexion réussie au service local de numérisation.'
        : 'Service local joignable mais scanner désactivé.',
      messageAr: enabled
        ? deviceId
          ? `تم الاتصال بنجاح بالخدمة المحلية (${deviceId}).`
          : 'تم الاتصال بنجاح بخدمة الماسح الضوئي المحلية.'
        : 'الخدمة المحلية متصلة لكن الماسح معطل.',
    };
  } catch (err: unknown) {
    const isAbort = (err as { name?: string })?.name === 'AbortError';
    return {
      state: 'offline',
      reachable: false,
      hardwareReady: false,
      latencyMs: elapsed(),
      endpointTested: statusUrl,
      messageFr: isAbort
        ? 'Délai dépassé : impossible de joindre le service local du scanner.'
        : 'Service local hors ligne ou inaccessible depuis le navigateur (vérifiez que le pont local est démarré).',
      messageAr: isAbort
        ? 'انتهت مهلة الاتصال: تعذر الوصول إلى خدمة الماسح الضوئي المحلية.'
        : 'خدمة الماسح المحلي غير متصلة أو يتعذر الوصول إليها (تأكد من تشغيل الخدمة المحلية).',
    };
  } finally {
    clearTimeout(timer);
  }
};

// Start a scan - Admin and AdminTuningDesk only
export const startScan = async (config?: ScannerConfig): Promise<ScanResult> => {
  const response = await api.post('/scan/start', {
    ...config,
    format: normalizeFormat(config?.format as string),
  });
  return response.data?.data || response.data;
};

// Poll real backend scan status by scanId
export const getScanJobStatus = async (scanId: string): Promise<ScanJobStatus> => {
  const response = await api.get(`/scan/status/${encodeURIComponent(scanId)}`);
  return response.data?.data || response.data;
};

// Cancel an active scan job on the server
export const cancelScanJob = async (scanId: string): Promise<{ scanId: string; cancelled: boolean }> => {
  const response = await api.post(`/scan/cancel/${encodeURIComponent(scanId)}`);
  return response.data?.data || response.data;
};

// Fetch scanned file as binary Blob via protected API instance (Authorization Bearer)
export const getScanFileBlob = async (scanId: string, signal?: AbortSignal): Promise<Blob> => {
  const response = await api.get(`/scan/file/${encodeURIComponent(scanId)}`, {
    responseType: 'blob',
    signal,
    timeout: 60000,
  });
  return response.data;
};

// Fetch live per-page thumbnail as binary Blob via protected API instance
export const getScanPageThumbnailBlob = async (
  scanId: string,
  page: number,
  signal?: AbortSignal
): Promise<Blob> => {
  const response = await api.get(`/scan/thumbnail/${encodeURIComponent(scanId)}/${page}`, {
    responseType: 'blob',
    signal,
    timeout: 15000,
  });
  return response.data;
};

// Scan a document for association with a record - Admin and AdminTuningDesk only
export const scanDocument = async (options: {
  documentType: 'incoming' | 'outgoing';
  year?: number;
  config?: ScannerConfig;
  scanId?: string;
  signal?: AbortSignal;
}): Promise<DocumentScanResult> => {
  const requestData: Record<string, unknown> = {
    documentType: options.documentType,
    year: options.year || new Date().getFullYear(),
    format: normalizeFormat((options.config?.format as string) || 'pdf'),
    resolution: Number(options.config?.resolution || 300),
  };
  if (options.scanId) {
    requestData.scanId = options.scanId;
  }
  if (options.config?.colorMode) {
    requestData.colorMode = options.config.colorMode;
  }
  if (options.config?.documentSource) {
    requestData.documentSource = options.config.documentSource;
  }
  if (typeof options.config?.duplex === 'boolean') {
    requestData.duplex = options.config.duplex;
  }
  if (options.config?.paperSize) {
    requestData.paperSize = options.config.paperSize;
  }
  if (options.config?.languages) {
    requestData.languages = options.config.languages;
  }

  const response = await api.post('/scan/document', requestData, {
    signal: options.signal,
    timeout: 240000,
  });

  return response.data?.data || response.data;
};

// Scan a temporary document without associating it with a record - Admin and AdminTuningDesk only
export const scanTemporaryDocument = async (
  config?: ScannerConfig & {
    documentType?: string;
    temporary?: boolean;
    scanId?: string;
    languages?: string;
    signal?: AbortSignal;
  }
): Promise<DocumentScanResult> => {
  const requestData: Record<string, unknown> = {
    documentType: config?.documentType || 'temp',
    format: normalizeFormat((config?.format as string) || 'pdf'),
    resolution: Number(config?.resolution || 300),
  };
  if (config?.scanId) {
    requestData.scanId = config.scanId;
  }
  if (config?.colorMode) {
    requestData.colorMode = config.colorMode;
  }
  if (config?.documentSource) {
    requestData.documentSource = config.documentSource;
  }
  if (typeof config?.duplex === 'boolean') {
    requestData.duplex = config.duplex;
  }
  if (config?.paperSize) {
    requestData.paperSize = config.paperSize;
  }
  if (config?.languages) {
    requestData.languages = config.languages;
  }

  const response = await api.post('/scan/temp', requestData, {
    signal: config?.signal,
    timeout: 240000,
  });

  return response.data?.data || response.data;
};

// Get recent scans - Admin and AdminTuningDesk only
export const getRecentScans = async (limit?: number): Promise<ScanResult[]> => {
  const response = await api.get(`/scan/recent${limit ? `?limit=${limit}` : ''}`);
  return response.data?.data || response.data || [];
};

// Get a specific document scan - Admin and AdminTuningDesk only
export const getDocumentScan = async (id: string, type: string): Promise<ScanResult> => {
  const response = await api.get(`/scan/document/${encodeURIComponent(id)}/${encodeURIComponent(type)}`);
  return response.data?.data || response.data;
};

// Download scan file as Blob
export const downloadScan = async (scanId: string): Promise<Blob> => {
  return getScanFileBlob(scanId);
};

// Delete temporary scan file on server
export const deleteScan = async (scanId: string): Promise<void> => {
  await api.delete(`/scan/file/${encodeURIComponent(scanId)}`);
};

// Get scan metadata
export const getScanMetadata = async (scanId: string): Promise<ScanResult> => {
  const response = await api.get(`/scan/metadata/${encodeURIComponent(scanId)}`);
  return response.data?.data || response.data;
};
