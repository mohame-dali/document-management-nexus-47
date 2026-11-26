const mongoose = require('mongoose');
const Department = require('../models/Department');
const { extractId } = require('./rhAuthHelper');

async function resolveDepartmentName(deptId) {
  const idStr = extractId(deptId);
  if (!idStr || !mongoose.Types.ObjectId.isValid(idStr)) return '';
  try {
    const dept = await Department.findById(idStr).select('name').lean();
    return dept?.name ? String(dept.name).trim() : '';
  } catch (_err) {
    return '';
  }
}

async function seedInitialAffectationIfEmpty(personnel, deptNameOverride = '') {
  if (!personnel) return;
  if (!Array.isArray(personnel.historiqueAffectations)) {
    personnel.historiqueAffectations = [];
  }
  if (personnel.historiqueAffectations.length > 0) return;

  const deptId = extractId(personnel.activeDepartment);
  const poste = (personnel.posteActuel || personnel.poste || '').trim();
  if (!deptId && !poste) return;

  const deptName = deptNameOverride || (deptId ? await resolveDepartmentName(deptId) : '');
  const startDate =
    personnel.dateEngagement ||
    personnel.dateEmbauche ||
    personnel.createdAt ||
    new Date();

  personnel.historiqueAffectations.push({
    poste,
    departement: deptId || null,
    departementName: deptName,
    dateDebut: startDate,
    dateFin: null,
    reference: '',
    observations: '',
    isCurrent: true,
  });
}

async function recordCareerTransition(
  personnel,
  {
    prevDeptId = null,
    prevPoste = '',
    newDeptId = null,
    newDeptName = '',
    newPoste = '',
    reference = '',
    observations = '',
    transitionDate = new Date(),
  }
) {
  if (!personnel) return;
  if (!Array.isArray(personnel.historiqueAffectations)) {
    personnel.historiqueAffectations = [];
  }

  const now = transitionDate instanceof Date ? transitionDate : new Date(transitionDate);

  // Backfill legacy employees that had no prior history before their first recorded transfer
  if (personnel.historiqueAffectations.length === 0 && (prevDeptId || prevPoste)) {
    const prevDeptName = prevDeptId ? await resolveDepartmentName(prevDeptId) : '';
    const legacyStartDate =
      personnel.dateEngagement ||
      personnel.dateEmbauche ||
      personnel.createdAt ||
      now;

    personnel.historiqueAffectations.push({
      poste: prevPoste || '',
      departement: prevDeptId || null,
      departementName: prevDeptName,
      dateDebut: legacyStartDate,
      dateFin: now,
      reference: '',
      observations: '',
      isCurrent: false,
    });
  }

  // Close all open assignment entries
  for (const entry of personnel.historiqueAffectations) {
    if (entry && (entry.isCurrent === true || !entry.dateFin)) {
      entry.dateFin = now;
      entry.isCurrent = false;
    }
  }

  // Append new active entry if there is a department or position
  if (newDeptId || newPoste) {
    const resolvedNewDeptName =
      newDeptName || (newDeptId ? await resolveDepartmentName(newDeptId) : '');
    personnel.historiqueAffectations.push({
      poste: newPoste || '',
      departement: newDeptId || null,
      departementName: resolvedNewDeptName,
      dateDebut: now,
      dateFin: null,
      reference: reference || '',
      observations: observations || '',
      isCurrent: true,
    });
  }
}

module.exports = {
  resolveDepartmentName,
  seedInitialAffectationIfEmpty,
  recordCareerTransition,
};
