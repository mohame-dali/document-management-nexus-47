const path = require('path');

const ALLOWED_RESOLUTIONS = [75, 150, 200, 300, 600];
const ALLOWED_FORMATS = ['pdf', 'jpg', 'png'];
const ALLOWED_COLOR_MODES = ['Color', 'Grayscale', 'BlackAndWhite'];
const ALLOWED_DOCUMENT_SOURCES = ['Flatbed', 'Feeder'];

const SCAN_ERROR_CODES = {
  SCANNER_NOT_FOUND: { code: 'SCANNER_NOT_FOUND', statusCode: 503 },
  SCANNER_BUSY: { code: 'SCANNER_BUSY', statusCode: 503 },
  SCAN_TIMEOUT: { code: 'SCAN_TIMEOUT', statusCode: 504 },
  SCAN_FAILED: { code: 'SCAN_FAILED', statusCode: 500 },
  SCANNER_NO_PAPER: { code: 'SCANNER_NO_PAPER', statusCode: 409 },
  SCAN_CANCELLED: { code: 'SCAN_CANCELLED', statusCode: 409 },
  INVALID_SCAN_PARAMS: { code: 'INVALID_SCAN_PARAMS', statusCode: 400 },
};

class ScannerError extends Error {
  constructor(code, message, statusCode) {
    const def = SCAN_ERROR_CODES[code] || SCAN_ERROR_CODES.SCAN_FAILED;
    super(message || def.code);
    this.name = 'ScannerError';
    this.code = def.code;
    this.statusCode = statusCode || def.statusCode;
  }
}

function isValidDeviceIdForPlatform(deviceId, platform = process.platform) {
  if (!deviceId || typeof deviceId !== 'string') return false;
  const trimmed = deviceId.trim();
  if (trimmed.length < 3 || trimmed.length > 200) return false;
  if (trimmed.includes('..') || trimmed.startsWith('-')) return false;
  if (/[\r\n\0;|&$`"'<>]/.test(trimmed)) return false;

  if (platform === 'win32') {
    // Reject Linux SANE identifiers (e.g. panamfs:libusb:003:003, escl:..., net:...)
    if (trimmed.includes(':')) return false;
    // Windows WIA DeviceID: {GUID}\0000 or PnP instance ID without spaces/shell metacharacters
    return /^(\{[0-9A-Fa-f-]{36}\}\\\d{1,6}|[A-Za-z0-9_.\\{}-]{3,200})$/.test(trimmed);
  }

  // Linux / macOS SANE device ID: e.g. panamfs:libusb:003:003, escl:http://... or test:device0
  // Reject Windows WIA GUID\0000 IDs
  if (/^\{[0-9A-Fa-f-]{36}\}\\\d+/.test(trimmed)) return false;
  return /^[A-Za-z0-9_.:/@-]{3,200}$/.test(trimmed);
}

function validateResolution(rawResolution) {
  if (rawResolution === undefined || rawResolution === null || rawResolution === '') {
    return 300;
  }
  if (typeof rawResolution === 'string' && !/^\d+$/.test(rawResolution.trim())) {
    throw new ScannerError(
      'INVALID_SCAN_PARAMS',
      `Résolution invalide. Valeurs autorisées : ${ALLOWED_RESOLUTIONS.join(', ')}`,
      400
    );
  }
  const num = Number(rawResolution);
  if (!Number.isInteger(num) || !ALLOWED_RESOLUTIONS.includes(num)) {
    throw new ScannerError(
      'INVALID_SCAN_PARAMS',
      `Résolution non autorisée. Valeurs autorisées : ${ALLOWED_RESOLUTIONS.join(', ')}`,
      400
    );
  }
  return num;
}

function validateFormat(rawFormat) {
  if (rawFormat === undefined || rawFormat === null || rawFormat === '') {
    return 'pdf';
  }
  if (typeof rawFormat !== 'string') {
    throw new ScannerError(
      'INVALID_SCAN_PARAMS',
      `Format invalide. Valeurs autorisées : ${ALLOWED_FORMATS.join(', ')}`,
      400
    );
  }
  const normalized = rawFormat.trim().toLowerCase() === 'jpeg' ? 'jpg' : rawFormat.trim().toLowerCase();
  if (!ALLOWED_FORMATS.includes(normalized)) {
    throw new ScannerError(
      'INVALID_SCAN_PARAMS',
      `Format non autorisé. Valeurs autorisées : ${ALLOWED_FORMATS.join(', ')}`,
      400
    );
  }
  return normalized;
}

function validateColorMode(rawColorMode) {
  if (rawColorMode === undefined || rawColorMode === null || rawColorMode === '') {
    return 'Color';
  }
  if (typeof rawColorMode !== 'string') {
    throw new ScannerError('INVALID_SCAN_PARAMS', 'Mode couleur invalide', 400);
  }
  const key = rawColorMode.trim().toLowerCase();
  const map = {
    color: 'Color',
    grayscale: 'Grayscale',
    gray: 'Grayscale',
    blackandwhite: 'BlackAndWhite',
    lineart: 'BlackAndWhite',
    bw: 'BlackAndWhite',
  };
  const resolved = map[key];
  if (!resolved || !ALLOWED_COLOR_MODES.includes(resolved)) {
    throw new ScannerError(
      'INVALID_SCAN_PARAMS',
      `Mode couleur non autorisé. Valeurs autorisées : ${ALLOWED_COLOR_MODES.join(', ')}`,
      400
    );
  }
  return resolved;
}

function validateDocumentSource(rawSource) {
  if (rawSource === undefined || rawSource === null || rawSource === '') {
    return 'Flatbed';
  }
  if (typeof rawSource !== 'string') {
    throw new ScannerError('INVALID_SCAN_PARAMS', 'Source document invalide', 400);
  }
  const key = rawSource.trim().toLowerCase();
  const map = {
    flatbed: 'Flatbed',
    feeder: 'Feeder',
    adf: 'Feeder',
  };
  const resolved = map[key];
  if (!resolved || !ALLOWED_DOCUMENT_SOURCES.includes(resolved)) {
    throw new ScannerError(
      'INVALID_SCAN_PARAMS',
      `Source document non autorisée. Valeurs autorisées : ${ALLOWED_DOCUMENT_SOURCES.join(', ')}`,
      400
    );
  }
  return resolved;
}

function validateScanId(rawScanId) {
  if (!rawScanId || typeof rawScanId !== 'string') {
    throw new ScannerError('INVALID_SCAN_PARAMS', 'Identifiant de numérisation invalide', 400);
  }
  const trimmed = rawScanId.trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(trimmed)) {
    throw new ScannerError('INVALID_SCAN_PARAMS', 'Identifiant de numérisation invalide', 400);
  }
  return trimmed;
}

function validateScanOptions(options = {}) {
  const resolution = validateResolution(options.resolution);
  const format = validateFormat(options.format);
  const colorMode = validateColorMode(options.colorMode);
  const documentSource = validateDocumentSource(options.documentSource);
  const scanId = options.scanId !== undefined ? validateScanId(options.scanId) : null;

  return {
    resolution,
    format,
    colorMode,
    documentSource,
    scanId,
  };
}

/**
 * Safely resolve a filename strictly within baseDir (prevents path traversal).
 */
function resolveSafeTempPath(baseDir, rawId) {
  if (!rawId || typeof rawId !== 'string') {
    throw new ScannerError('INVALID_SCAN_PARAMS', 'Identifiant de fichier invalide', 400);
  }
  if (
    rawId.includes('..') ||
    rawId.includes('/') ||
    rawId.includes('\\') ||
    rawId.includes('%') ||
    rawId.includes('\0')
  ) {
    throw new ScannerError('INVALID_SCAN_PARAMS', 'Chemin non autorisé', 400);
  }
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(rawId)) {
    throw new ScannerError('INVALID_SCAN_PARAMS', 'Nom de fichier invalide', 400);
  }
  const root = path.resolve(baseDir);
  const resolved = path.resolve(root, rawId);
  if (!resolved.startsWith(root + path.sep)) {
    throw new ScannerError('INVALID_SCAN_PARAMS', 'Accès hors répertoire interdit', 400);
  }
  return resolved;
}

function getContentTypeForFormat(format) {
  const normalized = String(format || '').toLowerCase();
  if (normalized === 'pdf') return 'application/pdf';
  if (normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg';
  if (normalized === 'png') return 'image/png';
  return 'application/octet-stream';
}

module.exports = {
  ALLOWED_RESOLUTIONS,
  ALLOWED_FORMATS,
  ALLOWED_COLOR_MODES,
  ALLOWED_DOCUMENT_SOURCES,
  SCAN_ERROR_CODES,
  ScannerError,
  isValidDeviceIdForPlatform,
  validateResolution,
  validateFormat,
  validateColorMode,
  validateDocumentSource,
  validateScanId,
  validateScanOptions,
  resolveSafeTempPath,
  getContentTypeForFormat,
};
