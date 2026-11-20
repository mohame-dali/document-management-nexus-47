const mongoose = require('mongoose');
const PersonnelDocument = require('../models/PersonnelDocument');
const Personnel = require('../models/Personnel');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const OrganizationSettings = require('../models/OrganizationSettings');

// Helper pour récupérer les types d'association valides configurés
const getValidAssociationTypes = async () => {
  const settings = await OrganizationSettings.findOne();
  if (settings && Array.isArray(settings.typesAssociationPersonnel) && settings.typesAssociationPersonnel.length > 0) {
    return settings.typesAssociationPersonnel;
  }
  return ['Stage', 'Formation', 'Diplôme', 'Autre'];
};

// Helper pour vérifier si le département correspond au département RH
const isRHDepartment = async (dept) => {
  if (!dept) return false;
  const deptId = (dept._id || dept).toString();
  const settings = await OrganizationSettings.findOne();
  if (!settings || !settings.rhDepartmentId) return false;
  return settings.rhDepartmentId.toString() === deptId;
};

// Helpers d'extraction et de vérification d'accès départemental
const extractId = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val._id) return val._id.toString();
  if (val.id) return typeof val.id === 'string' ? val.id : (val.id._id ? val.id._id.toString() : val.id.toString());
  return typeof val.toString === 'function' ? val.toString() : null;
};

const getUserDepartmentIds = (user) => {
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
};

const hasGlobalHRAccess = async (user) => {
  if (!user) return false;
  if (['Admin', 'Director'].includes(user.role)) return true;
  if (user.role === 'AdminDepartment') {
    return isRHDepartment(user.activeDepartment);
  }
  return false;
};

const getDocumentDepartmentIds = async (doc, documentType) => {
  const docDepts = new Set();
  if (!doc) return [];

  if (documentType === 'IncomingDocument') {
    for (const entry of doc.assignedTo || []) {
      const id = extractId(entry?.departmentId || entry?.id || entry);
      if (id) docDepts.add(id);
    }
    const singleDept = extractId(doc.departmentId);
    if (singleDept) docDepts.add(singleDept);
  } else if (documentType === 'OutgoingDocument') {
    const sourceDept = extractId(doc.source?.id);
    if (sourceDept) docDepts.add(sourceDept);
    const singleDept = extractId(doc.departmentId);
    if (singleDept) docDepts.add(singleDept);

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
          const refSingle = extractId(refIncoming.departmentId);
          if (refSingle) docDepts.add(refSingle);
        }
      }
    }
  }

  return Array.from(docDepts);
};

const canUserAccessDocument = async (user, doc, documentType) => {
  if (!user || !doc) return false;
  if (await hasGlobalHRAccess(user)) return true;
  if (!['AdminDepartment', 'AdminTuningDesk', 'User'].includes(user.role)) return false;

  const userDepts = getUserDepartmentIds(user);
  if (userDepts.length === 0) return false;

  const docDepts = await getDocumentDepartmentIds(doc, documentType);
  if (docDepts.length === 0) return false;

  return docDepts.some((d) => userDepts.includes(d));
};

// Helper pour vérifier si l'utilisateur connecté a le droit de lier/gérer ce personnel
async function canUserLinkPersonnel(req, personnelId) {
  const user = req.user;
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (user.role === 'AdminDepartment' || user.role === 'AdminTuningDesk') {
    // Vérifier si RH
    const isRH = await isRHDepartment(user.activeDepartment);
    if (isRH) return true;
    // Vérifier si le personnel ciblé est dans son département
    const personnel = await Personnel.findOne({ _id: personnelId, isDeleted: { $ne: true } });
    if (!personnel) return false;
    const personnelDept = (personnel.activeDepartment?._id || personnel.activeDepartment)?.toString();
    const userDept = (user.activeDepartment?._id || user.activeDepartment)?.toString();
    return Boolean(userDept && personnelDept && personnelDept === userDept);
  }
  return false;
}

// @desc    Créer une association entre un document et une fiche de personnel
// @route   POST /api/hr/personnel/:personnelId/documents
// @access  Private (Admin, Director, AdminDepartment)
exports.associerDocument = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const { documentType, documentId, typeAssociation, commentaire } = req.body;

    // 1. Validation de l'ID du personnel
    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de personnel invalide'
      });
    }

    const personnel = await Personnel.findById(personnelId);
    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel introuvable'
      });
    }

    // 1b. Vérification des droits d'association (RH / Admin ou département correspondant)
    const canLink = await canUserLinkPersonnel(req, personnelId);
    if (!canLink) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بربط هذا الموظف'
      });
    }

    // 2. Validation du documentType
    if (!documentType || !['IncomingDocument', 'OutgoingDocument'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'documentType invalide (doit être IncomingDocument ou OutgoingDocument)'
      });
    }

    // 3. Validation du documentId
    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de document invalide'
      });
    }

    // 4. Vérifier l'existence effective du document dans la collection cible
    const TargetModel = mongoose.model(documentType);
    const documentExists = await TargetModel.findById(documentId);
    if (!documentExists) {
      return res.status(404).json({
        success: false,
        message: `Document introuvable dans ${documentType}`
      });
    }

    // 5. Validation de typeAssociation par rapport à OrganizationSettings
    if (!typeAssociation || typeof typeAssociation !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Le type d'association est obligatoire"
      });
    }

    const trimmedType = typeAssociation.trim();
    const validTypes = await getValidAssociationTypes();
    if (!validTypes.includes(trimmedType)) {
      return res.status(400).json({
        success: false,
        message: `Type d'association non valide : "${trimmedType}". Types autorisés : ${validTypes.join(', ')}`
      });
    }

    // 6. Vérifier si l'association existe déjà (prévention des doublons)
    const existingAssociation = await PersonnelDocument.findOne({
      personnelId,
      documentType,
      documentId
    });

    if (existingAssociation) {
      return res.status(400).json({
        success: false,
        message: 'Ce document est déjà associé à cette fiche de personnel'
      });
    }

    // 7. Création de l'association
    const associePar = req.user ? (req.user._id || req.user.id) : null;
    if (!associePar) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    const newAssociation = await PersonnelDocument.create({
      personnelId,
      documentType,
      documentId,
      typeAssociation: trimmedType,
      commentaire: commentaire ? commentaire.trim() : '',
      dateAssociation: new Date(),
      associePar
    });

    res.status(201).json({
      success: true,
      data: newAssociation
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ce document est déjà associé à cette fiche de personnel'
      });
    }
    next(error);
  }
};

// @desc    Lister toutes les associations pour une fiche de personnel donnée
// @route   GET /api/hr/personnel/:personnelId/documents
// @access  Private (Admin, Director, AdminDepartment)
exports.listerDocumentsDuPersonnel = async (req, res, next) => {
  try {
    const { personnelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(personnelId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de personnel invalide'
      });
    }

    const personnel = await Personnel.findOne({ _id: personnelId, isDeleted: { $ne: true } });
    if (!personnel) {
      return res.status(404).json({
        success: false,
        message: 'Fiche de personnel introuvable'
      });
    }

    const isGlobalHR = await hasGlobalHRAccess(req.user);
    if (!isGlobalHR) {
      const userDepts = getUserDepartmentIds(req.user);
      const personnelDept = extractId(personnel.activeDepartment);
      if (!personnelDept || !userDepts.includes(personnelDept)) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé : vous n\'avez pas accès au département de ce personnel'
        });
      }
    }

    const associations = await PersonnelDocument.find({ personnelId })
      .populate('associePar', 'username email')
      .sort({ dateAssociation: -1 });

    // Regrouper les IDs pour un populate polymorphe efficace
    const incomingIds = [];
    const outgoingIds = [];

    associations.forEach((assoc) => {
      if (assoc.documentType === 'IncomingDocument') {
        incomingIds.push(assoc.documentId);
      } else if (assoc.documentType === 'OutgoingDocument') {
        outgoingIds.push(assoc.documentId);
      }
    });

    const [incomingDocs, outgoingDocs] = await Promise.all([
      incomingIds.length > 0
        ? IncomingDocument.find({ _id: { $in: incomingIds }, isDeleted: { $ne: true } }).lean()
        : [],
      outgoingIds.length > 0
        ? OutgoingDocument.find({ _id: { $in: outgoingIds }, isDeleted: { $ne: true } }).lean()
        : []
    ]);

    const docsMap = new Map();
    for (const doc of incomingDocs) {
      if (isGlobalHR || (await canUserAccessDocument(req.user, doc, 'IncomingDocument'))) {
        docsMap.set(doc._id.toString(), doc);
      }
    }
    for (const doc of outgoingDocs) {
      if (isGlobalHR || (await canUserAccessDocument(req.user, doc, 'OutgoingDocument'))) {
        docsMap.set(doc._id.toString(), doc);
      }
    }

    const formattedData = associations
      .filter((assoc) => isGlobalHR || docsMap.has(assoc.documentId.toString()))
      .map((assoc) => {
        const doc = docsMap.get(assoc.documentId.toString()) || null;
        return {
          _id: assoc._id,
          personnelId: assoc.personnelId,
          typeAssociation: assoc.typeAssociation,
          documentType: assoc.documentType,
          documentId: assoc.documentId,
          document: doc,
          commentaire: assoc.commentaire,
          dateAssociation: assoc.dateAssociation,
          associePar: assoc.associePar,
          createdAt: assoc.createdAt
        };
      });

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lister le personnel associé à un document donné
// @route   GET /api/hr/documents/:documentType/:documentId/personnel
// @access  Private (Admin, Director, AdminDepartment)
exports.listerPersonnelDuDocument = async (req, res, next) => {
  try {
    const { documentType, documentId } = req.params;

    if (!['IncomingDocument', 'OutgoingDocument'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'documentType invalide (doit être IncomingDocument ou OutgoingDocument)'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de document invalide'
      });
    }

    const TargetModel = mongoose.model(documentType);
    const doc = await TargetModel.findOne({ _id: documentId, isDeleted: { $ne: true } }).lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: `Document introuvable dans ${documentType}`
      });
    }

    const isGlobalHR = await hasGlobalHRAccess(req.user);
    const canAccessDoc = isGlobalHR || (await canUserAccessDocument(req.user, doc, documentType));
    if (!canAccessDoc) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé : vous n\'avez pas accès au département de ce document'
      });
    }

    const personnelProjection = isGlobalHR
      ? 'nom prenom cin poste activeDepartment statut emailPersonnel telephone'
      : 'nom prenom poste activeDepartment statut';

    const associations = await PersonnelDocument.find({ documentType, documentId })
      .populate('personnelId', personnelProjection)
      .populate('associePar', 'username email')
      .sort({ dateAssociation: -1 });

    const formattedData = associations.map((assoc) => ({
      _id: assoc._id,
      personnel: assoc.personnelId,
      typeAssociation: assoc.typeAssociation,
      commentaire: assoc.commentaire,
      dateAssociation: assoc.dateAssociation,
      associePar: assoc.associePar,
      createdAt: assoc.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Modifier une association existante (typeAssociation ou commentaire)
// @route   PUT /api/hr/personnel-documents/:associationId
// @access  Private (Admin, Director, AdminDepartment)
exports.mettreAJourAssociation = async (req, res, next) => {
  try {
    const { associationId } = req.params;
    const { typeAssociation, commentaire } = req.body;

    if (!mongoose.Types.ObjectId.isValid(associationId)) {
      return res.status(400).json({
        success: false,
        message: "Identifiant d'association invalide"
      });
    }

    const association = await PersonnelDocument.findById(associationId);
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association introuvable'
      });
    }

    // Vérifier les permissions de modification
    const canUpdate = await canUserLinkPersonnel(req, association.personnelId);
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بربط هذا الموظف'
      });
    }

    if (typeAssociation !== undefined) {
      if (!typeAssociation || typeof typeAssociation !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Le type d'association ne peut pas être vide"
        });
      }
      const trimmedType = typeAssociation.trim();
      const validTypes = await getValidAssociationTypes();
      if (!validTypes.includes(trimmedType)) {
        return res.status(400).json({
          success: false,
          message: `Type d'association non valide : "${trimmedType}". Types autorisés : ${validTypes.join(', ')}`
        });
      }
      association.typeAssociation = trimmedType;
    }

    if (commentaire !== undefined) {
      association.commentaire = typeof commentaire === 'string' ? commentaire.trim() : '';
    }

    await association.save();

    res.status(200).json({
      success: true,
      data: association
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Supprimer une association
// @route   DELETE /api/hr/personnel-documents/:associationId
// @access  Private (Admin, Director, AdminDepartment)
exports.supprimerAssociation = async (req, res, next) => {
  try {
    const { associationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(associationId)) {
      return res.status(400).json({
        success: false,
        message: "Identifiant d'association invalide"
      });
    }

    const association = await PersonnelDocument.findById(associationId);
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association introuvable'
      });
    }

    // Vérifier les permissions de suppression
    const canDelete = await canUserLinkPersonnel(req, association.personnelId);
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بربط هذا الموظف'
      });
    }

    await PersonnelDocument.findByIdAndDelete(associationId);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Association supprimée avec succès'
    });
  } catch (error) {
    next(error);
  }
};
