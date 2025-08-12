
const Department = require('../models/Department');
const IncomingDocument = require('../models/IncomingDocument');
const ErrorResponse = require('./errorResponse');

/**
 * Validate incoming document fields
 */
exports.validateIncomingDocumentFields = (data) => {
  const { arrivalDate, correspondenceNumber, correspondenceDate, subject } = data;
  
  if (!arrivalDate || !correspondenceNumber || !correspondenceDate || !subject) {
    throw new ErrorResponse('Please provide all required fields', 400);
  }
};

/**
 * Validate outgoing document fields
 */
exports.validateOutgoingDocumentFields = async (data) => {
  const { issueDate, departmentId, subject } = data;
  
  if (!issueDate || !departmentId || !subject) {
    throw new ErrorResponse('Please provide all required fields', 400);
  }
  
  // Validate department
  const department = await Department.findById(departmentId);
  
  if (!department) {
    throw new ErrorResponse(`Department not found with id of ${departmentId}`, 404);
  }
  
  return department;
};

/**
 * Process department assignments for incoming documents
 */
exports.processDepartmentAssignments = async (departmentIds) => {
  let assignedTo = [];
  
  if (departmentIds) {
    // Handle various input formats (array, comma-separated string)
    const ids = Array.isArray(departmentIds) ? departmentIds : 
               departmentIds.includes(',') ? departmentIds.split(',') : [departmentIds];
    
    // Get department details
    const departments = await Department.find({ _id: { $in: ids } });
    
    if (departments.length === 0) {
      throw new ErrorResponse('No valid departments found with the provided IDs', 404);
    }
    
    assignedTo = departments.map(dept => ({
      id: dept._id,
      name: dept.name
    }));
  }
  
  return assignedTo;
};

/**
 * Validate and process reference document
 */
exports.processReferenceDocument = async (referenceId) => {
  if (!referenceId) {
    return null;
  }
  
  const incomingDocument = await IncomingDocument.findById(referenceId);
  
  if (!incomingDocument) {
    throw new ErrorResponse('Referenced incoming document not found', 404);
  }
  
  return referenceId;
};

/**
 * Parse array fields from request
 */
exports.parseArrayFields = (assignedTo, pourInfo) => {
  const assignedToArray = assignedTo ? 
    (Array.isArray(assignedTo) ? assignedTo : 
     assignedTo.includes(',') ? assignedTo.split(',') : [assignedTo]) : [];
  
  const pourInfoArray = pourInfo ? 
    (Array.isArray(pourInfo) ? pourInfo : 
     pourInfo.includes(',') ? pourInfo.split(',') : [pourInfo]) : [];
  
  return { assignedToArray, pourInfoArray };
};
