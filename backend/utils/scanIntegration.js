const fs = require('fs');
const path = require('path');
const scannerService = require('./scanner');
const { getNextSerialNumber, createYearFolder, getDocumentPath } = require('./documentHelper');
const { extractTextFromPDF } = require('./ocrProcessor');
const { ScannerError, validateScanOptions } = require('./scanner/validation');

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

    let ocrText = '';
    if (fileExt.toLowerCase() === '.pdf') {
      try {
        ocrText =
          (await extractTextFromPDF(newFilePath, 'ara+fra+eng', {
            signal: job?.abortController?.signal || null,
          })) || '';
      } catch (ocrError) {
        if (
          ocrError?.name === 'AbortError' ||
          job?.cancelled ||
          job?.abortController?.signal?.aborted
        ) {
          if (fs.existsSync(newFilePath)) {
            try { fs.unlinkSync(newFilePath); } catch (_) {}
          }
          throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
        }
        console.error('[Scanner] OCR extraction error:', ocrError.message);
      }
    }

    if (job && (job.cancelled || job.abortController?.signal?.aborted)) {
      if (fs.existsSync(newFilePath)) {
        try { fs.unlinkSync(newFilePath); } catch (_) {}
      }
      throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
    }

    return {
      success: true,
      scanId: scanResult.scanId,
      serialNumber,
      filePath: scannedDocumentPath,
      year,
      ocrText,
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

    let ocrText = '';
    if (validated.format === 'pdf' && fs.existsSync(scanResult.filePath)) {
      try {
        ocrText =
          (await extractTextFromPDF(scanResult.filePath, 'ara+fra+eng', {
            signal: job?.abortController?.signal || null,
          })) || '';
      } catch (ocrError) {
        if (
          ocrError?.name === 'AbortError' ||
          job?.cancelled ||
          job?.abortController?.signal?.aborted
        ) {
          if (scanResult.filePath && fs.existsSync(scanResult.filePath)) {
            try { fs.unlinkSync(scanResult.filePath); } catch (_) {}
          }
          throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
        }
        console.error('[Scanner] Temporary OCR error:', ocrError.message);
      }
    }

    if (job && (job.cancelled || job.abortController?.signal?.aborted)) {
      if (scanResult.filePath && fs.existsSync(scanResult.filePath)) {
        try { fs.unlinkSync(scanResult.filePath); } catch (_) {}
      }
      throw new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
    }

    return {
      success: true,
      scanId: scanResult.scanId,
      filePath: scanResult.filePath,
      format: validated.format,
      pageCount: scanResult.pageCount || 1,
      ocrText,
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
