const ocrQueue = require('./ocrQueue');
const { extractTextFromPDF } = require('../utils/ocrProcessor');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const path = require('path');

// Process OCR jobs
ocrQueue.process(async (job) => {
  const { documentId, documentType, filePath, languages = 'ara+fra+eng' } = job.data;
  
  console.log(`Starting OCR processing for ${documentType} document ${documentId}`);
  
  try {
    // Update document status to processing
    if (documentType === 'incoming') {
      await IncomingDocument.findByIdAndUpdate(
        documentId,
        { 
          ocrStatus: 'processing',
          ocrStartedAt: new Date()
        }
      );
    } else if (documentType === 'outgoing') {
      await OutgoingDocument.findByIdAndUpdate(
        documentId,
        { 
          ocrStatus: 'processing',
          ocrStartedAt: new Date()
        }
      );
    }
    
    // Extract text using OCR
    const ocrText = await extractTextFromPDF(filePath, languages);
    
    // Update the document with OCR text and completed status
    let updatedDocument;
    if (documentType === 'incoming') {
      updatedDocument = await IncomingDocument.findByIdAndUpdate(
        documentId,
        { 
          ocrText,
          ocrStatus: 'completed',
          ocrCompletedAt: new Date()
        },
        { new: true }
      );
    } else if (documentType === 'outgoing') {
      updatedDocument = await OutgoingDocument.findByIdAndUpdate(
        documentId,
        { 
          ocrText,
          ocrStatus: 'completed',
          ocrCompletedAt: new Date()
        },
        { new: true }
      );
    }
    
    console.log(`OCR processing completed for ${documentType} document ${documentId}`);
    
    return {
      success: true,
      documentId,
      documentType,
      ocrTextLength: ocrText ? ocrText.length : 0,
      hasArabicText: ocrText ? /[\u0600-\u06FF]/.test(ocrText) : false
    };
    
  } catch (error) {
    console.error(`OCR processing failed for ${documentType} document ${documentId}:`, error);
    
    // Update document with failed status
    try {
      if (documentType === 'incoming') {
        await IncomingDocument.findByIdAndUpdate(
          documentId,
          { 
            ocrStatus: 'failed',
            ocrError: error.message,
            ocrFailedAt: new Date()
          }
        );
      } else if (documentType === 'outgoing') {
        await OutgoingDocument.findByIdAndUpdate(
          documentId,
          { 
            ocrStatus: 'failed',
            ocrError: error.message,
            ocrFailedAt: new Date()
          }
        );
      }
    } catch (updateError) {
      console.error('Failed to update document with OCR failure status:', updateError);
    }
    
    throw error;
  }
});

// Export a function to add OCR jobs to the queue
const addOCRJob = async (documentId, documentType, filePath, languages = 'ara+fra+eng') => {
  try {
    const job = await ocrQueue.add({
      documentId,
      documentType,
      filePath,
      languages
    });
    
    console.log(`Added OCR job to queue: ${job.id} for ${documentType} document ${documentId}`);
    return job;
  } catch (error) {
    console.error('Failed to add OCR job to queue:', error);
    throw error;
  }
};

module.exports = { addOCRJob };
