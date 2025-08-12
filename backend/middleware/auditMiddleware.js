
const { logAuditAction } = require('../utils/auditLogger');

// Middleware to automatically log document activities
const auditDocumentActivity = (action) => {
  return async (req, res, next) => {
    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture successful operations
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logDocumentActivity(req, action, data);
      }
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logDocumentActivity(req, action, data);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Log the actual document activity
const logDocumentActivity = async (req, action, responseData) => {
  try {
    if (!req.user) return;

    // Extract entity ID with proper fallbacks and validation
    let entityId = req.params.id || 
                   req.body._id || 
                   req.body.id || 
                   responseData?.data?._id || 
                   responseData?.data?.id ||
                   responseData?._id ||
                   responseData?.id;

    // Convert ObjectId to string if needed
    if (entityId && typeof entityId === 'object' && entityId.toString) {
      entityId = entityId.toString();
    }

    // Skip audit logging if no entity ID can be determined
    if (!entityId) {
      console.log(`Skipping audit log for action ${action}: No entity ID available`);
      return;
    }

    let entityType = 'document';
    let details = {};

    // Determine entity type and details based on the route
    if (req.route?.path?.includes('folder') || req.originalUrl?.includes('folder')) {
      entityType = 'folder';
      details = {
        folderName: req.body.name || responseData?.data?.name || responseData?.name,
        parentId: req.body.parent || responseData?.data?.parent || responseData?.parent
      };
    } else if (req.route?.path?.includes('user') || req.originalUrl?.includes('user')) {
      entityType = 'user';
      details = {
        username: req.body.username || responseData?.data?.username || responseData?.username,
        role: req.body.role || responseData?.data?.role || responseData?.role
      };
    } else {
      // Document activities
      details = {
        documentType: req.body.documentType || responseData?.data?.typeDocument || responseData?.typeDocument,
        serialNumber: req.body.serialNumber || responseData?.data?.serialNumber || responseData?.serialNumber,
        subject: req.body.subject || responseData?.data?.subject || responseData?.subject,
        year: req.body.year || responseData?.data?.year || responseData?.year
      };
    }

    // For folder assignment operations
    if (action === 'document_moved_to_folder' || action === 'document_removed_from_folder') {
      details.folderId = req.body.folderId;
      details.folderName = req.body.folderName;
    }

    // Ensure user ID is properly formatted
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.log(`Skipping audit log for action ${action}: No user ID available`);
      return;
    }

    await logAuditAction(
      action,
      entityType,
      entityId,
      userId.toString(),
      {
        username: req.user.username || 'Unknown',
        role: req.user.role || 'Unknown'
      },
      details,
      req.ip || req.connection?.remoteAddress || 'unknown'
    );
  } catch (error) {
    console.error('Audit logging error in middleware:', error);
    // Don't break the main functionality
  }
};

// Middleware specifically for login activities
const auditLoginActivity = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (res.statusCode === 200 && data.success && data.token && data.data?.id) {
      // Log successful login with proper entity ID
      logAuditAction(
        'user_login',
        'user',
        data.data.id.toString(),
        data.data.id.toString(),
        {
          username: data.data.username || 'Unknown',
          role: data.data.role || 'Unknown'
        },
        {
          loginTime: new Date(),
          userAgent: req.get('user-agent') || 'Unknown'
        },
        req.ip || req.connection?.remoteAddress || 'unknown'
      ).catch(err => console.error('Login audit logging error:', err));
    }
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = { 
  auditDocumentActivity,
  auditLoginActivity
};
