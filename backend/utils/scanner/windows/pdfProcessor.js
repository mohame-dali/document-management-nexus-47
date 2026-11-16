const fs = require('fs');
const PDFDocument = require('pdfkit');
const { ScannerError } = require('../validation');

/**
 * Inspect magic bytes of an image file to determine its real format.
 */
function detectImageFormat(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, header, 0, 12, 0);
    if (bytesRead < 3) return null;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytesRead >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    ) {
      return 'png';
    }
    // JPEG: FF D8 FF
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return 'jpg';
    }
    // BMP: 42 4D
    if (header[0] === 0x42 && header[1] === 0x4d) {
      return 'bmp';
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Handles PDF creation and image processing from scanned pages on Windows
 */
class PDFProcessor {
  static createPDFFromImages(imagePaths, outputPath) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
        return reject(new ScannerError('SCAN_FAILED', 'Aucune image à convertir en PDF.', 500));
      }

      const validImages = imagePaths.filter((p) => {
        if (!p || !fs.existsSync(p)) return false;
        const realFmt = detectImageFormat(p);
        if (realFmt !== 'png' && realFmt !== 'jpg') {
          console.error(`[Scanner][Windows] Unsupported image format (${realFmt || 'unknown'}) for PDFKit: ${p}`);
          return false;
        }
        return true;
      });

      if (validImages.length === 0) {
        return reject(
          new ScannerError('SCAN_FAILED', 'Format d’image numérisée invalide pour la conversion PDF.', 500)
        );
      }

      try {
        const doc = new PDFDocument({ autoFirstPage: false });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        for (const imagePath of validImages) {
          doc.addPage();
          doc.image(imagePath, {
            fit: [500, 700],
            align: 'center',
            valign: 'center',
          });
        }

        doc.end();

        stream.on('finish', () => resolve(outputPath));
        stream.on('error', (err) => {
          reject(new ScannerError('SCAN_FAILED', `Échec écriture PDF : ${err.message}`, 500));
        });
      } catch (pdfError) {
        console.error('[Scanner][Windows] Error creating PDF:', pdfError);
        reject(new ScannerError('SCAN_FAILED', 'Échec de génération du document PDF.', 500));
      }
    });
  }

  static async processPagesToFormat(pagePaths, outputPath, format) {
    const normalized = String(format || 'pdf').toLowerCase() === 'jpeg' ? 'jpg' : String(format || 'pdf').toLowerCase();

    if (normalized === 'pdf') {
      return await PDFProcessor.createPDFFromImages(pagePaths, outputPath);
    }

    const firstPage = pagePaths[0];
    if (!firstPage || !fs.existsSync(firstPage)) {
      throw new ScannerError('SCAN_FAILED', 'Fichier image numérisé introuvable.', 500);
    }

    const realFmt = detectImageFormat(firstPage);
    if (!realFmt) {
      throw new ScannerError('SCAN_FAILED', 'Fichier image numérisé invalide ou corrompu.', 500);
    }

    fs.copyFileSync(firstPage, outputPath);
    return outputPath;
  }
}

module.exports = PDFProcessor;
module.exports.detectImageFormat = detectImageFormat;
