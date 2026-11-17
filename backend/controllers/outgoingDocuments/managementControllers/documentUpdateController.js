
const mongoose = require('mongoose');
const OutgoingDocument = require('../../../models/OutgoingDocument');
const IncomingDocument = require('../../../models/IncomingDocument');
const Department = require('../../../models/Department');
const ErrorResponse = require('../../../utils/errorResponse');
const { handleUploadedFile } = require('../../../utils/fileUploadHandler');
const { handleScannedDocument } = require('../../../utils/scannedDocumentHandler');
const { getDocumentPath, createYearFolder } = require('../../../utils/documentHelper');
const fs = require('fs');
const path = require('path');

function extractId(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed && trimmed !== 'null' && trimmed !== 'undefined' ? trimmed : null;
  }
  if (typeof value === 'object') {
    if (value._id) return value._id.toString();
    if (value.id) return String(value.id);
    if (typeof value.toString === 'function') {
      const str = value.toString();
      return str === '[object Object]' ? null : str;
    }
  }
  return String(value);
}

async function syncBidirectionalReference(outgoingId, previousReferenceId, newReferenceId) {
  const prevId = extractId(previousReferenceId);
  const nextId = extractId(newReferenceId);
  const outIdStr = extractId(outgoingId);

  if (prevId && prevId !== nextId) {
    await IncomingDocument.updateOne(
      { _id: prevId, answer: outIdStr },
      { $set: { answer: null } }
    );
  }

  if (nextId) {
    if (prevId !== nextId) {
      await OutgoingDocument.updateMany(
        { _id: { $ne: outIdStr }, reference: nextId },
        { $set: { reference: null } }
      );
    }
    await IncomingDocument.findByIdAndUpdate(
      nextId,
      { $set: { answer: outIdStr } }
    );
  }
}

// @desc    Update outgoing document
// @route   PUT /api/outgoing-documents/:id
// @access  Private/Admin/AdminTuningDesk/AdminDepartment
exports.updateOutgoingDocument = async (req, res, next) => {
  try {
    let document = await OutgoingDocument.findById(req.params.id);

    if (!document || document.isDeleted) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }

    // Lire l'ancienne référence AVANT la mise à jour et AVANT tout populate
    const previousReferenceId = extractId(document.reference);

    // Check if AdminDepartment has access to this document
    if (req.user.role === 'AdminDepartment') {
      const userDepartmentId = extractId(req.user.activeDepartment);
      if (!userDepartmentId) {
        return next(new ErrorResponse('No active department selected', 403));
      }

      const sourceDepartmentId = document.source ? extractId(document.source.id) : null;
      if (!sourceDepartmentId || sourceDepartmentId !== userDepartmentId) {
        return next(
          new ErrorResponse(`Not authorized to update this document`, 403)
        );
      }

      // AdminDepartment can only update the reference field
      const { referenceId } = req.body;

      if (referenceId === undefined) {
        return next(
          new ErrorResponse(`AdminDepartment can only update the reference field`, 400)
        );
      }

      const normalizedReferenceId = extractId(referenceId);
      let reference = null;

      if (normalizedReferenceId) {
        if (!mongoose.Types.ObjectId.isValid(normalizedReferenceId)) {
          return next(
            new ErrorResponse(`Invalid referenced incoming document ID`, 400)
          );
        }

        const incomingDocument = await IncomingDocument.findById(normalizedReferenceId);

        if (!incomingDocument || incomingDocument.isDeleted) {
          return next(
            new ErrorResponse(`Referenced incoming document not found`, 404)
          );
        }

        // Check if the incoming document is assigned to this department
        const isAssigned = Array.isArray(incomingDocument.assignedTo) && incomingDocument.assignedTo.some(
          dept => {
            const deptId = extractId(dept.id !== undefined ? dept.id : dept);
            return deptId === userDepartmentId;
          }
        );

        if (!isAssigned) {
          return next(
            new ErrorResponse(`Incoming document is not assigned to your department`, 403)
          );
        }

        reference = normalizedReferenceId;
      }

      // Update only the reference field
      document = await OutgoingDocument.findByIdAndUpdate(
        req.params.id,
        { reference },
        { new: true, runValidators: true }
      ).populate('folder')
        .populate('reference')
        .populate('createdBy', 'username');

      // Synchroniser les références bidirectionnelles en comparant les ObjectIds sous forme de string
      await syncBidirectionalReference(document._id, previousReferenceId, reference);

      res.status(200).json({
        success: true,
        data: document
      });
      return;
    }

    // Only AdminTuningDesk and Admin can fully update documents
    if (req.user.role !== 'AdminTuningDesk' && req.user.role !== 'Admin') {
      return next(
        new ErrorResponse(`Not authorized to update this document`, 403)
      );
    }

    // For Admin and AdminTuningDesk, allow full update
    const {
      serialNumber,
      year,
      issueDate,
      typeDocument,
      departmentId,
      assignedTo,
      pourInfo,
      subject,
      referenceId,
      scannedDocumentPath,
      ocrText
    } = req.body;

    // Create update object
    const updateData = {};

    // Add fields if they exist
    if (serialNumber) updateData.serialNumber = serialNumber;
    if (year) updateData.year = year;
    if (issueDate) updateData.issueDate = issueDate;
    if (typeDocument !== undefined) updateData.typeDocument = typeDocument;
    if (subject) updateData.subject = subject;

    // Update department if provided
    if (departmentId) {
      const department = await Department.findById(departmentId);

      if (!department) {
        return next(
          new ErrorResponse(`Department not found with id of ${departmentId}`, 404)
        );
      }

      updateData.source = {
        id: department._id,
        name: department.name
      };
    }

    // Update assignedTo and pourInfo if provided
    if (assignedTo) {
      const assignedToArray = Array.isArray(assignedTo) ? assignedTo :
        assignedTo.includes(',') ? assignedTo.split(',') : [assignedTo];
      updateData.assignedTo = assignedToArray;
    }

    if (pourInfo) {
      const pourInfoArray = Array.isArray(pourInfo) ? pourInfo :
        pourInfo.includes(',') ? pourInfo.split(',') : [pourInfo];
      updateData.pourInfo = pourInfoArray;
    }

    // Update reference if provided
    let normalizedReferenceId = null;
    if (referenceId !== undefined) {
      normalizedReferenceId = extractId(referenceId);
      if (normalizedReferenceId) {
        if (!mongoose.Types.ObjectId.isValid(normalizedReferenceId)) {
          return next(
            new ErrorResponse(`Invalid referenced incoming document ID`, 400)
          );
        }

        const incomingDocument = await IncomingDocument.findById(normalizedReferenceId);

        if (!incomingDocument || incomingDocument.isDeleted) {
          return next(
            new ErrorResponse(`Referenced incoming document not found`, 404)
          );
        }

        updateData.reference = normalizedReferenceId;
      } else {
        updateData.reference = null;
      }
    }

    // Handle document updates (upload or scan)
    if (req.file || scannedDocumentPath) {
      // Delete old file if exists
      if (document.scannedDocument) {
        const oldFilePath = path.join(__dirname, '../../..', document.scannedDocument);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log(`Deleted old file: ${oldFilePath}`);
          } catch (deleteErr) {
            console.warn('Could not delete old file:', deleteErr);
          }
        }
      }

      // Get year and serial number from document or updated data
      const docYear = updateData.year || document.year;
      const docSerialNumber = updateData.serialNumber || document.serialNumber;

      // Define the final folder path
      const finalFolderPath = getDocumentPath('outgoing', docYear);
      await createYearFolder(finalFolderPath);

      let documentPath = null;
      let docOcrText = null;
      let docOcrStatus = null;
      let docOcrError = null;
      const scanId = req.body.scanId ? String(req.body.scanId).trim() : '';

      if (req.file) {
        // Handle file upload
        const result = await handleUploadedFile(req.file, docSerialNumber, finalFolderPath, 'outgoing');
        documentPath = result.finalDocumentPath;
        docOcrText = result.ocrText;
        docOcrStatus = docOcrText ? 'completed' : null;
      } else if (scannedDocumentPath) {
        // Handle scanned document
        const result = await handleScannedDocument(
          req.user._id,
          docSerialNumber,
          finalFolderPath,
          'outgoing',
          scannedDocumentPath,
          ocrText,
          { scanId }
        );
        documentPath = result.finalDocumentPath;
        docOcrText = result.ocrText || ocrText;
        docOcrStatus = result.ocrStatus || (docOcrText ? 'completed' : null);
        docOcrError = result.ocrError || null;
      }

      if (documentPath) {
        updateData.scannedDocument = documentPath;
        if (docOcrText) {
          updateData.ocrText = docOcrText;
        }
        if (docOcrStatus) {
          updateData.ocrStatus = docOcrStatus;
          updateData.ocrError = docOcrError;
        }
      }
    }

    // Update the document
    document = await OutgoingDocument.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('folder')
      .populate('reference')
      .populate('createdBy', 'username');

    // ASYNC OCR FIX: Link updated document to background OCR job if still running
    const updateScanId = req.body.scanId ? String(req.body.scanId).trim() : '';
    if (updateScanId) {
      const scannerService = require('../../../utils/scanner');
      const statusManager = scannerService.getStatusManager();
      const job = statusManager.getJob(updateScanId);
      if (job) {
        if (job.ocrStatus === 'completed' && !updateData.ocrText && job.ocrText) {
          document = await OutgoingDocument.findByIdAndUpdate(
            document._id,
            { ocrText: job.ocrText, ocrStatus: 'completed', ocrError: null },
            { new: true }
          ).populate('folder')
            .populate('reference')
            .populate('createdBy', 'username');
        } else if (job.ocrInProgress || job.ocrStatus === 'processing') {
          statusManager.attachDocumentToJob(updateScanId, {
            targetDocumentId: document._id,
            targetDocumentType: 'outgoing',
          });
        }
      }
    }

    // Update the incoming document references if referenceId was provided
    if (referenceId !== undefined) {
      await syncBidirectionalReference(document._id, previousReferenceId, normalizedReferenceId);
    }

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    // Handle duplicate serial number for the year
    if (err.code === 11000) {
      return next(
        new ErrorResponse('A document with this serial number already exists for this year', 400)
      );
    }
    next(err);
  }
};
