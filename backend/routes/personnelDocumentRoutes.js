const express = require('express');
const {
  associerDocument,
  listerDocumentsDuPersonnel,
  listerPersonnelDuDocument,
  mettreAJourAssociation,
  supprimerAssociation
} = require('../controllers/personnelDocumentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes pour associer un document à une fiche de personnel et lister ses documents
router.route('/personnel/:personnelId/documents')
  .post(authorize('Admin', 'AdminDepartment', 'AdminTuningDesk'), associerDocument)
  .get(authorize('Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'), listerDocumentsDuPersonnel);

// Routes pour modifier ou supprimer une association existante
router.route('/personnel-documents/:associationId')
  .put(authorize('Admin', 'AdminDepartment', 'AdminTuningDesk'), mettreAJourAssociation)
  .delete(authorize('Admin', 'AdminDepartment', 'AdminTuningDesk'), supprimerAssociation);

// Route pour lister le personnel associé à un document (recherche inverse)
router.get('/documents/:documentType/:documentId/personnel', authorize('Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'), listerPersonnelDuDocument);

module.exports = router;
