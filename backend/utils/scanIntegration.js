const fs = require('fs');
const path = require('path');
const scannerService = require('./scanner');
const { getNextSerialNumber, createYearFolder, getDocumentPath } = require('./documentHelper');
const { extractTextFromPDF } = require('./ocrProcessor');
const { ScannerError, validateScanOptions } = require('./scanner/validation');

// ASYNC OCR FIX: Allow explicit language override while defaulting incoming mail to Arabic-only ('ara') for faster OCR
function resolveOcrLanguages(documentType, explicitLanguages) {
  if (typeof explicitLanguages === 'string') {
    const trimmed = explicitLanguages.trim();
    if (/^[a-z]{2,4}(\+[a-z]{2,4})*$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }
  }
  return documentType === 'incoming' ? 'ara' : 'ara+fra+eng';
}

// ASYNC OCR FIX: Resolve Mongoose model lazily only when updating a linked document after background OCR
function getDocumentModelByType(documentType) {
  if (documentType === 'incoming') {
    return require('../models/IncomingDocument');
  }
  if (documentType === 'outgoing') {
    return require('../models/OutgoingDocument');
  }
  return null;
}

// ASYNC OCR FIX: Non-blocking background OCR runner executed via setImmediate (never awaited by HTTP request)
function launchBackgroundOcr({ scanId, filePath, documentType = 'temp', languages }) {
  const statusManager = scannerService.getStatusManager();
  const ocrLanguages = resolveOcrLanguages(documentType, languages);

  statusManager.updateJob(scanId, {
    ocrStatus: 'processing',
    ocrText: '',
    ocrError: null,
    ocrInProgress: true,
    ocrLanguages,
  });

  setImmediate(async () => {
    const job = statusManager.getJob(scanId);
    try {
      if (job && (job.cancelled || job.abortController?.signal?.aborted)) {
        statusManager.updateJob(scanId, {
          ocrStatus: 'failed',
          ocrError: 'Numérisation annulée.',
          ocrInProgress: false,
        });
        return;
      }

      const targetPath =
        filePath && fs.existsSync(filePath)
          ? filePath
          : job?.finalFilePath && fs.existsSync(job.finalFilePath)
            ? job.finalFilePath
            : null;

      if (!targetPath) {
        const missingMsg = 'Fichier introuvable pour le traitement OCR en arrière-plan.';
        console.warn(`[Scanner Async OCR] ${missingMsg} (scanId=${scanId})`);
        statusManager.updateJob(scanId, {
          ocrStatus: 'failed',
          ocrError: missingMsg,
          ocrInProgress: false,
        });
        statusManager.setOcrResult(false);
        return;
      }

      console.log(
        `[Scanner Async OCR] Démarrage OCR en arrière-plan (scanId=${scanId}, lang=${ocrLanguages})`
      );

      const ocrText =
        (await extractTextFromPDF(targetPath, ocrLanguages, {
          signal: job?.abortController?.signal || null,
        })) || '';

      const latestJob = statusManager.getJob(scanId);
      if (latestJob && (latestJob.cancelled || latestJob.abortController?.signal?.aborted)) {
        statusManager.updateJob(scanId, {
          ocrStatus: 'failed',
          ocrError: 'Numérisation annulée.',
          ocrInProgress: false,
        });
        return;
      }

      statusManager.updateJob(scanId, {
        ocrStatus: 'completed',
        ocrText,
        ocrError: null,
        ocrInProgress: false,
      });
      statusManager.setOcrResult(true);

      console.log(
        `[Scanner Async OCR] ✅ OCR terminé (scanId=${scanId}, chars=${ocrText.length})`
      );

      // ASYNC OCR FIX: If the user already saved the document while OCR was running, persist OCR text to MongoDB
      if (latestJob?.targetDocumentId && latestJob?.targetDocumentType) {
        const Model = getDocumentModelByType(latestJob.targetDocumentType);
        if (Model) {
          try {
            await Model.findByIdAndUpdate(
              latestJob.targetDocumentId,
              {
                ocrText,
                ocrStatus: 'completed',
                ocrError: null,
              },
              { new: true }
            );
            console.log(
              `[Scanner Async OCR] ✅ Document ${latestJob.targetDocumentType}#${latestJob.targetDocumentId} mis à jour avec le texte OCR`
            );
          } catch (dbErr) {
            console.error(
              `[Scanner Async OCR] Échec mise à jour DB (${latestJob.targetDocumentType}#${latestJob.targetDocumentId}):`,
              dbErr.message
            );
          }
        }
      }
    } catch (ocrError) {
      const latestJob = statusManager.getJob(scanId);
      const isAborted =
        ocrError?.name === 'AbortError' ||
        latestJob?.cancelled ||
        latestJob?.abortController?.signal?.aborted;
      const errMessage = isAborted
        ? 'Traitement OCR annulé.'
        : ocrError?.message || 'Erreur OCR inconnue.';

      if (isAborted) {
        console.log(`[Scanner Async OCR] Traitement OCR annulé (scanId=${scanId})`);
      } else {
        console.error(`[Scanner Async OCR] Échec OCR (scanId=${scanId}):`, errMessage);
      }

      statusManager.updateJob(scanId, {
        ocrStatus: 'failed',
        ocrError: errMessage,
        ocrInProgress: false,
      });
      statusManager.setOcrResult(false);

      if (latestJob?.targetDocumentId && latestJob?.targetDocumentType) {
        const Model = getDocumentModelByType(latestJob.targetDocumentType);
        if (Model) {
          try {
            await Model.findByIdAndUpdate(latestJob.targetDocumentId, {
              ocrStatus: 'failed',
              ocrError: errMessage,
            });
          } catch (dbErr) {
            console.error(
              `[Scanner Async OCR] Échec mise à jour erreur OCR en DB (${latestJob.targetDocumentType}#${latestJob.targetDocumentId}):`,
              dbErr.message
            );
          }
        }
      }
    } finally {
      const latestJob = statusManager.getJob(scanId);
      if (latestJob) {
        latestJob.ocrInProgress = false;
        const pendingPath = latestJob.pendingTempCleanupPath;
        latestJob.pendingTempCleanupPath = null;
        if (
          pendingPath &&
          pendingPath !== latestJob.filePath &&
          pendingPath !== latestJob.finalFilePath &&
          fs.existsSync(pendingPath)
        ) {
          try {
            fs.unlinkSync(pendingPath);
            console.log(`[Scanner Async OCR] Fichier temporaire différé supprimé: ${pendingPath}`);
          } catch (cleanupErr) {
            console.warn(
              `[Scanner Async OCR] Impossible de supprimer le fichier différé ${pendingPath}:`,
              cleanupErr.message
            );
          }
        }
      }
    }
  });
}

exports.launchBackgroundOcr = launchBackgroundOcr;
exports.resolveOcrLanguages = resolveOcrLanguages;

/**
 * Handles document scanning and preparation for persistent document creation
 */
exports.scanForDocument = async (options) => {
  let tempFilePath = null;
  try {
    const {
      documentType,
      year,
      user,
      format = 'pdf',
      resolution = 300,
      colorMode,
      documentSource,
      scanId,
      languages,
    } = options;

    if (!documentType || !['incoming', 'outgoing'].includes(documentType)) {
      throw new ScannerError(
        'INVALID_SCAN_PARAMS',
        'Type de document invalide (incoming ou outgoing requis).',
        400
      );
    }

    if (!user || (!user.id && !user._id)) {
      throw new ScannerError('INVALID_SCAN_PARAMS', 'Utilisateur authentifié requis.', 400);
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
      userId: String(user.id || user._id),
    });

    tempFilePath = scanResult.filePath;

    const serialNumber = await getNextSerialNumber(year, documentType);
    const finalFolderPath = getDocumentPath(documentType, year);
    await createYearFolder(finalFolderPath);

    const fileExt = `.${validated.format === 'jpg' ? 'jpg' : validated.format}`;
    const newFilename = `${serialNumber}${fileExt}`;
    const newFilePath = path.join(finalFolderPath, newFilename);

    if (!fs.existsSync(tempFilePath)) {
      throw new ScannerError('SCAN_FAILED', 'Fichier numérisé introuvable après capture.', 500);
    }

    if (!fs.existsSync(path.dirname(newFilePath))) {
      fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
    }

    fs.copyFileSync(tempFilePath, newFilePath);

    if (!fs.existsSync(newFilePath)) {
      throw new ScannerError('SCAN_FAILED', 'Échec de copie du document numérisé.', 500);
    }

    try {
      fs.unlinkSync(tempFilePath);
      tempFilePath = null;
    } catch (cleanupErr) {
      console.warn('[Scanner] Could not remove temp file:', cleanupErr.message);
    }

    const job = scannerService.getStatusManager().getJob(scanResult.scanId);
    if (job && (job.cancelled || job.abortController?.signal?.aborted)) {
      if (fs.existsSync(newFilePath)) {
        try { fs.unlinkSync(newFilePath); } catch (_) {}
      }
      throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
    }

    const docTypeFolder = documentType === 'incoming' ? 'Incoming-Doc' : 'Outgoing-Doc';
    const scannedDocumentPath = `courrier/${year}/${docTypeFolder}/${newFilename}`;

    // ASYNC OCR FIX: Trigger OCR in background without awaiting so response returns immediately
    let ocrStatus = 'completed';
    if (fileExt.toLowerCase() === '.pdf' && fs.existsSync(newFilePath)) {
      scannerService.getStatusManager().updateJob(scanResult.scanId, {
        finalFilePath: newFilePath,
      });
      launchBackgroundOcr({
        scanId: scanResult.scanId,
        filePath: newFilePath,
        documentType,
        languages,
      });
      ocrStatus = 'processing';
    } else {
      scannerService.getStatusManager().updateJob(scanResult.scanId, {
        ocrStatus: 'completed',
        ocrText: '',
        ocrInProgress: false,
        finalFilePath: newFilePath,
      });
    }

    return {
      success: true,
      scanId: scanResult.scanId,
      serialNumber,
      filePath: scannedDocumentPath,
      year,
      ocrText: '',
      ocrStatus,
      format: validated.format,
      pageCount: scanResult.pageCount || 1,
    };
  } catch (error) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }

    if (error instanceof ScannerError) {
      return {
        success: false,
        code: error.code,
        statusCode: error.statusCode,
        error: error.message,
      };
    }

    console.error('[Scanner] scanForDocument unexpected error:', error);
    return {
      success: false,
      code: 'SCAN_FAILED',
      statusCode: 500,
      error: 'Erreur interne lors de la numérisation du document.',
    };
  }
};

/**
 * Scans a temporary document and exposes scanId for secure /status/:scanId and /file/:scanId
 */
exports.scanDocument = async (options) => {
  try {
    const {
      documentType = 'temp',
      format = 'pdf',
      resolution = 300,
      colorMode,
      documentSource,
      scanId,
      userId,
      languages,
    } = options;

    if (!userId) {
      throw new ScannerError('INVALID_SCAN_PARAMS', 'Identifiant utilisateur requis.', 400);
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
      userId: String(userId),
    });

    const job = scannerService.getStatusManager().getJob(scanResult.scanId);
    if (job && (job.cancelled || job.abortController?.signal?.aborted)) {
      if (scanResult.filePath && fs.existsSync(scanResult.filePath)) {
        try { fs.unlinkSync(scanResult.filePath); } catch (_) {}
      }
      throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
    }

    // ASYNC OCR FIX: Do NOT await extractTextFromPDF here — return physical scan immediately and launch OCR in background
    let ocrStatus = 'completed';
    if (validated.format === 'pdf' && scanResult.filePath && fs.existsSync(scanResult.filePath)) {
      launchBackgroundOcr({
        scanId: scanResult.scanId,
        filePath: scanResult.filePath,
        documentType,
        languages,
      });
      ocrStatus = 'processing';
    } else {
      scannerService.getStatusManager().updateJob(scanResult.scanId, {
        ocrStatus: 'completed',
        ocrText: '',
        ocrInProgress: false,
      });
    }

    return {
      success: true,
      scanId: scanResult.scanId,
      filePath: scanResult.filePath,
      format: validated.format,
      pageCount: scanResult.pageCount || 1,
      ocrText: '',
      ocrStatus,
    };
  } catch (error) {
    if (error instanceof ScannerError) {
      return {
        success: false,
        code: error.code,
        statusCode: error.statusCode,
        error: error.message,
      };
    }

    console.error('[Scanner] scanDocument unexpected error:', error);
    return {
      success: false,
      code: 'SCAN_FAILED',
      statusCode: 500,
      error: 'Erreur interne lors de la numérisation.',
    };
  }
};

exports.checkScannerStatus = async () => {
  try {
    const status = scannerService.getStatus();
    const scanners = await scannerService.listScanners();
    return {
      success: true,
      status,
      scanners,
      scannersDetected: scanners.length > 0,
    };
  } catch (error) {
    return {
      success: false,
      code: error.code || 'SCANNER_NOT_FOUND',
      statusCode: error.statusCode || 503,
      error: error.message,
    };
  }
};
