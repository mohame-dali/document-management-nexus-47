const fs = require('fs');
const PDFDocument = require('pdfkit');
const { getImg2pdfPath, runCommand } = require('../commandRunner');
const { ScannerError } = require('../validation');

/**
 * Provides PDF conversion functionality for Linux/macOS without shell exec.
 */
class PdfConverter {
  static async convertWithImg2pdf(imageFiles, outputPath) {
    if (!Array.isArray(imageFiles) || imageFiles.length === 0) {
      throw new ScannerError('SCAN_FAILED', 'Aucune image à convertir en PDF.', 500);
    }

    const img2pdfBin = getImg2pdfPath();
    await runCommand(img2pdfBin, [...imageFiles, '-o', outputPath], { timeoutMs: 60000 });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new ScannerError('SCAN_FAILED', 'Le fichier PDF généré est vide.', 500);
    }

    return outputPath;
  }

  static convertWithPdfKit(imageFiles, outputPath) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(imageFiles) || imageFiles.length === 0) {
        return reject(new ScannerError('SCAN_FAILED', 'Aucune image à convertir en PDF.', 500));
      }

      try {
        const doc = new PDFDocument({ autoFirstPage: false });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        let addedPages = 0;
        for (const imageFile of imageFiles) {
          if (!fs.existsSync(imageFile)) {
            continue;
          }
          doc.addPage();
          doc.image(imageFile, {
            fit: [500, 700],
            align: 'center',
            valign: 'center',
          });
          addedPages++;
        }

        if (addedPages === 0) {
          doc.end();
          return reject(new ScannerError('SCAN_FAILED', 'Aucune page valide pour le PDF.', 500));
        }

        doc.end();

        stream.on('finish', () => resolve(outputPath));
        stream.on('error', (err) => {
          reject(new ScannerError('SCAN_FAILED', `Échec d'écriture PDF : ${err.message}`, 500));
        });
      } catch (error) {
        console.error('[Scanner][Linux] PDFKit conversion error:', error);
        reject(new ScannerError('SCAN_FAILED', 'Échec lors de la création du PDF.', 500));
      }
    });
  }
}

module.exports = PdfConverter;
