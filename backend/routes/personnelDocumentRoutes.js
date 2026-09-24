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

// Toutes les routes nécessitent une authentification et les droits d'accès autorisés (Director, Admin, AdminDepartment, AdminTuningDesk)
router.use(protect);
router.use(authorize('Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'));

// Routes pour associer un document à une fiche de personnel et lister ses documents
router.route('/personnel/:personnelId/documents')
  .post(associerDocument)
  .get(listerDocumentsDuPersonnel);

// Routes pour modifier ou supprimer une association existante
router.route('/personnel-documents/:associationId')
  .put(mettreAJourAssociation)
  .delete(supprimerAssociation);

// Route pour lister le personnel associé à un document (recherche inverse)
router.get('/documents/:documentType/:documentId/personnel', listerPersonnelDuDocument);

module.exports = router;
