
const { logAuditAction } = require('../utils/auditLogger');

// Middleware to automatically log document activities
const auditDocumentActivity = (action) => {
  return async (req, res, next) => {
    try {
      // Store original response methods
      const originalSend = res.send;
      const originalJson = res.json;

      // Override response methods to capture successful operations
      res.send = function(data) {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            logDocumentActivity(req, action, data).catch(err => {
              console.error('[Audit Middleware] Erreur silencieuse ignorée:', err?.message || err);
            });
          }
        } catch (err) {
          console.error('[Audit Middleware] Erreur silencieuse ignorée:', err?.message || err);
        }
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            logDocumentActivity(req, action, data).catch(err => {
              console.error('[Audit Middleware] Erreur silencieuse ignorée:', err?.message || err);
            });
          }
        } catch (err) {
          console.error('[Audit Middleware] Erreur silencieuse ignorée:', err?.message || err);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('[Audit Middleware] Erreur silencieuse ignorée:', error.message);
      next();
    }
  };
};

// Log the actual document activity
const logDocumentActivity = async (req, action, responseData) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return; // Si pas d'utilisateur authentifié, on ignore le log proprement
    }

    // Parse responseData if it's a JSON string
    let parsedData = responseData;
    if (typeof responseData === 'string') {
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = null;
      }
    }

    // Extract entity ID with proper fallbacks and safe optional chaining
    let entityId = req.params?.id || 
                   req.body?._id || 
                   req.body?.id || 
                   parsedData?.data?._id || 
                   parsedData?.data?.id ||
                   parsedData?._id ||
                   parsedData?.id;

    // Convert ObjectId to string if needed
    if (entityId && typeof entityId === 'object' && entityId.toString) {
      entityId = entityId.toString();
    }

    // Si pas d'ID d'entité unique (ex: consultation de liste getIncomingDocuments), on ignore proprement
    if (!entityId) {
      return;
    }

    let entityType = 'document';
    let details = {};

    // Determine entity type and details based on the route
    if (req.route?.path?.includes('folder') || req.originalUrl?.includes('folder')) {
      entityType = 'folder';
      details = {
        folderName: req.body?.name || parsedData?.data?.name || parsedData?.name,
        parentId: req.body?.parent || parsedData?.data?.parent || parsedData?.parent
      };
    } else if (req.route?.path?.includes('user') || req.originalUrl?.includes('user')) {
      entityType = 'user';
      details = {
        username: req.body?.username || parsedData?.data?.username || parsedData?.username,
        role: req.body?.role || parsedData?.data?.role || parsedData?.role
      };
    } else {
      // Document activities
      details = {
        documentType: req.body?.documentType || parsedData?.data?.typeDocument || parsedData?.typeDocument,
        serialNumber: req.body?.serialNumber || parsedData?.data?.serialNumber || parsedData?.serialNumber,
        subject: req.body?.subject || parsedData?.data?.subject || parsedData?.subject,
        year: req.body?.year || parsedData?.data?.year || parsedData?.year
      };
    }

    // For folder assignment operations
    if (action === 'document_moved_to_folder' || action === 'document_removed_from_folder') {
      details.folderId = req.body?.folderId;
      details.folderName = req.body?.folderName;
    }

    await logAuditAction(
      action,
      entityType,
      entityId,
      userId.toString(),
      {
        username: req.user?.username || 'Unknown',
        role: req.user?.role || 'Unknown'
      },
      details,
      req.ip || req.connection?.remoteAddress || 'unknown'
    );
  } catch (error) {
    console.error('[Audit Middleware] Erreur silencieuse ignorée:', error.message);
    // On ne fait rien, on ne bloque JAMAIS la requête
  }
};

// Middleware specifically for login activities
const auditLoginActivity = async (req, res, next) => {
  try {
    const originalJson = res.json;
    
    res.json = function(data) {
      try {
        if (res.statusCode === 200 && data?.success && data?.token && data?.data?.id) {
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
              userAgent: req.get?.('user-agent') || 'Unknown'
            },
            req.ip || req.connection?.remoteAddress || 'unknown'
          ).catch(err => console.error('[Audit Middleware] Erreur silencieuse login:', err?.message || err));
        }
      } catch (err) {
        console.error('[Audit Middleware] Erreur silencieuse login:', err?.message || err);
      }
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('[Audit Middleware] Erreur silencieuse ignorée:', error.message);
    next();
  }
};

module.exports = { 
  auditDocumentActivity,
  auditLoginActivity
};
