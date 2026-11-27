
const AuditLog = require('../models/AuditLog');

const DOCUMENT_VIEW_COOLDOWN_MS = 10 * 60 * 1000;

const findRecentDocumentView = async ({ action, entityType, entityId, userId }) => {
  if (action !== 'document_view' || !entityId || entityId === 'none' || !userId) {
    return null;
  }
  if (typeof AuditLog.findOne !== 'function') {
    return null;
  }

  try {
    const cutoff = new Date(Date.now() - DOCUMENT_VIEW_COOLDOWN_MS);
    const query = AuditLog.findOne({
      action: 'document_view',
      entityType: entityType || 'document',
      entityId: entityId.toString(),
      userId,
      createdAt: { $gte: cutoff }
    });
    if (query && typeof query.sort === 'function') {
      return await query.sort({ createdAt: -1 });
    }
    return await query;
  } catch {
    return null;
  }
};

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

    // 10-minute deduplication cooldown for repeated document_view entries
    if (action === 'document_view') {
      const recentView = await findRecentDocumentView({
        action,
        entityType,
        entityId: sanitizedEntityId,
        userId: sanitizedUserId
      });
      if (recentView) {
        return recentView;
      }
    }

    // Ensure userDetails has required structure
    const sanitizedUserDetails = {
      username: userDetails?.username || 'Unknown',
      role: userDetails?.role || 'Unknown'
    };

    const created = await AuditLog.create({
      action,
      entityType,
      entityId: sanitizedEntityId,
      userId: sanitizedUserId,
      userDetails: sanitizedUserDetails,
      details: details || {},
      ipAddress: ipAddress || 'unknown'
    });

    console.log(`Audit log created successfully: ${action} for ${entityType} ${sanitizedEntityId}`);
    return created;
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

module.exports = { logAuditAction, findRecentDocumentView };
