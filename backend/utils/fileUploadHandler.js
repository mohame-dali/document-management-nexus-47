
const fs = require('fs');
const path = require('path');
const { extractTextFromPDF } = require('./ocrProcessor');

/**
 * Handle uploaded file processing with enhanced Arabic text support
 * @param {Object} file - Uploaded file object
 * @param {string} serialNumber - Document serial number
 * @param {string} finalFolderPath - Destination folder path
 * @param {string} documentType - Type of document (incoming/outgoing)
 * @returns {Object} - { finalDocumentPath, ocrText }
 */
exports.handleUploadedFile = async (file, serialNumber, finalFolderPath, documentType) => {
  console.log('Processing uploaded file with Arabic text support:', file.path);
  console.log('Using serial number for filename:', serialNumber);
  
  // Always use .pdf extension for consistency
  const newFilename = `${serialNumber}.pdf`;
  const newFilePath = path.join(finalFolderPath, newFilename);
  
  console.log('Target file path:', newFilePath);
  
  // Ensure destination directory exists
  if (!fs.existsSync(finalFolderPath)) {
    fs.mkdirSync(finalFolderPath, { recursive: true });
    console.log('Created directory:', finalFolderPath);
  }
  
  // Move the file to the appropriate year folder
  if (fs.existsSync(file.path)) {
    fs.renameSync(file.path, newFilePath);
    console.log(`Successfully moved uploaded document from ${file.path} to ${newFilePath}`);
  } else {
    throw new Error(`Uploaded file not found: ${file.path}`);
  }
  
  // Create relative path for the database - ensure consistent format
  const year = path.basename(path.dirname(finalFolderPath));
  const docTypeFolder = documentType === 'incoming' ? 'Incoming-Doc' : 'Outgoing-Doc';
  const finalDocumentPath = `courrier/${year}/${docTypeFolder}/${newFilename}`;
  
  console.log('Generated relative path for database:', finalDocumentPath);
  
  // Extract text from PDF using enhanced Arabic OCR
  let ocrText = null;
  const fileExt = path.extname(newFilename).toLowerCase();
  if (fileExt === '.pdf') {
    try {
      console.log('Extracting Arabic OCR text from uploaded file:', newFilePath);
      ocrText = await extractTextFromPDF(newFilePath, 'ara+fra+eng');
      console.log('Enhanced Arabic OCR extraction completed successfully');
      
      // Log Arabic OCR results for debugging
      if (ocrText) {
        const arabicCharCount = (ocrText.match(/[\u0600-\u06FF]/g) || []).length;
        const totalCharCount = ocrText.replace(/\s/g, '').length;
        console.log(`Arabic OCR from upload: ${ocrText.length} total chars, ${arabicCharCount} Arabic chars, ${totalCharCount} non-space chars`);
        
        // Log first 100 characters for debugging
        console.log('First 100 characters of Arabic OCR from upload:', ocrText.substring(0, 100));
      }
    } catch (ocrErr) {
      console.error('Enhanced Arabic OCR processing failed:', ocrErr);
    }
  }
  
  return { finalDocumentPath, ocrText };
};
