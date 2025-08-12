
const fs = require('fs');
const path = require('path');
const { extractTextFromPDF } = require('./ocrProcessor');

/**
 * Handle scanned document processing with enhanced Arabic text support
 * @param {string} userId - User ID who initiated the scan
 * @param {string} serialNumber - Document serial number
 * @param {string} finalFolderPath - Destination folder path
 * @param {string} documentType - Type of document (incoming/outgoing)
 * @param {string} providedScannedDocumentPath - Optional scanned document path
 * @param {string} providedOcrText - Optional OCR text
 * @returns {Object} - { finalDocumentPath, ocrText }
 */
exports.handleScannedDocument = async (userId, serialNumber, finalFolderPath, documentType, providedScannedDocumentPath, providedOcrText) => {
  console.log('Processing scanned document with Arabic text support - serial number:', serialNumber);
  console.log('Provided scanned document path:', providedScannedDocumentPath);
  console.log('Final folder path:', finalFolderPath);
  
  let finalDocumentPath = null;
  let ocrText = providedOcrText || null;
  
  if (providedScannedDocumentPath && providedScannedDocumentPath.trim() !== '') {
    // Check if the provided path is already a relative database path
    if (providedScannedDocumentPath.startsWith('courrier/')) {
      console.log('Path appears to be a relative database path already:', providedScannedDocumentPath);
      
      // Construct the full file path to verify it exists
      const fullPath = path.join(__dirname, '..', providedScannedDocumentPath);
      
      if (fs.existsSync(fullPath)) {
        console.log('File exists at database path, using as-is');
        finalDocumentPath = providedScannedDocumentPath;
        
        // Extract OCR text if not already provided - enhanced for Arabic
        if (!ocrText && path.extname(fullPath).toLowerCase() === '.pdf') {
          try {
            console.log('Extracting Arabic OCR text from existing file:', fullPath);
            ocrText = await extractTextFromPDF(fullPath, 'ara+fra+eng');
            console.log('Enhanced Arabic OCR extraction completed successfully');
            
            // Log Arabic text statistics
            if (ocrText) {
              const arabicCharCount = (ocrText.match(/[\u0600-\u06FF]/g) || []).length;
              console.log(`Arabic OCR result: ${ocrText.length} total chars, ${arabicCharCount} Arabic chars`);
            }
          } catch (ocrErr) {
            console.error('Arabic OCR processing failed for existing scanned document:', ocrErr);
          }
        }
        
        return { finalDocumentPath, ocrText };
      }
    }
    
    // Handle temporary file path - need to move to final location
    const newFilename = `${serialNumber}.pdf`;
    const newFilePath = path.join(finalFolderPath, newFilename);
    
    console.log('Target file path:', newFilePath);
    
    // Ensure destination directory exists
    if (!fs.existsSync(finalFolderPath)) {
      fs.mkdirSync(finalFolderPath, { recursive: true });
      console.log('Created directory:', finalFolderPath);
    }
    
    // Enhanced path resolution
    let sourcePath = providedScannedDocumentPath;
    
    // Handle various path formats
    if (!path.isAbsolute(sourcePath)) {
      // First try: relative to backend root
      const backendRelativePath = path.join(__dirname, '..', sourcePath);
      if (fs.existsSync(backendRelativePath)) {
        sourcePath = backendRelativePath;
        console.log('Found file relative to backend root:', sourcePath);
      } else {
        // Second try: in uploads folder
        const uploadsPath = path.join(__dirname, '..', 'uploads', path.basename(sourcePath));
        if (fs.existsSync(uploadsPath)) {
          sourcePath = uploadsPath;
          console.log('Found file in uploads folder:', sourcePath);
        } else {
          // Third try: in temp folder
          const tempPath = path.join(__dirname, '..', 'temp', path.basename(sourcePath));
          if (fs.existsSync(tempPath)) {
            sourcePath = tempPath;
            console.log('Found file in temp folder:', sourcePath);
          } else {
            // Fourth try: scan temp directory
            const scanTempPath = path.join(__dirname, '..', 'temp', 'scan', path.basename(sourcePath));
            if (fs.existsSync(scanTempPath)) {
              sourcePath = scanTempPath;
              console.log('Found file in scan temp folder:', sourcePath);
            }
          }
        }
      }
    }
    
    console.log('Final source file path:', sourcePath);
    
    // Check if the source file exists and process it
    if (fs.existsSync(sourcePath)) {
      try {
        // Copy the scanned document to the final location
        fs.copyFileSync(sourcePath, newFilePath);
        console.log(`Successfully copied scanned document from ${sourcePath} to ${newFilePath}`);
        
        // Verify the file was copied successfully
        if (fs.existsSync(newFilePath)) {
          console.log('File copied successfully, verifying size...');
          const sourceStats = fs.statSync(sourcePath);
          const targetStats = fs.statSync(newFilePath);
          console.log(`Source size: ${sourceStats.size}, Target size: ${targetStats.size}`);
        }
        
        // Create relative path for the database - ensure consistent format
        const year = path.basename(path.dirname(finalFolderPath));
        const docTypeFolder = documentType === 'incoming' ? 'Incoming-Doc' : 'Outgoing-Doc';
        finalDocumentPath = `courrier/${year}/${docTypeFolder}/${newFilename}`;
        console.log('Generated relative path for database:', finalDocumentPath);
        
        // Extract text from PDF using enhanced Arabic OCR if not already provided
        if (!ocrText && path.extname(newFilePath).toLowerCase() === '.pdf') {
          try {
            console.log('Extracting Arabic OCR text from:', newFilePath);
            ocrText = await extractTextFromPDF(newFilePath, 'ara+fra+eng');
            console.log('Enhanced Arabic OCR extraction completed successfully');
            
            // Log Arabic OCR results for debugging
            if (ocrText) {
              const arabicCharCount = (ocrText.match(/[\u0600-\u06FF]/g) || []).length;
              const totalCharCount = ocrText.replace(/\s/g, '').length;
              console.log(`Arabic OCR extracted: ${ocrText.length} total chars, ${arabicCharCount} Arabic chars, ${totalCharCount} non-space chars`);
              
              // Log first 100 characters for debugging
              console.log('First 100 characters of Arabic OCR:', ocrText.substring(0, 100));
            }
          } catch (ocrErr) {
            console.error('Enhanced Arabic OCR processing failed for scanned document:', ocrErr);
          }
        }
        
        // Clean up temporary file if it's different from the final location
        if (path.resolve(sourcePath) !== path.resolve(newFilePath) && fs.existsSync(sourcePath)) {
          try {
            // Only delete if it's in a temp directory
            if (sourcePath.includes('temp') || sourcePath.includes('uploads')) {
              fs.unlinkSync(sourcePath);
              console.log(`Cleaned up temporary file: ${sourcePath}`);
            }
          } catch (cleanupErr) {
            console.warn('Could not clean up temporary file:', cleanupErr);
          }
        }
      } catch (copyErr) {
        console.error('Error copying scanned document:', copyErr);
        throw new Error(`Failed to copy scanned document: ${copyErr.message}`);
      }
    } else {
      console.error('Provided scanned document path does not exist:', sourcePath);
      throw new Error(`Scanned document file not found: ${sourcePath}`);
    }
  } else {
    console.log('No scanned document path provided or path is empty');
  }
  
  console.log('Returning final document path:', finalDocumentPath);
  console.log('Returning Arabic OCR text length:', ocrText ? ocrText.length : 0);
  
  return { finalDocumentPath, ocrText };
};
