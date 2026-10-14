const path = require('path');
const fs = require('fs');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');

/**
 * Serves a protected document file with RBAC validation and Path Traversal protection
 * Route: GET /api/files/:type/:id/:filename
 * Access: Private (Authenticated users with appropriate role/department)
 */
exports.serveProtectedFile = async (req, res) => {
  try {
    const { type, id, filename } = req.params;

    if (!type || !id || !filename) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }

    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;
    const doc = await Model.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    // Vérification RBAC
    const userRole = req.user?.role;
    const isAdmin = ['Admin', 'Director', 'AdminTuningDesk'].includes(userRole);

    if (!isAdmin) {
      const userDepts = req.user?.departments?.map((d) => (d._id || d).toString()) || [];
      const docDepts = (doc.assignedTo || []).map((d) => (d.departmentId?._id || d.departmentId || d.id || d).toString());
      if (doc.departmentId) {
        docDepts.push((doc.departmentId._id || doc.departmentId).toString());
      }
      
      const hasAccess = docDepts.length === 0 || docDepts.some((d) => userDepts.includes(d));
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }
    }

    const safeFilename = path.basename(filename);
    const ROOT = path.resolve(process.env.DOCUMENT_PATH || path.join(process.cwd(), 'courrier'));

    // Check multiple potential locations safely
    const possiblePaths = [
      path.resolve(ROOT, safeFilename),
      doc.year ? path.resolve(ROOT, String(doc.year), safeFilename) : null,
      doc.year ? path.resolve(ROOT, String(doc.year), type === 'incoming' ? 'Incoming-Doc' : 'Outgoing-Doc', safeFilename) : null,
      path.resolve(process.cwd(), 'backend', 'uploads', safeFilename),
      path.resolve(process.cwd(), 'uploads', safeFilename),
      doc.scannedDocument ? path.resolve(process.cwd(), doc.scannedDocument) : null,
    ].filter(Boolean);

    let targetFile = possiblePaths.find((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
      } catch (_) {
        return false;
      }
    });

    if (!targetFile) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable' });
    }

    res.sendFile(targetFile);
  } catch (err) {
    console.error('[FileController] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Middleware de protection pour les accès directs aux fichiers de courrier
 * Route: /courrier/*
 * Vérifie que l'utilisateur est authentifié et empêche le Path Traversal
 */
exports.serveCourrierStatic = (req, res, next) => {
  const ROOT = path.resolve(process.env.DOCUMENT_PATH || path.join(process.cwd(), 'courrier'));
  const safePath = path.resolve(ROOT, '.' + req.path);

  if (!safePath.startsWith(ROOT + path.sep) && safePath !== ROOT) {
    return res.status(400).json({ success: false, message: 'Invalid path' });
  }

  if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
    return res.status(404).json({ success: false, message: 'Fichier introuvable' });
  }

  res.sendFile(safePath);
};
