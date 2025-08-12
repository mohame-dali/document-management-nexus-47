
const fs = require('fs');
const { exec } = require('child_process');

/**
 * Provides PDF conversion functionality for Linux/macOS
 */
class PdfConverter {
  /**
   * Convert JPEG files to PDF using img2pdf
   * @param {string[]} jpegFiles - Array of JPEG file paths
   * @param {string} outputPath - Output PDF path
   * @returns {Promise<string>} - Path to the output PDF
   */
  static convertWithImg2pdf(jpegFiles, outputPath) {
    const convertCommand = `img2pdf ${jpegFiles.join(' ')} -o "${outputPath}"`;
    
    return new Promise((resolve, reject) => {
      exec(convertCommand, async (convertError) => {
        // Clean up temp files regardless of success
        try {
          jpegFiles.forEach(file => {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
            }
          });
        } catch (deleteError) {
          console.error('Error deleting temporary files:', deleteError);
        }
        
        if (convertError) {
          console.error('Error converting JPEG to PDF:', convertError);
          return reject(new Error(`PDF conversion failed: ${convertError.message}`));
        }
        
        resolve(outputPath);
      });
    });
  }

  /**
   * Convert JPEG files to PDF using PDFKit (JavaScript)
   * @param {string[]} jpegFiles - Array of JPEG file paths
   * @param {string} outputPath - Output PDF path
   * @returns {Promise<string>} - Path to the output PDF
   */
  static convertWithPdfKit(jpegFiles, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(outputPath);
        
        // Pipe the PDF to a file
        doc.pipe(stream);
        
        // Add each scanned page to the PDF
        for (const jpegFile of jpegFiles) {
          if (!fs.existsSync(jpegFile)) {
            console.warn(`Warning: JPEG file does not exist: ${jpegFile}`);
            continue;
          }
          
          try {
            doc.addPage();
            doc.image(jpegFile, {
              fit: [500, 700],
              align: 'center',
              valign: 'center'
            });
          } catch (imageError) {
            console.error(`Error adding image to PDF: ${imageError.message}`);
          }
        }
        
        // Finalize the PDF
        doc.end();
        
        // Handle events
        stream.on('finish', () => {
          // Clean up temp files
          try {
            jpegFiles.forEach(file => {
              if (fs.existsSync(file)) {
                fs.unlinkSync(file);
              }
            });
          } catch (deleteError) {
            console.error('Error deleting temporary files:', deleteError);
          }
          
          resolve(outputPath);
        });
        
        stream.on('error', (err) => {
          console.error('Error writing PDF:', err);
          
          // Clean up temp files
          try {
            jpegFiles.forEach(file => {
              if (fs.existsSync(file)) {
                fs.unlinkSync(file);
              }
            });
          } catch (deleteError) {
            console.error('Error deleting temporary files:', deleteError);
          }
          
          reject(err);
        });
      } catch (error) {
        console.error('Error creating PDF document:', error);
        
        // Clean up temp files
        try {
          jpegFiles.forEach(file => {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
            }
          });
        } catch (deleteError) {
          console.error('Error deleting temporary files:', deleteError);
        }
        
        reject(error);
      }
    });
  }
}

module.exports = PdfConverter;
