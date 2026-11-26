
const IncomingDocument = require('../../../models/IncomingDocument');
const Department = require('../../../models/Department');
const ErrorResponse = require('../../../utils/errorResponse');
const { handleUploadedFile } = require('../../../utils/fileUploadHandler');
const { handleScannedDocument } = require('../../../utils/scannedDocumentHandler');
const { getDocumentPath, createYearFolder } = require('../../../utils/documentHelper');
const { createActivityNotifications, updateActivityNotifications } = require('../../../utils/activityNotificationHelper');
const { isSameDocumentPath, prepareNextVersionState, appendNewVersion } = require('../../../utils/documentVersionHelper');
const { computeFileSha256 } = require('../../../utils/fileSecurity');
const fs = require('fs');
const path = require('path');

// @desc    Update incoming document
// @route   PUT /api/incoming-documents/:id
// @access  Private/Admin/AdminTuningDesk
exports.updateIncomingDocument = async (req, res, next) => {
  try {
    // Check if document exists
    let document = await IncomingDocument.findById(req.params.id);
    
    if (!document) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Only AdminTuningDesk and Admin can update documents (AdminDepartment is handled separately for specific fields)
    if (req.user.role !== 'AdminTuningDesk' && req.user.role !== 'Admin') {
      return next(
        new ErrorResponse(`Not authorized to update this document`, 403)
      );
    }
    
    // Prepare update data
    const updateData = {};
    
    // Add fields to update data if they exist in request body
    const fields = [
      'serialNumber', 'year', 'arrivalDate', 'correspondenceNumber', 
      'correspondenceDate', 'typeDocument', 'activity', 'dateActivity', 'source', 'subject'
    ];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'dateActivity') {
          // Handle dateActivity - only set if activity is also provided
          if (req.body.activity && req.body[field]) {
            updateData[field] = new Date(req.body[field]);
          } else if (!req.body.activity) {
            updateData[field] = null;
          }
        } else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    // Handle department assignment with proper ObjectId extraction
    if (req.body.departmentIds) {
      // Parse department IDs - handle various formats
      let ids;
      if (Array.isArray(req.body.departmentIds)) {
        ids = req.body.departmentIds;
      } else if (typeof req.body.departmentIds === 'string') {
        ids = req.body.departmentIds.includes(',') ? 
              req.body.departmentIds.split(',').map(id => id.trim()) : 
              [req.body.departmentIds];
      } else {
        ids = [req.body.departmentIds];
      }
      
      // Ensure we have proper ObjectId strings - fix the casting issue
      const cleanIds = ids.map(id => {
        // Handle object format like {_id: "string"} or {id: "string"}
        if (typeof id === 'object' && id !== null) {
          if (id._id) return id._id.toString();
          if (id.id) return id.id.toString();
          // If it's an object but doesn't have _id or id, convert to string
          return JSON.stringify(id);
        }
        // Handle string format
        return id.toString().trim();
      }).filter(id => {
        // Filter out invalid ObjectIds (must be 24 character hex string)
        return id && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id);
      });
      
      console.log('Clean department IDs:', cleanIds);
      
      if (cleanIds.length === 0) {
        return next(
          new ErrorResponse('No valid department IDs provided', 400)
        );
      }
      
      // Get department details
      const departments = await Department.find({ _id: { $in: cleanIds } });
      
      if (departments.length === 0) {
        return next(
          new ErrorResponse('No valid departments found with the provided IDs', 404)
        );
      }
      
      updateData.assignedTo = departments.map(dept => ({
        id: dept._id,
        name: dept.name
      }));
    }
    
    // Handle document updates (upload or scan) with immutable versioning
    const hasNewScannedPath = Boolean(
      req.body.scannedDocumentPath &&
      req.body.scannedDocumentPath.trim() !== '' &&
      !isSameDocumentPath(req.body.scannedDocumentPath, document.scannedDocument)
    );

    if (req.file || hasNewScannedPath) {
      // Get year and serial number from document or updated data
      const year = updateData.year || document.year;
      const serialNumber = updateData.serialNumber || document.serialNumber;
      const { seededVersions, nextVersion } = prepareNextVersionState(document);

      // Define the final folder path
      const finalFolderPath = getDocumentPath('incoming', year);
      await createYearFolder(finalFolderPath);

      let documentPath = null;
      let ocrText = null;
      let ocrStatus = null;
      let ocrError = null;
      const scanId = req.body.scanId ? String(req.body.scanId).trim() : '';

      if (req.file) {
        // Handle file upload with next version suffix
        const result = await handleUploadedFile(req.file, serialNumber, finalFolderPath, 'incoming', { version: nextVersion });
        documentPath = result.finalDocumentPath;
        ocrText = result.ocrText;
        ocrStatus = ocrText ? 'completed' : null;
      } else if (hasNewScannedPath) {
        // Handle scanned document with next version suffix
        const result = await handleScannedDocument(
          req.user._id,
          serialNumber,
          finalFolderPath,
          'incoming',
          req.body.scannedDocumentPath,
          req.body.ocrText,
          { scanId, version: nextVersion }
        );
        documentPath = result.finalDocumentPath;
        ocrText = result.ocrText || req.body.ocrText;
        ocrStatus = result.ocrStatus || (ocrText ? 'completed' : null);
        ocrError = result.ocrError || null;
      }

      if (documentPath) {
        let sha256 = null;
        let fileSize = null;
        try {
          const absFilePath = path.resolve(__dirname, '../../..', documentPath);
          if (fs.existsSync(absFilePath) && fs.statSync(absFilePath).isFile()) {
            fileSize = fs.statSync(absFilePath).size;
            sha256 = computeFileSha256(absFilePath);
          }
        } catch (_) {}

        const versionState = appendNewVersion(seededVersions, nextVersion, documentPath, {
          ocrText,
          ocrStatus,
          ocrError,
          sha256,
          fileSize,
          uploadedBy: req.user._id,
        });

        updateData.scannedDocument = documentPath;
        updateData.currentVersion = versionState.currentVersion;
        updateData.versions = versionState.versions;
        if (ocrText) {
          updateData.ocrText = ocrText;
        }
        if (ocrStatus) {
          updateData.ocrStatus = ocrStatus;
          updateData.ocrError = ocrError;
        }
      }
    }
    
    // Update the document
    document = await IncomingDocument.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo.id')
      .populate('responsibleUser', 'username photo')
      .populate('answer')
      .populate('folder');

    // ASYNC OCR FIX: Link updated document to background OCR job if still running
    const updateScanId = req.body.scanId ? String(req.body.scanId).trim() : '';
    if (updateScanId) {
      const scannerService = require('../../../utils/scanner');
      const statusManager = scannerService.getStatusManager();
      const job = statusManager.getJob(updateScanId);
      if (job) {
        if (job.ocrStatus === 'completed' && !updateData.ocrText && job.ocrText) {
          document = await IncomingDocument.findByIdAndUpdate(
            document._id,
            { ocrText: job.ocrText, ocrStatus: 'completed', ocrError: null },
            { new: true }
          ).populate('assignedTo.id')
            .populate('responsibleUser', 'username photo')
            .populate('answer')
            .populate('folder');
        } else if (job.ocrInProgress || job.ocrStatus === 'processing') {
          statusManager.attachDocumentToJob(updateScanId, {
            targetDocumentId: document._id,
            targetDocumentType: 'incoming',
          });
        }
      }
    }
    
    // Handle activity notifications update
    if (updateData.activity !== undefined || updateData.dateActivity !== undefined) {
      try {
        const finalActivity = updateData.activity !== undefined ? updateData.activity : document.activity;
        const finalDateActivity = updateData.dateActivity !== undefined ? updateData.dateActivity : document.dateActivity;
        const finalAssignedTo = updateData.assignedTo || document.assignedTo;
        
        await updateActivityNotifications(document._id, finalActivity, finalDateActivity, finalAssignedTo);
      } catch (notificationError) {
        console.error('Error updating activity notifications:', notificationError);
        // Don't fail the document update if notifications fail
      }
    }
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    console.error('Error in updateIncomingDocument:', err);
    // Handle duplicate serial number for the year
    if (err.code === 11000) {
      return next(
        new ErrorResponse('A document with this serial number already exists for this year', 400)
      );
    }
    next(err);
  }
};
