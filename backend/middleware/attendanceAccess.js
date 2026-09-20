const OrganizationSettings = require('../models/OrganizationSettings');

/**
 * Middleware de contrôle d'accès pour le module Suivi de Présence
 * 
 * - Admin / SuperAdmin : Accès complet (tous départements, configuration, rapports)
 * - AdminDepartment (du département RH) : Accès complet (Admin RH)
 * - AdminDepartment (autre département) : Accès restreint à son département actif (req.userRestrictedToDepartment)
 * - User (agent) : Accès autorisé en lecture seule à son propre calendrier et solde
 */
const checkAttendanceAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé - Authentification requise'
      });
    }

    const role = req.user.role;

    // 1. Administrateurs système : accès total
    if (role === 'Admin' || role === 'SuperAdmin') {
      req.userRestrictedToDepartment = null;
      req.isAdminRH = true;
      return next();
    }

    // 2. Chef de département (AdminDepartment)
    if (role === 'AdminDepartment') {
      try {
        const settings = await OrganizationSettings.findOne();
        const rhDeptId = settings?.rhDepartmentId?.toString();
        const activeDeptId = (req.user.activeDepartment?._id || req.user.activeDepartment)?.toString();

        // Si ce chef de département est rattaché au département RH, il a les prérogatives AdminRH
        if (rhDeptId && activeDeptId === rhDeptId) {
          req.userRestrictedToDepartment = null;
          req.isAdminRH = true;
        } else {
          // Chef d'un autre département : restreint à son propre département
          req.userRestrictedToDepartment = req.user.activeDepartment?._id || req.user.activeDepartment;
          req.isAdminRH = false;
        }
      } catch (err) {
        req.userRestrictedToDepartment = req.user.activeDepartment?._id || req.user.activeDepartment;
        req.isAdminRH = false;
      }
      return next();
    }

    // 3. Utilisateur / Agent standard (User) : autorisé pour son propre calendrier et solde
    const path = req.path || req.baseUrl;
    if (role === 'User' && (path.includes('/calendar') || path.includes('/balance'))) {
      req.userRestrictedToDepartment = null;
      req.isAgent = true;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Droits insuffisants pour le module Présence'
    });
  } catch (error) {
    console.error('Erreur checkAttendanceAccess:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne de vérification des droits'
    });
  }
};

module.exports = {
  checkAttendanceAccess
};
