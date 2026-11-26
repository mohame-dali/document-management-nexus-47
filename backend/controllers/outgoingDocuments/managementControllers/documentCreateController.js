
const OutgoingDocument = require('../../../models/OutgoingDocument');
const IncomingDocument = require('../../../models/IncomingDocument');
const Department = require('../../../models/Department');
const ErrorResponse = require('../../../utils/errorResponse');
const { getNextSerialNumber, createYearFolder, getDocumentPath } = require('../../../utils/documentHelper');
const { handleUploadedFile } = require('../../../utils/fileUploadHandler');
const { handleScannedDocument } = require('../../../utils/scannedDocumentHandler');
const { buildInitialVersionState } = require('../../../utils/documentVersionHelper');
const { computeFileSha256 } = require('../../../utils/fileSecurity');
const fs = require('fs');
const path = require('path');

// @desc    Create new outgoing document
// @route   POST /api/outgoing-documents
// @access  Private/Admin/AdminTuningDesk
exports.createOutgoingDocument = async (req, res, next) => {
  try {
    console.log('Creating outgoing document with body:', JSON.stringify(req.body, null, 2));
    console.log('File info:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path
    } : 'No file uploaded');
    
    const {
      issueDate,
      typeDocument,
      departmentId,
      assignedTo,
      pourInfo,
      subject,
      referenceId,
      serialNumber: providedSerialNumber,
      year: providedYear,
      scannedDocumentPath: providedScannedDocumentPath,
      ocrText: providedOcrText
    } = req.body;

    // Validate required fields
    if (!issueDate || !typeDocument || !departmentId || !subject) {
      return next(new ErrorResponse('Please provide all required fields', 400));
    }

    // Get department
    const department = await Department.findById(departmentId);
    if (!department) {
      return next(new ErrorResponse(`Department not found with id of ${departmentId}`, 404));
    }

    // Get the next serial number for the current year
    const userDate = new Date(issueDate);
    const yearOut = providedYear || userDate.getFullYear();
    const serialNumber = providedSerialNumber || await getNextSerialNumber(yearOut, 'outgoing');
    
    console.log('Generated serial number:', serialNumber, 'for year:', yearOut);

    // Define the final folder path
    const finalFolderPath = getDocumentPath('outgoing', yearOut);
    await createYearFolder(finalFolderPath);
    console.log('Final folder path:', finalFolderPath);

    // Handle document upload or use scanned document
    let finalDocumentPath = null;
    let ocrText = providedOcrText || null;
    let ocrStatus = ocrText ? 'completed' : null;
    let ocrError = null;
    const scanId = req.body.scanId ? String(req.body.scanId).trim() : '';
    
    if (req.file) {
      // Handle file upload
      const result = await handleUploadedFile(req.file, serialNumber, finalFolderPath, 'outgoing');
      finalDocumentPath = result.finalDocumentPath;
      ocrText = result.ocrText || ocrText;
      ocrStatus = ocrText ? 'completed' : null;
      console.log('Handled uploaded file, path:', finalDocumentPath);
    } else if (providedScannedDocumentPath) {
      // Handle scanned document
      console.log('Processing scanned document with path:', providedScannedDocumentPath);
      const result = await handleScannedDocument(
        req.user._id, 
        serialNumber, 
        finalFolderPath, 
        'outgoing', 
        providedScannedDocumentPath, 
        providedOcrText,
        { scanId }
      );
      finalDocumentPath = result.finalDocumentPath;
      ocrText = result.ocrText || ocrText;
      ocrStatus = result.ocrStatus || (ocrText ? 'completed' : null);
      ocrError = result.ocrError || null;
      console.log('Handled scanned document, path:', finalDocumentPath);
    }

    console.log('Final document path before saving:', finalDocumentPath);

    // Handle assignedTo and pourInfo arrays
    let assignedToArray = [];
    let pourInfoArray = [];

    if (assignedTo) {
      assignedToArray = Array.isArray(assignedTo) ? assignedTo : 
                       assignedTo.includes(',') ? assignedTo.split(',') : [assignedTo];
    }

    if (pourInfo) {
      pourInfoArray = Array.isArray(pourInfo) ? pourInfo : 
                      pourInfo.includes(',') ? pourInfo.split(',') : [pourInfo];
    }

    let initialSha256 = null;
    let initialFileSize = null;
    if (finalDocumentPath) {
      try {
        const absFilePath = path.resolve(__dirname, '../../..', finalDocumentPath);
        if (fs.existsSync(absFilePath) && fs.statSync(absFilePath).isFile()) {
          initialFileSize = fs.statSync(absFilePath).size;
          initialSha256 = computeFileSha256(absFilePath);
        }
      } catch (_) {}
    }

    const versionState = buildInitialVersionState(finalDocumentPath, {
      ocrText,
      ocrStatus,
      ocrError,
      sha256: initialSha256,
      fileSize: initialFileSize,
      uploadedBy: req.user._id,
    });

    // Create document data
    const documentData = {
      serialNumber,
      year: yearOut,
      issueDate,
      typeDocument,
      source: {
        id: department._id,
        name: department.name
      },
      assignedTo: assignedToArray,
      pourInfo: pourInfoArray,
      subject,
      scannedDocument: finalDocumentPath,
      currentVersion: versionState.currentVersion,
      versions: versionState.versions,
      ocrText,
      ocrStatus,
      ocrError,
      createdBy: req.user._id
    };

    // Handle reference if provided
    if (referenceId) {
      const incomingDocument = await IncomingDocument.findById(referenceId);
      
      if (!incomingDocument) {
        return next(new ErrorResponse(`Referenced incoming document not found`, 404));
      }
      
      documentData.reference = referenceId;
    }

    let document = await OutgoingDocument.create(documentData);

    // ASYNC OCR FIX: Link newly created document to active scanId so background OCR persists ocrText to DB when finished
    if (scanId) {
      const scannerService = require('../../../utils/scanner');
      const statusManager = scannerService.getStatusManager();
      const job = statusManager.getJob(scanId);
      if (job) {
        if (job.ocrStatus === 'completed' && !document.ocrText && job.ocrText) {
          document = await OutgoingDocument.findByIdAndUpdate(
            document._id,
            { ocrText: job.ocrText, ocrStatus: 'completed', ocrError: null },
            { new: true }
          );
        } else if (job.ocrInProgress || job.ocrStatus === 'processing') {
          statusManager.attachDocumentToJob(scanId, {
            targetDocumentId: document._id,
            targetDocumentType: 'outgoing',
          });
        }
      }
    }

    // Update the incoming document if reference was set
    if (referenceId) {
      await IncomingDocument.findByIdAndUpdate(
        referenceId,
        { answer: document._id }
      );
    }

    console.log(`Created outgoing document with ID: ${document._id}, file: ${finalDocumentPath}`);

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (err) {
    console.error('Error creating outgoing document:', err);
    // Handle duplicate serial number for the year
    if (err.code === 11000) {
      return next(
        new ErrorResponse('A document with this serial number already exists for this year', 400)
      );
    }
    next(err);
  }
};
