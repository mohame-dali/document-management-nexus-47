
const IncomingDocument = require('../../../models/IncomingDocument');
const ErrorResponse = require('../../../utils/errorResponse');
const { getNextSerialNumber, createYearFolder, getDocumentPath } = require('../../../utils/documentHelper');
const { handleUploadedFile } = require('../../../utils/fileUploadHandler');
const { handleScannedDocument } = require('../../../utils/scannedDocumentHandler');
const { 
  validateIncomingDocumentFields, 
  processDepartmentAssignments 
} = require('../../../utils/documentValidation');
const { createActivityNotifications } = require('../../../utils/activityNotificationHelper');

// @desc    Create new incoming document
// @route   POST /api/incoming-documents
// @access  Private/Admin/AdminTuningDesk
exports.createIncomingDocument = async (req, res, next) => {
  try {
    console.log('Creating incoming document with body:', JSON.stringify(req.body, null, 2));
    console.log('File info:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path
    } : 'No file uploaded');
    
    // Get document data from request body
    const {
      arrivalDate,
      correspondenceNumber,
      correspondenceDate,
      typeDocument,
      activity,
      dateActivity,
      source,
      subject,
      departmentIds,
      serialNumber: providedSerialNumber,
      year: providedYear,
      scannedDocumentPath: providedScannedDocumentPath,
      ocrText: providedOcrText
    } = req.body;
    
    console.log('Scanned document path from request:', providedScannedDocumentPath);
    console.log('OCR text from request:', providedOcrText ? 'Present' : 'Not present');
    
    // Validate required fields
    validateIncomingDocumentFields(req.body);
    
    // Get the next serial number for the current year in arrivalDate
    const userDate = new Date(arrivalDate);
    const yearIncom = providedYear || userDate.getFullYear();
    const serialNumber = providedSerialNumber || await getNextSerialNumber(yearIncom, 'incoming');
    
    console.log('Generated serial number:', serialNumber, 'for year:', yearIncom);
    
    // Define the final folder path
    const finalFolderPath = getDocumentPath('incoming', yearIncom);
    await createYearFolder(finalFolderPath);
    console.log('Final folder path:', finalFolderPath);
    
    // Handle document upload or use scanned document
    let finalDocumentPath = null;
    let ocrText = providedOcrText || null;
    
    if (req.file) {
      // Handle file upload
      console.log('Processing uploaded file');
      const result = await handleUploadedFile(req.file, serialNumber, finalFolderPath, 'incoming');
      finalDocumentPath = result.finalDocumentPath;
      ocrText = result.ocrText || ocrText;
      console.log('Handled uploaded file, path:', finalDocumentPath);
    } else if (providedScannedDocumentPath && providedScannedDocumentPath.trim() !== '') {
      // Handle scanned document - pass the full details
      console.log('Processing scanned document with path:', providedScannedDocumentPath);
      try {
        const result = await handleScannedDocument(
          req.user._id, 
          serialNumber, 
          finalFolderPath, 
          'incoming', 
          providedScannedDocumentPath, 
          providedOcrText
        );
        finalDocumentPath = result.finalDocumentPath;
        ocrText = result.ocrText || ocrText;
        console.log('Handled scanned document successfully, final path:', finalDocumentPath);
      } catch (scanError) {
        console.error('Error processing scanned document:', scanError);
        return next(new ErrorResponse('Failed to process scanned document', 500));
      }
    } else {
      console.log('No file or scanned document provided');
    }
    
    console.log('Final document path before saving:', finalDocumentPath);
    
    // Process department assignments
    const assignedTo = await processDepartmentAssignments(departmentIds);
    
    // Create document
    const documentData = {
      serialNumber,
      year: yearIncom,
      arrivalDate,
      correspondenceNumber,
      correspondenceDate,
      typeDocument,
      activity,
      source,
      subject,
      scannedDocument: finalDocumentPath,
      ocrText,
      assignedTo,
      createdBy: req.user._id
    };

    // Add dateActivity only if activity is provided
    if (activity && dateActivity) {
      documentData.dateActivity = new Date(dateActivity);
    }

    const document = await IncomingDocument.create(documentData);
    
    // Create activity notifications if both activity and dateActivity are provided
    if (activity && dateActivity) {
      try {
        await createActivityNotifications(document._id, activity, new Date(dateActivity), assignedTo);
      } catch (notificationError) {
        console.error('Error creating activity notifications:', notificationError);
        // Don't fail the document creation if notifications fail
      }
    }
    
    console.log(`Created incoming document with ID: ${document._id}, file: ${finalDocumentPath}`);
    
    res.status(201).json({
      success: true,
      data: document
    });
  } catch (err) {
    console.error('Error creating incoming document:', err);
    // Handle duplicate serial number for the year
    if (err.code === 11000) {
      return next(
        new ErrorResponse('A document with this serial number already exists for this year', 400)
      );
    }
    next(err);
  }
};
