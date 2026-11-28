const Department = require('../models/Department');
const OrganizationSettings = require('../models/OrganizationSettings');

const extractId = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val.trim() || null;
  if (typeof val === 'object') {
    if (val._id) return val._id.toString();
    if (val.id) return String(val.id);
    if (typeof val.toString === 'function') {
      const str = val.toString();
      return str === '[object Object]' ? null : str;
    }
  }
  return String(val);
};

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, "'");

const isRHDeptMeta = (dept) => {
  const name = normalizeText(dept?.name);
  const desc = normalizeText(dept?.description);
  const code = normalizeText(dept?.code);
  return (
    code === 'rh' ||
    name === 'rh' ||
    name === 'ressources humaines' ||
    name === 'الموارد البشرية' ||
    name.includes('ressources humaines') ||
    name.includes('الموارد البشرية') ||
    desc.includes('(rh)')
  );
};

const isBureauDirecteurMeta = (dept) => {
  const name = normalizeText(dept?.name);
  const desc = normalizeText(dept?.description);
  const code = normalizeText(dept?.code);
  return (
    code === 'dg' ||
    code === 'bd' ||
    code === 'dir' ||
    name === 'dg' ||
    name === 'bd' ||
    name === 'bureau directeur' ||
    name === 'direction' ||
    name === 'direction générale' ||
    name === 'direction generale' ||
    name === 'الإدارة العامة' ||
    name === 'مكتب المدير' ||
    name.includes('bureau directeur') ||
    name.includes('direction générale') ||
    name.includes('direction generale') ||
    desc.includes('(dir)') ||
    desc.includes('(dg)') ||
    desc.includes('(bd)')
  );
};

const isBureauOrdreMeta = (dept) => {
  const name = normalizeText(dept?.name);
  const desc = normalizeText(dept?.description);
  const code = normalizeText(dept?.code);
  return (
    code === 'bo' ||
    name === 'bo' ||
    name === "bureau d'ordre" ||
    name === 'bureau ordre' ||
    name === 'مكتب الضبط' ||
    name.includes("bureau d'ordre") ||
    name.includes('bureau ordre') ||
    desc.includes('(bo)')
  );
};

/**
 * Résout les périmètres départementaux pour le module Présence :
 * - Admin / Director : accès complet multi-départements (isUnrestricted = true)
 * - AdminDepartment (RH) : accès restreint exclusivement à [RH, Bureau Directeur (DG/BD), Bureau d'Ordre (BO)]
 * - AdminDepartment (autre, ex: LABO, QT) : accès restreint exclusivement à [propre département, Bureau Directeur]
 * - Autres rôles : aucun accès collectif (allowedDepartmentIds = [])
 */
const resolveAttendanceDepartmentScope = async (req) => {
  const user = req?.user;
  if (!user) {
    return {
      isUnrestricted: false,
      isRHManager: false,
      allowedDepartmentIds: [],
      userDeptId: null,
      rhDeptId: null,
      bdDeptId: null,
      boDeptId: null,
    };
  }

  let settings = null;
  try {
    settings = await OrganizationSettings.findOne().lean();
  } catch (_err) {
    settings = null;
  }

  let rhDeptId = extractId(settings?.rhDepartmentId);
  let bdDeptId = extractId(settings?.bureauDirecteurDepartmentId);
  let boDeptId = extractId(settings?.bureauOrdreDepartmentId);

  if (!rhDeptId || !bdDeptId || !boDeptId) {
    try {
      const departments = await Department.find({ isActive: { $ne: false } })
        .select('_id name description code')
        .lean();
      if (Array.isArray(departments)) {
        if (!rhDeptId) {
          const found = departments.find(isRHDeptMeta);
          if (found) rhDeptId = extractId(found._id);
        }
        if (!bdDeptId) {
          const found = departments.find(isBureauDirecteurMeta);
          if (found) bdDeptId = extractId(found._id);
        }
        if (!boDeptId) {
          const found = departments.find(isBureauOrdreMeta);
          if (found) boDeptId = extractId(found._id);
        }
      }
    } catch (_err) {
      // Fallback silencieux si la collection Department n'est pas interrogée (ex: tests unitaires isolés)
    }
  }

  const role = user.role;
  const userDeptId = extractId(user.activeDepartment) || extractId(req.userRestrictedToDepartment);

  if (role === 'Admin' || role === 'Director') {
    return {
      isUnrestricted: true,
      isRHManager: role === 'Admin',
      allowedDepartmentIds: null,
      userDeptId,
      rhDeptId,
      bdDeptId,
      boDeptId,
    };
  }

  if (role === 'AdminDepartment') {
    const activeDeptObj =
      typeof user.activeDepartment === 'object' && user.activeDepartment !== null
        ? user.activeDepartment
        : null;

    const isRHManager = Boolean(
      req.isAdminRH === true ||
      (userDeptId && rhDeptId && userDeptId === rhDeptId) ||
      (!rhDeptId && activeDeptObj && isRHDeptMeta(activeDeptObj))
    );

    const allowedSet = new Set();
    if (isRHManager) {
      if (userDeptId) allowedSet.add(userDeptId);
      if (rhDeptId) allowedSet.add(rhDeptId);
      if (bdDeptId) allowedSet.add(bdDeptId);
      if (boDeptId) allowedSet.add(boDeptId);
    } else {
      if (userDeptId) allowedSet.add(userDeptId);
      if (bdDeptId) allowedSet.add(bdDeptId);
    }

    return {
      isUnrestricted: false,
      isRHManager,
      allowedDepartmentIds: Array.from(allowedSet),
      userDeptId,
      rhDeptId,
      bdDeptId,
      boDeptId,
    };
  }

  return {
    isUnrestricted: false,
    isRHManager: false,
    allowedDepartmentIds: [],
    userDeptId,
    rhDeptId,
    bdDeptId,
    boDeptId,
  };
};

module.exports = {
  extractId,
  resolveAttendanceDepartmentScope,
  isRHDeptMeta,
  isBureauDirecteurMeta,
  isBureauOrdreMeta,
};
