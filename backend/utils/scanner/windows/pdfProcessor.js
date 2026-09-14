
const fs = require('fs');
const PDFDocument = require('pdfkit');

/**
 * Handles PDF creation and processing from scanned images
 */
class PDFProcessor {
  /**
   * Convert a scanned image to PDF
   * @param {string} imagePath - Path to the scanned image
   * @param {string} outputPath - Path for the output PDF
   * @returns {Promise<string>} Path to the created PDF
   */
  static createPDFFromImage(imagePath, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        // Create a new PDF document
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(outputPath);
        
        // Pipe the PDF to a file
        doc.pipe(stream);
        
        // Add the scanned image
        doc.image(imagePath, {
          fit: [500, 700],
          align: 'center',
          valign: 'center'
        });
        
        // Finalize the PDF
        doc.end();
        
        // Handle completion
        stream.on('finish', () => {
          resolve(outputPath);
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
      } catch (pdfError) {
        console.error('Error creating PDF:', pdfError);
        reject(pdfError);
      }
    });
  }
  
  /**
   * Process image file to desired format (PDF or image)
   * @param {string} tempImagePath - Path to the temporary image file
   * @param {string} outputPath - Desired output path
   * @param {string} format - Desired format (pdf, jpeg, png)
   * @returns {Promise<string>} Path to the processed file
   */
  static async processToFormat(tempImagePath, outputPath, format) {
    if (format.toLowerCase() === 'pdf') {
      return await PDFProcessor.createPDFFromImage(tempImagePath, outputPath);
    } else {
      // For JPEG or PNG, just copy the file
      fs.copyFileSync(tempImagePath, outputPath);
      return outputPath;
    }
  }
}

module.exports = PDFProcessor;
