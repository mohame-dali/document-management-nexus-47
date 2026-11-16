const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const scanIntegration = require('../../utils/scanIntegration');
const scannerService = require('../../utils/scanner');
const {
  ScannerError,
  validateScanOptions,
  validateScanId,
  resolveSafeTempPath,
  getContentTypeForFormat,
} = require('../../utils/scanner/validation');

function sendScannerError(res, error, fallbackMessage = 'Erreur lors du traitement de la numérisation.') {
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

function getAuthenticatedUserId(req) {
  return String(req.user?.id || req.user?._id || '');
}

/**
 * @desc    Scan a document directly for incoming/outgoing insertion
 * @route   POST /api/scan/document
 * @access  Private/Admin/AdminTuningDesk
 */
exports.scanForDocument = async (req, res) => {
  try {
    const { documentType, year, format, resolution, colorMode, documentSource, scanId } = req.body || {};

    if (!documentType || (documentType !== 'incoming' && documentType !== 'outgoing')) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SCAN_PARAMS',
        message: 'Type de document invalide (incoming ou outgoing requis).',
      });
    }

    const docYear = year !== undefined && year !== null && year !== '' ? Number(year) : new Date().getFullYear();
    if (!Number.isInteger(docYear) || docYear < 1900 || docYear > 2100) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SCAN_PARAMS',
        message: 'Année de document invalide.',
      });
    }

    const validated = validateScanOptions({
      format,
      resolution,
      colorMode,
      documentSource,
      scanId,
    });

    const scanResult = await scanIntegration.scanForDocument({
      documentType,
      year: docYear,
      user: req.user,
      format: validated.format,
      resolution: validated.resolution,
      colorMode: validated.colorMode,
      documentSource: validated.documentSource,
      scanId: validated.scanId || undefined,
    });

    if (!scanResult.success) {
      return res.status(scanResult.statusCode || 500).json({
        success: false,
        code: scanResult.code || 'SCAN_FAILED',
        message: scanResult.error || 'Échec de la numérisation.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId: scanResult.scanId,
        filePath: scanResult.filePath,
        serialNumber: scanResult.serialNumber,
        year: scanResult.year,
        documentType,
        ocrText: scanResult.ocrText,
        format: scanResult.format,
        pageCount: scanResult.pageCount || 1,
      },
    });
  } catch (err) {
    return sendScannerError(res, err, 'Erreur lors de la numérisation du document.');
  }
};

/**
 * @desc    Scan a temporary document and return scanId + protected file endpoint
 * @route   POST /api/scan/temp
 * @access  Private/Admin/AdminTuningDesk
 */
exports.scanTemporaryDocument = async (req, res) => {
  try {
    const {
      format,
      resolution,
      colorMode,
      documentSource,
      scanId,
      documentType,
    } = req.body || {};

    if (documentType && !['incoming', 'outgoing', 'temp'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SCAN_PARAMS',
        message: 'Type de document invalide.',
      });
    }

    const validated = validateScanOptions({
      format,
      resolution,
      colorMode,
      documentSource,
      scanId,
    });

    const scanResult = await scanIntegration.scanDocument({
      documentType: documentType || 'temp',
      format: validated.format,
      resolution: validated.resolution,
      colorMode: validated.colorMode,
      documentSource: validated.documentSource,
      scanId: validated.scanId || undefined,
      userId: getAuthenticatedUserId(req),
    });

    if (!scanResult.success) {
      return res.status(scanResult.statusCode || 500).json({
        success: false,
        code: scanResult.code || 'SCAN_FAILED',
        message: scanResult.error || 'Échec de la numérisation.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId: scanResult.scanId,
        fileName: path.basename(scanResult.filePath),
        filePath: `/api/scan/file/${scanResult.scanId}`,
        fileUrl: `/api/scan/file/${scanResult.scanId}`,
        format: scanResult.format,
        pageCount: scanResult.pageCount || 1,
        ocrText: scanResult.ocrText || '',
      },
    });
  } catch (err) {
    return sendScannerError(res, err, 'Erreur lors de la numérisation temporaire.');
  }
};

/**
 * @desc    Get real progress/status of a scan job (owner-only)
 * @route   GET /api/scan/status/:scanId
 * @access  Private/Admin/AdminTuningDesk
 */
exports.getScanJobStatus = async (req, res) => {
  try {
    const scanId = validateScanId(req.params.scanId);
    const result = scannerService
      .getStatusManager()
      .getJobStatusForUser(scanId, getAuthenticatedUserId(req));

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Tâche de numérisation introuvable.',
      });
    }

    if (result.forbidden) {
      return res.status(403).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Accès non autorisé à cette tâche de numérisation.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.job,
    });
  } catch (err) {
    return sendScannerError(res, err, 'Impossible de récupérer l’état de la numérisation.');
  }
};

/**
 * @desc    Cancel an ongoing scan job (owner-only)
 * @route   POST /api/scan/cancel/:scanId
 * @access  Private/Admin/AdminTuningDesk
 */
exports.cancelScanJob = async (req, res) => {
  try {
    const scanId = validateScanId(req.params.scanId);
    const result = scannerService
      .getStatusManager()
      .cancelJob(scanId, getAuthenticatedUserId(req));

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Tâche de numérisation introuvable.',
      });
    }

    if (result.forbidden) {
      return res.status(403).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Accès non autorisé à cette tâche de numérisation.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId,
        cancelled: true,
        stage: 'error',
        code: 'SCAN_CANCELLED',
      },
    });
  } catch (err) {
    return sendScannerError(res, err, 'Impossible d’annuler la numérisation.');
  }
};

/**
 * @desc    Serve scanned temporary file as binary blob (owner-only)
 * @route   GET /api/scan/file/:scanId
 * @route   GET /api/scan/download/:scanId
 * @access  Private/Admin/AdminTuningDesk
 */
exports.getScanFile = async (req, res) => {
  try {
    const scanId = validateScanId(req.params.scanId);
    const userId = getAuthenticatedUserId(req);
    const statusManager = scannerService.getStatusManager();
    const job = statusManager.getJob(scanId);

    if (!job) {
      return res.status(404).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Fichier numérisé introuvable.',
      });
    }

    if (job.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Accès non autorisé à ce fichier numérisé.',
      });
    }

    if (job.stage !== 'done' || !job.filePath) {
      return res.status(409).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Le fichier numérisé n’est pas encore prêt.',
      });
    }

    const tempRoot = path.resolve(scannerService.getConfig().tempDir);
    const resolvedFilePath = path.resolve(job.filePath);

    if (!resolvedFilePath.startsWith(tempRoot + path.sep) || !fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Fichier numérisé introuvable sur le serveur.',
      });
    }

    const contentType = job.mimeType || getContentTypeForFormat(job.format);
    const safeFilename = path.basename(resolvedFilePath).replace(/[^A-Za-z0-9_.-]/g, '_');

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'no-store');

    return res.sendFile(resolvedFilePath);
  } catch (err) {
    return sendScannerError(res, err, 'Impossible de récupérer le fichier numérisé.');
  }
};

/**
 * @desc    Delete scanned temporary file (owner-only)
 * @route   DELETE /api/scan/file/:scanId
 * @route   DELETE /api/scan/:scanId
 * @access  Private/Admin/AdminTuningDesk
 */
exports.deleteScanFile = async (req, res) => {
  try {
    const scanId = validateScanId(req.params.scanId);
    const result = scannerService
      .getStatusManager()
      .deleteJobFile(scanId, getAuthenticatedUserId(req));

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Tâche de numérisation introuvable.',
      });
    }

    if (result.forbidden) {
      return res.status(403).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Accès non autorisé à cette tâche de numérisation.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId,
        deleted: true,
      },
    });
  } catch (err) {
    return sendScannerError(res, err, 'Impossible de supprimer le fichier numérisé.');
  }
};

/**
 * @desc    Get scan job metadata (owner-only, no server disk path)
 * @route   GET /api/scan/metadata/:scanId
 * @access  Private/Admin/AdminTuningDesk
 */
exports.getScanMetadata = async (req, res) => {
  try {
    const scanId = validateScanId(req.params.scanId);
    const job = scannerService.getStatusManager().getJob(scanId);

    if (!job) {
      return res.status(404).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Métadonnées de numérisation introuvables.',
      });
    }

    if (job.ownerId !== getAuthenticatedUserId(req)) {
      return res.status(403).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Accès non autorisé à ces métadonnées.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        scanId: job.scanId,
        stage: job.stage,
        page: job.page,
        format: job.format,
        resolution: job.resolution,
        documentType: job.documentType,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (err) {
    return sendScannerError(res, err, 'Impossible de récupérer les métadonnées.');
  }
};

/**
 * @desc    Get a scanned document reference by ID and type (validated against path traversal)
 * @route   GET /api/scan/document/:id/:type
 * @access  Private/Admin/AdminTuningDesk
 */
exports.getDocumentScan = async (req, res) => {
  try {
    const { id, type } = req.params;

    if (type !== 'incoming' && type !== 'outgoing' && type !== 'temp') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SCAN_PARAMS',
        message: 'Type de document invalide.',
      });
    }

    if (type === 'temp') {
      const tempDir = scannerService.getConfig().tempDir;
      const resolvedPath = resolveSafeTempPath(tempDir, id);
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({
          success: false,
          code: 'SCAN_FAILED',
          message: 'Document temporaire introuvable.',
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          id,
          type,
          fileName: path.basename(resolvedPath),
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SCAN_PARAMS',
        message: 'Identifiant de document invalide.',
      });
    }

    const Model =
      type === 'incoming'
        ? require('../../models/IncomingDocument')
        : require('../../models/OutgoingDocument');

    const document = await Model.findById(id).select('scannedDocument');
    if (!document || !document.scannedDocument) {
      return res.status(404).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Document numérisé introuvable.',
      });
    }

    const backendRoot = path.resolve(__dirname, '../..');
    const resolvedDocPath = path.resolve(backendRoot, document.scannedDocument);
    if (!resolvedDocPath.startsWith(backendRoot + path.sep) || !fs.existsSync(resolvedDocPath)) {
      return res.status(404).json({
        success: false,
        code: 'SCAN_FAILED',
        message: 'Fichier du document introuvable.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id,
        type,
        filePath: document.scannedDocument,
      },
    });
  } catch (err) {
    return sendScannerError(res, err, 'Impossible de récupérer le document numérisé.');
  }
};
