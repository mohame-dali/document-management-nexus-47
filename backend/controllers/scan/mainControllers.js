const path = require('path');
const fs = require('fs');
const scannerService = require('../../utils/scanner');
const { extractTextFromPDF } = require('../../utils/ocrProcessor');
const { ScannerError, validateScanOptions } = require('../../utils/scanner/validation');

function handleScannerControllerError(res, error, fallbackMessage = 'Erreur du service de numérisation.') {
  if (error instanceof ScannerError) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }

  console.error('[Scanner Controller Error]', error);
  return res.status(500).json({
    success: false,
    code: 'SCAN_FAILED',
    message: fallbackMessage,
  });
}

function sanitizeStatus(status) {
  return {
    enabled: Boolean(status.enabled),
    isScanning: Boolean(status.isScanning),
    deviceId: status.deviceId || 'Not selected',
    resolution: status.resolution,
    format: status.format,
    platform: status.platform,
    lastScanTime: status.lastScanTime || null,
    errorState: status.errorState || null,
    scanCount: status.scanCount || 0,
    supportedFormats: status.supportedFormats || ['pdf', 'jpg', 'png'],
    currentDocumentType: status.currentDocumentType || null,
    lastOcrSuccess: status.lastOcrSuccess || null,
    recentScans: Array.isArray(status.recentScans)
      ? status.recentScans.map((entry) => ({
          scanId: entry.scanId || null,
          deviceId: entry.deviceId || null,
          timestamp: entry.timestamp,
          format: entry.format || null,
          documentType: entry.documentType || null,
          pageCount: entry.pageCount || 1,
          success: entry.success !== false,
          code: entry.code || undefined,
          fileName: entry.outputPath ? path.basename(entry.outputPath) : undefined,
        }))
      : [],
  };
}

// @desc    Start a scan job
// @route   POST /api/scan/start
// @access  Private/AdminTuningDesk/Admin
exports.startScan = async (req, res) => {
  try {
    const {
      documentType = 'temp',
      format,
      resolution,
      colorMode,
      documentSource,
      scanId,
    } = req.body || {};

    if (!['incoming', 'outgoing', 'temp'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SCAN_PARAMS',
        message: 'Type de document invalide (incoming, outgoing ou temp requis).',
      });
    }

    const validated = validateScanOptions({
      format,
      resolution,
      colorMode,
      documentSource,
      scanId,
    });

    const scanResult = await scannerService.startScan({
      documentType,
      format: validated.format,
      resolution: validated.resolution,
      colorMode: validated.colorMode,
      documentSource: validated.documentSource,
      scanId: validated.scanId || undefined,
      userId: String(req.user?.id || req.user?._id || ''),
    });

    const job = scannerService.getStatusManager().getJob(scanResult.scanId);
    if (job && (job.cancelled || job.abortController?.signal?.aborted)) {
      if (scanResult.filePath && fs.existsSync(scanResult.filePath)) {
        try { fs.unlinkSync(scanResult.filePath); } catch (_) {}
      }
      throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
    }

    let ocrText = '';
    let ocrProcessed = false;

    if (validated.format === 'pdf' && fs.existsSync(scanResult.filePath)) {
      try {
        ocrText =
          (await extractTextFromPDF(scanResult.filePath, 'ara+fra+eng', {
            signal: job?.abortController?.signal || null,
          })) || '';
        ocrProcessed = true;
      } catch (ocrErr) {
        if (
          ocrErr?.name === 'AbortError' ||
          job?.cancelled ||
          job?.abortController?.signal?.aborted
        ) {
          if (scanResult.filePath && fs.existsSync(scanResult.filePath)) {
            try { fs.unlinkSync(scanResult.filePath); } catch (_) {}
          }
          throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
        }
        console.error('[Scanner] OCR processing error:', ocrErr.message);
      }
    }

    if (job && (job.cancelled || job.abortController?.signal?.aborted)) {
      if (scanResult.filePath && fs.existsSync(scanResult.filePath)) {
        try { fs.unlinkSync(scanResult.filePath); } catch (_) {}
      }
      throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
    }

    scannerService.getStatusManager().setOcrResult(ocrProcessed);

    return res.status(200).json({
      success: true,
      data: {
        scanId: scanResult.scanId,
        fileName: path.basename(scanResult.filePath),
        filePath: `/api/scan/file/${scanResult.scanId}`,
        fileUrl: `/api/scan/file/${scanResult.scanId}`,
        format: scanResult.format,
        pageCount: scanResult.pageCount || 1,
        documentType,
        ocrText,
        ocrProcessed,
        scannedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleScannerControllerError(res, error, 'Échec du démarrage de la numérisation.');
  }
};

// @desc    Get scanner status
// @route   GET /api/scan/status
// @access  Private/AdminTuningDesk/Admin
exports.getScannerStatus = async (_req, res) => {
  try {
    const config = scannerService.getConfig();
    if (config.scannerEnabled) {
      await scannerService.init().catch(() => {});
    }

    const rawStatus = scannerService.getStatus();
    const status = sanitizeStatus(rawStatus);
    const platform = scannerService.getPlatform();

    if (platform === 'win32') {
      status.hasWindowsScanTools = Boolean(scannerService.hasWindowsScanTools);
    } else {
      status.hasScanimageCmd = Boolean(scannerService.hasScanimageCmd);
    }

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    return handleScannerControllerError(res, error, 'Impossible de lire l’état du scanner.');
  }
};

// @desc    List available physical scanners (returns 503 SCANNER_NOT_FOUND when none/unavailable)
// @route   GET /api/scan/devices
// @access  Private/AdminTuningDesk/Admin
exports.listScanners = async (_req, res) => {
  try {
    if (!scannerService.getConfig().scannerEnabled) {
      return res.status(503).json({
        success: false,
        code: 'SCANNER_NOT_FOUND',
        message: 'Le module de numérisation est désactivé sur ce serveur (SCANNER_ENABLED=false).',
      });
    }

    const scanners = await scannerService.listScanners();

    if (!Array.isArray(scanners) || scanners.length === 0) {
      return res.status(503).json({
        success: false,
        code: 'SCANNER_NOT_FOUND',
        message: 'Aucun scanner physique détecté sur ce système.',
      });
    }

    return res.status(200).json({
      success: true,
      count: scanners.length,
      data: scanners,
    });
  } catch (error) {
    return handleScannerControllerError(res, error, 'Impossible de lister les scanners disponibles.');
  }
};

// @desc    Get recent scans (sanitized, without server paths)
// @route   GET /api/scan/recent
// @access  Private/AdminTuningDesk/Admin
exports.getRecentScans = async (req, res) => {
  try {
    const limitParam = req.query?.limit ? Number(req.query.limit) : 10;
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

    const history = scannerService.getScanHistory().slice(0, limit).map((entry) => ({
      scanId: entry.scanId || null,
      deviceId: entry.deviceId || null,
      timestamp: entry.timestamp,
      format: entry.format || null,
      documentType: entry.documentType || null,
      pageCount: entry.pageCount || 1,
      success: entry.success !== false,
      code: entry.code || undefined,
      fileName: entry.outputPath ? path.basename(entry.outputPath) : undefined,
    }));

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    return handleScannerControllerError(res, error, 'Impossible de lire l’historique de numérisation.');
  }
};

// @desc    Select a specific scanner device
// @route   POST /api/scan/select-device
// @access  Private/AdminTuningDesk/Admin
exports.selectScanner = async (req, res) => {
  try {
    const rawDeviceId = req.body?.deviceId ?? req.body?.scannerId;

    if (!rawDeviceId || typeof rawDeviceId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SCAN_PARAMS',
        message: 'Identifiant de scanner requis.',
      });
    }

    if (!scannerService.getConfig().scannerEnabled) {
      return res.status(503).json({
        success: false,
        code: 'SCANNER_NOT_FOUND',
        message: 'Le module de numérisation est désactivé sur ce serveur.',
      });
    }

    const selected = await scannerService.selectScannerDevice(rawDeviceId.trim());

    if (!selected) {
      return res.status(503).json({
        success: false,
        code: 'SCANNER_NOT_FOUND',
        message: 'Scanner introuvable parmi les périphériques détectés.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Scanner sélectionné avec succès.',
      data: {
        deviceId: rawDeviceId.trim(),
        scannerId: rawDeviceId.trim(),
        status: sanitizeStatus(scannerService.getStatus()),
      },
    });
  } catch (error) {
    return handleScannerControllerError(res, error, 'Impossible de sélectionner le scanner.');
  }
};
