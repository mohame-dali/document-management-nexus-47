const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');

const GLOBAL_FILE_ROLES = ['Admin', 'Director', 'AdminTuningDesk'];

function extractId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val._id) return val._id.toString();
  if (val.id) return typeof val.id === 'string' ? val.id : (val.id._id ? val.id._id.toString() : val.id.toString());
  return typeof val.toString === 'function' ? val.toString() : null;
}

function getUserDepartmentIds(user) {
  const ids = new Set();
  if (Array.isArray(user?.departments)) {
    for (const d of user.departments) {
      const id = extractId(d);
      if (id) ids.add(id);
    }
  }
  const activeId = extractId(user?.activeDepartment);
  if (activeId) ids.add(activeId);
  return Array.from(ids);
}

async function getDocumentDepartmentIds(doc, type) {
  const docDepts = new Set();

  if (type === 'incoming') {
    for (const entry of doc.assignedTo || []) {
      const id = extractId(entry?.departmentId || entry?.id || entry);
      if (id) docDepts.add(id);
    }
    const singleDept = extractId(doc.departmentId);
    if (singleDept) docDepts.add(singleDept);
  } else if (type === 'outgoing') {
    const sourceDept = extractId(doc.source?.id);
    if (sourceDept) docDepts.add(sourceDept);

    const singleDept = extractId(doc.departmentId);
    if (singleDept) docDepts.add(singleDept);

    // Un sortant en réponse à un entrant est également accessible au département destinataire de l'entrant
    if (doc.reference) {
      const refId = extractId(doc.reference);
      if (refId && mongoose.Types.ObjectId.isValid(refId)) {
        const refIncoming = await IncomingDocument.findOne({ _id: refId, isDeleted: { $ne: true } })
          .select('assignedTo departmentId')
          .lean();
        if (refIncoming) {
          for (const entry of refIncoming.assignedTo || []) {
            const id = extractId(entry?.departmentId || entry?.id || entry);
            if (id) docDepts.add(id);
          }
        }
      }
    }
  }

  return Array.from(docDepts);
}

async function canUserAccessDocument(user, doc, type) {
  if (!user || !doc) return false;
  if (GLOBAL_FILE_ROLES.includes(user.role)) return true;
  if (!['AdminDepartment', 'User'].includes(user.role)) return false;

  const userDepts = getUserDepartmentIds(user);
  if (userDepts.length === 0) return false;

  const docDepts = await getDocumentDepartmentIds(doc, type);
  // Aucun département déterminable sur le document => accès strictement refusé
  if (docDepts.length === 0) return false;

  return docDepts.some((d) => userDepts.includes(d));
}

/**
 * Serves a protected document file with RBAC validation and Path Traversal protection
 * Route: GET /api/files/:type/:id/:filename
 * Access: Private (Authenticated users with appropriate role/department)
 */
exports.serveProtectedFile = async (req, res) => {
  try {
    const { type, id, filename } = req.params;

    if (!type || !id || !filename || !['incoming', 'outgoing'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Paramètres invalides ou manquants' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Identifiant de document invalide' });
    }

    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;
    const doc = await Model.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    // Vérification RBAC stricte
    const hasAccess = await canUserAccessDocument(req.user, doc, type);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const safeFilename = path.basename(filename);
    const ROOT = path.resolve(process.env.DOCUMENT_PATH || path.join(__dirname, '../courrier'));
    const BACKEND_ROOT = path.resolve(__dirname, '..');
    const ALLOWED_ROOT = path.resolve(process.cwd());

    let requestedDocPath = doc.scannedDocument || null;
    const rawVersionParam = req.query?.version;
    let isExplicitVersion = false;

    if (rawVersionParam !== undefined && rawVersionParam !== null && String(rawVersionParam).trim() !== '') {
      const requestedVer = Number(rawVersionParam);
      if (!Number.isInteger(requestedVer) || requestedVer < 1) {
        return res.status(400).json({ success: false, message: 'Numéro de version invalide' });
      }
      isExplicitVersion = true;
      const matchedVersion = Array.isArray(doc.versions)
        ? doc.versions.find((v) => Number(v?.version) === requestedVer)
        : null;

      if (matchedVersion && matchedVersion.filePath) {
        requestedDocPath = matchedVersion.filePath;
      } else if (requestedVer === (Number(doc.currentVersion) || 1) && doc.scannedDocument) {
        requestedDocPath = doc.scannedDocument;
      } else {
        return res.status(404).json({ success: false, message: `Version ${requestedVer} introuvable` });
      }
    }

    const resolveDocRelPaths = (relPath) => {
      if (!relPath || typeof relPath !== 'string') return [];
      const cleanRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
      const paths = [
        path.resolve(BACKEND_ROOT, cleanRel),
        path.resolve(ALLOWED_ROOT, 'backend', cleanRel),
        path.resolve(ALLOWED_ROOT, cleanRel),
      ];
      if (cleanRel.startsWith('courrier/')) {
        paths.push(path.resolve(ROOT, cleanRel.slice('courrier/'.length)));
      }
      return paths;
    };

    const possiblePaths = isExplicitVersion
      ? [
          ...resolveDocRelPaths(requestedDocPath),
          path.resolve(ROOT, path.basename(requestedDocPath)),
          doc.year
            ? path.resolve(ROOT, String(doc.year), type === 'incoming' ? 'Incoming-Doc' : 'Outgoing-Doc', path.basename(requestedDocPath))
            : null,
        ].filter(Boolean)
      : [
          ...resolveDocRelPaths(requestedDocPath),
          path.resolve(ROOT, safeFilename),
          doc.year ? path.resolve(ROOT, String(doc.year), safeFilename) : null,
          doc.year ? path.resolve(ROOT, String(doc.year), type === 'incoming' ? 'Incoming-Doc' : 'Outgoing-Doc', safeFilename) : null,
          path.resolve(BACKEND_ROOT, 'uploads', safeFilename),
          path.resolve(ALLOWED_ROOT, 'uploads', safeFilename),
        ].filter(Boolean);

    const targetFile = possiblePaths.find((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
      } catch (_) {
        return false;
      }
    });

    if (!targetFile) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable' });
    }

    const resolvedTarget = path.resolve(targetFile);
    if (
      !resolvedTarget.startsWith(ALLOWED_ROOT + path.sep) &&
      !resolvedTarget.startsWith(BACKEND_ROOT + path.sep) &&
      !resolvedTarget.startsWith(ROOT + path.sep)
    ) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    res.sendFile(resolvedTarget);
  } catch (err) {
    console.error('[FileController] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Middleware de protection pour les accès directs aux fichiers de courrier
 * Route: /courrier/*
 * Vérifie que l'utilisateur est authentifié, contrôle l'accès RBAC par département/rôle et empêche le Path Traversal
 */
exports.serveCourrierStatic = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    const ROOT = path.resolve(
      process.env.DOCUMENT_PATH || path.join(__dirname, '../../backend/courrier')
    );
    const relativePath = req.path.replace(/^\/courrier/, '');
    const safePath = path.resolve(ROOT, '.' + relativePath);

    if (!safePath.startsWith(ROOT + path.sep) && safePath !== ROOT) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    // Contrôle RBAC par rôle et département sur /courrier/*
    if (!GLOBAL_FILE_ROLES.includes(req.user.role)) {
      if (!['AdminDepartment', 'User'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }

      const normalizedRel = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const candidateScannedPaths = [
        `courrier/${normalizedRel}`,
        `/courrier/${normalizedRel}`,
        `backend/courrier/${normalizedRel}`,
        normalizedRel,
      ];

      let matchedDoc = null;
      let matchedType = null;

      const parsedMatch = normalizedRel.match(/^(\d{4})\/(Incoming-Doc|Outgoing-Doc)\/(\d+)(?:_v\d+(?:_\d+)?)?\.[a-z0-9]+$/i);
      if (parsedMatch) {
        const yearNum = Number(parsedMatch[1]);
        const folderKind = parsedMatch[2].toLowerCase();
        const serialNum = Number(parsedMatch[3]);
        matchedType = folderKind === 'incoming-doc' ? 'incoming' : 'outgoing';
        const TargetModel = matchedType === 'incoming' ? IncomingDocument : OutgoingDocument;
        matchedDoc = await TargetModel.findOne({
          isDeleted: { $ne: true },
          $or: [
            { scannedDocument: { $in: candidateScannedPaths } },
            { 'versions.filePath': { $in: candidateScannedPaths } },
            { year: yearNum, serialNumber: serialNum },
          ],
        }).lean();
      } else {
        matchedDoc = await IncomingDocument.findOne({
          isDeleted: { $ne: true },
          $or: [
            { scannedDocument: { $in: candidateScannedPaths } },
            { 'versions.filePath': { $in: candidateScannedPaths } },
          ],
        }).lean();
        if (matchedDoc) {
          matchedType = 'incoming';
        } else {
          matchedDoc = await OutgoingDocument.findOne({
            isDeleted: { $ne: true },
            $or: [
              { scannedDocument: { $in: candidateScannedPaths } },
              { 'versions.filePath': { $in: candidateScannedPaths } },
            ],
          }).lean();
          if (matchedDoc) {
            matchedType = 'outgoing';
          }
        }
      }

      if (!matchedDoc || !(await canUserAccessDocument(req.user, matchedDoc, matchedType))) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }
    }

    let targetFile = safePath;
    if (!fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
      const filename = path.basename(safePath);
      const fallbacks = [
        path.resolve(ROOT, filename),
        path.resolve(process.cwd(), 'backend', 'courrier', '.' + relativePath),
        path.resolve(process.cwd(), 'backend', 'uploads', filename),
        path.resolve(process.cwd(), 'uploads', filename),
      ];
      targetFile = fallbacks.find((p) => {
        try {
          return fs.existsSync(p) && fs.statSync(p).isFile();
        } catch (_) {
          return false;
        }
      });
    }

    if (!targetFile || !fs.existsSync(targetFile) || !fs.statSync(targetFile).isFile()) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable' });
    }

    return res.sendFile(targetFile);
  } catch (err) {
    console.error('[FileController] Static Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
