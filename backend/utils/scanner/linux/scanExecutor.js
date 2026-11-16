const fs = require('fs');
const path = require('path');
const {
  getScanimagePath,
  getTesseractPath,
  runCommand,
  CommandTimeoutError,
  CommandAbortedError,
} = require('../commandRunner');
const {
  isValidDeviceIdForPlatform,
  validateResolution,
  validateFormat,
  validateColorMode,
  ScannerError,
} = require('../validation');
const PdfConverter = require('./pdfConverter');

const SANE_COLOR_MAP = {
  Color: 'Color',
  Grayscale: 'Gray',
  BlackAndWhite: 'Lineart',
};

function mapLinuxCommandFailure(error) {
  if (error instanceof ScannerError) return error;
  if (error instanceof CommandTimeoutError) {
    return new ScannerError('SCAN_TIMEOUT', 'Délai de numérisation dépassé (timeout).', 504);
  }
  if (error instanceof CommandAbortedError) {
    return new ScannerError('SCAN_CANCELLED', 'Numérisation annulée.', 409);
  }

  const combined = `${error.stderr || ''}\n${error.stdout || ''}\n${error.message || ''}`;
  if (/SCANNER_NO_PAPER|PAPER_EMPTY|out of paper|feeder out of documents|no paper/i.test(combined)) {
    return new ScannerError('SCANNER_NO_PAPER', 'Aucun papier détecté dans le scanner.', 409);
  }
  if (/SCANNER_BUSY|device busy|resource busy|EBUSY/i.test(combined)) {
    return new ScannerError('SCANNER_BUSY', 'Le scanner est actuellement occupé.', 503);
  }
  if (/SCANNER_NOT_FOUND|no SANE devices|open of device .* failed.*Invalid|device .* not found/i.test(combined)) {
    return new ScannerError('SCANNER_NOT_FOUND', 'Scanner introuvable ou déconnecté.', 503);
  }

  return new ScannerError('SCAN_FAILED', 'Échec matériel lors de la numérisation.', 500);
}

/**
 * Handles scan execution for Linux/macOS safely via commandRunner (execFile/spawn, no shell).
 */
class ScanExecutor {
  static async executeScan(options) {
    const {
      scannerDevice,
      format,
      resolution,
      colorMode = 'Color',
      outputPath,
      jobTempDir,
      hasScanimageCmd,
      hasImg2pdfCmd,
      scannerEnabled,
      timeoutMs = 120000,
      signal = null,
      onPage = null,
      onBeforeProcessing = null,
    } = options;

    if (!scannerEnabled || !hasScanimageCmd) {
      throw new ScannerError(
        'SCANNER_NOT_FOUND',
        'Scanner non activé ou utilitaire scanimage indisponible.',
        503
      );
    }

    if (!isValidDeviceIdForPlatform(scannerDevice, process.platform)) {
      throw new ScannerError('INVALID_SCAN_PARAMS', 'Identifiant de scanner invalide.', 400);
    }

    const safeResolution = validateResolution(resolution);
    const safeFormat = validateFormat(format);
    const safeColor = validateColorMode(colorMode);
    const saneMode = SANE_COLOR_MAP[safeColor] || 'Color';

    fs.mkdirSync(jobTempDir, { recursive: true });

    if (safeFormat === 'pdf') {
      return await this.scanToPdf({
        scannerDevice,
        resolution: safeResolution,
        saneMode,
        outputPath,
        jobTempDir,
        hasImg2pdfCmd,
        timeoutMs,
        signal,
        onPage,
        onBeforeProcessing,
      });
    }

    return await this.scanToImage({
      scannerDevice,
      format: safeFormat,
      resolution: safeResolution,
      saneMode,
      outputPath,
      timeoutMs,
      signal,
      onPage,
    });
  }

  static async scanToImage({
    scannerDevice,
    format,
    resolution,
    saneMode,
    outputPath,
    timeoutMs,
    signal,
    onPage,
  }) {
    const saneFormat = format === 'jpg' ? 'jpeg' : 'png';
    const scanimageBin = getScanimagePath();
    const args = [
      `--device-name=${scannerDevice}`,
      `--format=${saneFormat}`,
      `--resolution=${resolution}`,
      '--mode',
      saneMode,
    ];

    try {
      await runCommand(scanimageBin, args, {
        timeoutMs,
        signal,
        stdoutToFile: outputPath,
      });
    } catch (err) {
      console.error('[Scanner][Linux] scanToImage failed:', err.stderr || err.message);
      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (_) {}
      }
      throw mapLinuxCommandFailure(err);
    }

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (_) {}
      }
      throw new ScannerError('SCAN_FAILED', 'Aucune donnée image produite par le scanner.', 500);
    }

    if (typeof onPage === 'function') {
      onPage(1);
    }

    return { outputPath, pageCount: 1 };
  }

  static async scanToPdf({
    scannerDevice,
    resolution,
    saneMode,
    outputPath,
    jobTempDir,
    hasImg2pdfCmd,
    timeoutMs,
    signal,
    onPage,
    onBeforeProcessing,
  }) {
    const scanimageBin = getScanimagePath();
    const batchPattern = path.join(jobTempDir, 'page_%d.png');
    const args = [
      `--device-name=${scannerDevice}`,
      '--format=png',
      `--resolution=${resolution}`,
      '--mode',
      saneMode,
      `--batch=${batchPattern}`,
    ];

    let highestReportedPage = 0;
    const handleLine = (line) => {
      // scanimage prints "Scanning page N" BEFORE probing the scanner, so on a 1-page
      // scan it emits "Scanning page 2" right before hitting EOF/no-more-docs.
      // Only count completed pages ("Scanned page N" or "PAGE:N").
      const m = line.trim().match(/^(?:PAGE:\s*|Scanned page )(\d+)/i);
      if (m) {
        const pageNum = Number(m[1]);
        if (Number.isFinite(pageNum) && pageNum > highestReportedPage) {
          highestReportedPage = pageNum;
          if (typeof onPage === 'function') {
            onPage(pageNum);
          }
        }
      }
    };

    try {
      await runCommand(scanimageBin, args, {
        timeoutMs,
        signal,
        onStdoutLine: handleLine,
        onStderrLine: handleLine,
      });

      const pageFiles = fs
        .readdirSync(jobTempDir)
        .filter((f) => /^page_\d+\.png$/i.test(f))
        .sort((a, b) => {
          const na = parseInt(a.match(/\d+/)[0], 10);
          const nb = parseInt(b.match(/\d+/)[0], 10);
          return na - nb;
        })
        .map((f) => path.join(jobTempDir, f));

      if (pageFiles.length === 0) {
        throw new ScannerError('SCAN_FAILED', 'Aucune page numérisée produite.', 500);
      }

      if (typeof onBeforeProcessing === 'function') {
        onBeforeProcessing(pageFiles.length);
      }

      if (hasImg2pdfCmd) {
        try {
          await PdfConverter.convertWithImg2pdf(pageFiles, outputPath);
        } catch (img2pdfErr) {
          console.warn('[Scanner][Linux] img2pdf failed, using PDFKit:', img2pdfErr.message);
          await PdfConverter.convertWithPdfKit(pageFiles, outputPath);
        }
      } else {
        await PdfConverter.convertWithPdfKit(pageFiles, outputPath);
      }

      return { outputPath, pageCount: pageFiles.length };
    } catch (err) {
      console.error('[Scanner][Linux] scanToPdf failed:', err.stderr || err.message);
      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (_) {}
      }
      throw mapLinuxCommandFailure(err);
    } finally {
      if (fs.existsSync(jobTempDir)) {
        try { fs.rmSync(jobTempDir, { recursive: true, force: true }); } catch (_) {}
      }
    }
  }

  static async performOCR(filePath, hasTesseractCmd) {
    if (!hasTesseractCmd) {
      return null;
    }

    const baseOut = filePath.replace(/\.[^/.]+$/, '');
    const tempTextFile = `${baseOut}.txt`;

    try {
      await runCommand(
        getTesseractPath(),
        [filePath, baseOut, '-l', 'ara+fra+eng'],
        { timeoutMs: 60000 }
      );

      if (fs.existsSync(tempTextFile)) {
        const extractedText = fs.readFileSync(tempTextFile, 'utf8');
        fs.unlinkSync(tempTextFile);
        return extractedText;
      }
      return null;
    } catch (error) {
      console.error('[Scanner][Linux] OCR error:', error.message);
      if (fs.existsSync(tempTextFile)) {
        try { fs.unlinkSync(tempTextFile); } catch (_) {}
      }
      return null;
    }
  }
}

module.exports = ScanExecutor;
