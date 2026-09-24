const express = require('express');
const {
  createPersonnel,
  getPersonnelList,
  getPersonnelById,
  updatePersonnel,
  deletePersonnel,
  restorePersonnel,
  getPersonnelEnAttente,
  getMyProfile,
  getMyDocuments,
  linkUserToPersonnel,
  uploadPersonnelPhotoFile
} = require('../controllers/personnelController');

const { protect, authorize, checkRHAccess } = require('../middleware/auth');
const { uploadPersonnelPhoto } = require('../middleware/upload');

const router = express.Router();

// Toutes les routes de ce module nécessitent une authentification
router.use(protect);

// Profil et documents de l'utilisateur connecté (accessible à tous les utilisateurs authentifiés)
router.get('/my-profile', getMyProfile);
router.get('/my-documents', getMyDocuments);

// Fiches de personnel en attente de compte utilisateur (réservé RH)
router.get('/personnel/en-attente', checkRHAccess, getPersonnelEnAttente);

// Lier un compte utilisateur à une fiche de personnel (LOT 7bis)
router.post('/personnel/:personnelId/link-user', checkRHAccess, linkUserToPersonnel);

// Téléversement de photo pour une fiche de personnel (réservé RH - placé avant /personnel/:id)
router.put(
  '/personnel/:id/photo',
  checkRHAccess,
  uploadPersonnelPhoto.single('photo'),
  (err, req, res, next) => {
    if (err) {
      const isLimit = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        success: false,
        message: isLimit ? 'Le fichier dépasse la taille maximale autorisée (2 Mo)' : (err.message || 'Fichier image non valide')
      });
    }
    next();
  },
  uploadPersonnelPhotoFile
);

// Routes CRUD du personnel
router.route('/personnel')
  .get(authorize('Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'), getPersonnelList)
  .post(checkRHAccess, createPersonnel);

router.route('/personnel/:id')
  .get(checkRHAccess, getPersonnelById)
  .put(checkRHAccess, updatePersonnel)
  .delete(authorize('Admin'), deletePersonnel);

// Restauration d'une fiche supprimée (soft delete)
router.put('/personnel/:id/restore', authorize('Admin'), restorePersonnel);

module.exports = router;
