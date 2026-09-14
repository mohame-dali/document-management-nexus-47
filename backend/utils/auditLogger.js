
const AuditLog = require('../models/AuditLog');

const logAuditAction = async (action, entityType, entityId, userId, userDetails, details = {}, ipAddress = null) => {
  try {
    // Validate required fields before attempting to create the audit log
    if (!action) {
      console.log('Skipping audit log: action is required');
      return;
    }
    
    if (!entityType) {
      console.log('Skipping audit log: entityType is required');
      return;
    }
    
    if (!entityId) {
      console.log('Skipping audit log: entityId is required');
      return;
    }
    
    if (!userId) {
      console.log('Skipping audit log: userId is required');
      return;
    }

    // Ensure entityId and userId are strings
    const sanitizedEntityId = entityId.toString();
    const sanitizedUserId = userId.toString();

    // Ensure userDetails has required structure
    const sanitizedUserDetails = {
      username: userDetails?.username || 'Unknown',
      role: userDetails?.role || 'Unknown'
    };

    await AuditLog.create({
      action,
      entityType,
      entityId: sanitizedEntityId,
      userId: sanitizedUserId,
      userDetails: sanitizedUserDetails,
      details: details || {},
      ipAddress: ipAddress || 'unknown'
    });

    console.log(`Audit log created successfully: ${action} for ${entityType} ${sanitizedEntityId}`);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

module.exports = { logAuditAction };
