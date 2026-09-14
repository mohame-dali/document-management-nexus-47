
const OutgoingDocument = require('../../../models/OutgoingDocument');
const IncomingDocument = require('../../../models/IncomingDocument');
const Department = require('../../../models/Department');
const ErrorResponse = require('../../../utils/errorResponse');
const { handleUploadedFile } = require('../../../utils/fileUploadHandler');
const { handleScannedDocument } = require('../../../utils/scannedDocumentHandler');
const { getDocumentPath, createYearFolder } = require('../../../utils/documentHelper');
const fs = require('fs');
const path = require('path');

// @desc    Update outgoing document
// @route   PUT /api/outgoing-documents/:id
// @access  Private/Admin/AdminTuningDesk/AdminDepartment
exports.updateOutgoingDocument = async (req, res, next) => {
  try {
    let document = await OutgoingDocument.findById(req.params.id);
    
    if (!document) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if AdminDepartment has access to this document
    if (req.user.role === 'AdminDepartment') {
      // Extract department ID properly - handle both string and object cases
      const sourceDepartmentId = typeof document.source.id === 'object' && document.source.id._id 
        ? document.source.id._id.toString() 
        : document.source.id.toString();
      
      const userDepartmentId = typeof req.user.activeDepartment === 'object' && req.user.activeDepartment._id
        ? req.user.activeDepartment._id.toString()
        : req.user.activeDepartment.toString();
      
      if (sourceDepartmentId !== userDepartmentId) {
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
      
      // Check if reference exists
      let reference = null;
      if (referenceId) {
        const incomingDocument = await IncomingDocument.findById(referenceId);
        
        if (!incomingDocument) {
          return next(
            new ErrorResponse(`Referenced incoming document not found`, 404)
          );
        }
        
        // Check if the incoming document is assigned to this department
        const isAssigned = incomingDocument.assignedTo.some(
          dept => {
            const deptId = typeof dept.id === 'object' && dept.id._id 
              ? dept.id._id.toString() 
              : dept.id.toString();
            return deptId === userDepartmentId;
          }
        );
        
        if (!isAssigned) {
          return next(
            new ErrorResponse(`Incoming document is not assigned to your department`, 403)
          );
        }
        
        reference = referenceId;
      }
      
      // Update only the reference field
      document = await OutgoingDocument.findByIdAndUpdate(
        req.params.id,
        { reference },
        { new: true, runValidators: true }
      ).populate('folder')
        .populate('reference')
        .populate('createdBy', 'username');
      
      // Update the incoming document if reference changed
      if (document.reference && document.reference.toString() !== reference) {
        await IncomingDocument.findByIdAndUpdate(
          document.reference,
          { answer: null }
        );
      }
      
      if (reference) {
        await IncomingDocument.findByIdAndUpdate(
          reference,
          { answer: document._id }
        );
      }
      
      res.status(200).json({
        success: true,
        data: document
      });
      return;
    }
    
    // Only SuperAdmin, AdminTuningDesk and Admin can fully update documents
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'AdminTuningDesk' && req.user.role !== 'Admin') {
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
    if (referenceId !== undefined) {
      if (referenceId) {
        const incomingDocument = await IncomingDocument.findById(referenceId);
        
        if (!incomingDocument) {
          return next(
            new ErrorResponse(`Referenced incoming document not found`, 404)
          );
        }
        
        updateData.reference = referenceId;
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
      
      if (req.file) {
        // Handle file upload
        const result = await handleUploadedFile(req.file, docSerialNumber, finalFolderPath, 'outgoing');
        documentPath = result.finalDocumentPath;
        docOcrText = result.ocrText;
      } else if (scannedDocumentPath) {
        // Handle scanned document
        const result = await handleScannedDocument(
          req.user._id, 
          docSerialNumber, 
          finalFolderPath, 
          'outgoing', 
          scannedDocumentPath, 
          ocrText
        );
        documentPath = result.finalDocumentPath;
        docOcrText = result.ocrText || ocrText;
      }
      
      if (documentPath) {
        updateData.scannedDocument = documentPath;
        if (docOcrText) {
          updateData.ocrText = docOcrText;
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
    
    // Update the incoming document references if needed
    if (referenceId !== undefined) {
      // If previous reference exists and changed, remove this document from the incoming document
      if (document.reference && 
          (referenceId === null || document.reference.toString() !== referenceId)) {
        await IncomingDocument.findByIdAndUpdate(
          document.reference,
          { answer: null }
        );
      }
      
      // If new reference is set, update the incoming document
      if (referenceId) {
        await IncomingDocument.findByIdAndUpdate(
          referenceId,
          { answer: document._id }
        );
      }
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
