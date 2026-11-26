const Department = require('../models/Department');
const Personnel = require('../models/Personnel');
const OrganizationSettings = require('../models/OrganizationSettings');
const User = require('../models/User');

const toId = (val) => {
  if (!val) return null;
  if (typeof val === 'object' && val._id) return String(val._id);
  return String(val);
};

exports.getOrganizationChart = async (req, res, next) => {
  try {
    const settings = await OrganizationSettings.findOne().lean();
    const departments = await Department.find({ isActive: true })
      .select('name description')
      .lean();

    const [personnel, activeUsers] = await Promise.all([
      Personnel.find({
        statut: { $in: ['actif', 'en_attente'] },
        isDeleted: { $ne: true }
      })
        .select('nom prenom poste photo emailPersonnel activeDepartment departments userId statut')
        .populate('activeDepartment', 'name')
        .populate('userId', '_id username role isActive isDeleted')
        .lean(),
      User.find({
        isDeleted: { $ne: true },
        isActive: true
      })
        .select('username role photo email departments activeDepartment personnelId')
        .populate({
          path: 'personnelId',
          select: '_id nom prenom poste photo emailPersonnel activeDepartment departments statut isDeleted'
        })
        .lean()
    ]);

    const activeUsersById = new Map();
    const activeUsersByPersonnelId = new Map();
    (activeUsers || []).forEach((u) => {
      if (!u || !u._id) return;
      activeUsersById.set(String(u._id), u);
      const pid = toId(u.personnelId);
      if (pid) {
        activeUsersByPersonnelId.set(pid, u);
      }
    });

    // Deduplicate by _id and exclude personnel linked to deleted or deactivated users
    const seenPersonnelIds = new Set();
    const uniquePersonnel = [];
    const uniquePersonnelById = new Map();
    (personnel || []).forEach((p) => {
      if (!p || !p._id) return;
      const pId = String(p._id);
      if (seenPersonnelIds.has(pId)) return;

      if (p.userId && typeof p.userId === 'object') {
        if (p.userId.isDeleted === true || p.userId.isActive === false) {
          return;
        }
      }

      seenPersonnelIds.add(pId);
      uniquePersonnel.push(p);
      uniquePersonnelById.set(pId, p);
    });

    const isBureauDirecteur = (id) =>
      Boolean(settings?.bureauDirecteurDepartmentId && toId(settings.bureauDirecteurDepartmentId) === toId(id));
    const isBureauOrdre = (id) =>
      Boolean(settings?.bureauOrdreDepartmentId && toId(settings.bureauOrdreDepartmentId) === toId(id));
    const isRH = (id) =>
      Boolean(settings?.rhDepartmentId && toId(settings.rhDepartmentId) === toId(id));

    const excludedPersonnelIds = new Set();

    // Extract Director: prefer live active User with role === 'Director'
    let director = null;
    const directorUser = (activeUsers || []).find((u) => u.role === 'Director');
    if (directorUser) {
      const linkedDirectorPersonnel =
        (directorUser.personnelId && typeof directorUser.personnelId === 'object' && !directorUser.personnelId.isDeleted
          ? directorUser.personnelId
          : uniquePersonnelById.get(toId(directorUser.personnelId))) || null;

      if (linkedDirectorPersonnel) {
        excludedPersonnelIds.add(String(linkedDirectorPersonnel._id));
        director = {
          _id: linkedDirectorPersonnel._id,
          nom: linkedDirectorPersonnel.nom,
          prenom: linkedDirectorPersonnel.prenom,
          username: directorUser.username || null,
          poste: linkedDirectorPersonnel.poste || 'Directeur',
          photo: linkedDirectorPersonnel.photo || directorUser.photo || '',
          emailPersonnel: linkedDirectorPersonnel.emailPersonnel || directorUser.email || ''
        };
      } else {
        director = {
          _id: directorUser._id,
          nom: directorUser.username,
          prenom: '',
          username: directorUser.username || null,
          poste: 'Directeur',
          photo: directorUser.photo || '',
          emailPersonnel: directorUser.email || ''
        };
      }
    }

    // Legacy fallback via @deprecated bureauDirecteurDepartmentId
    const directorDeptId = toId(settings?.bureauDirecteurDepartmentId);
    if (!director && directorDeptId) {
      const directorPersonnel = uniquePersonnel.find((p) => {
        const deptId = toId(p.activeDepartment)
          || (Array.isArray(p.departments) && p.departments.length > 0 ? toId(p.departments[0]) : null);
        return deptId === directorDeptId;
      });
      if (directorPersonnel) {
        excludedPersonnelIds.add(String(directorPersonnel._id));
        const fallbackUser = activeUsersByPersonnelId.get(String(directorPersonnel._id))
          || (directorPersonnel.userId && typeof directorPersonnel.userId === 'object' && directorPersonnel.userId.isActive !== false && directorPersonnel.userId.isDeleted !== true
            ? directorPersonnel.userId
            : null);
        director = {
          _id: directorPersonnel._id,
          nom: directorPersonnel.nom,
          prenom: directorPersonnel.prenom,
          username: fallbackUser?.username || null,
          poste: directorPersonnel.poste || 'Directeur',
          photo: directorPersonnel.photo || '',
          emailPersonnel: directorPersonnel.emailPersonnel || ''
        };
      }
    }

    const personnelByDept = {};
    const addedKeysByDept = {};
    const addEntryToDept = (deptId, entry) => {
      const dKey = toId(deptId);
      const eKey = toId(entry?._id);
      if (!dKey || !eKey) return;
      if (!personnelByDept[dKey]) {
        personnelByDept[dKey] = [];
        addedKeysByDept[dKey] = new Set();
      }
      if (addedKeysByDept[dKey].has(eKey)) return;
      addedKeysByDept[dKey].add(eKey);
      personnelByDept[dKey].push({
        _id: entry._id,
        nom: entry.nom || '',
        prenom: entry.prenom || '',
        username: entry.username || null,
        poste: entry.poste || '',
        photo: entry.photo || '',
        emailPersonnel: entry.emailPersonnel || ''
      });
    };

    const handledRolePersonnelIds = new Set(excludedPersonnelIds);
    const placedPersonnelIds = new Set();

    // 1. Map all active non-deleted AdminTuningDesk (Bureau d'Ordre) users directly into bureau_ordre
    // (User schema enforces departments: [] and activeDepartment: null for AdminTuningDesk)
    const bureauOrdreDeptId = toId(settings?.bureauOrdreDepartmentId);
    if (bureauOrdreDeptId) {
      (activeUsers || [])
        .filter((u) => u.role === 'AdminTuningDesk')
        .forEach((boUser) => {
          const linkedP =
            (boUser.personnelId && typeof boUser.personnelId === 'object' && !boUser.personnelId.isDeleted
              ? boUser.personnelId
              : uniquePersonnelById.get(toId(boUser.personnelId))) || null;

          if (linkedP) {
            const pId = String(linkedP._id);
            if (!handledRolePersonnelIds.has(pId)) {
              handledRolePersonnelIds.add(pId);
              placedPersonnelIds.add(pId);
              addEntryToDept(bureauOrdreDeptId, {
                _id: linkedP._id,
                nom: linkedP.nom,
                prenom: linkedP.prenom,
                username: boUser.username || null,
                poste: linkedP.poste || "Bureau d'Ordre",
                photo: linkedP.photo || boUser.photo || '',
                emailPersonnel: linkedP.emailPersonnel || boUser.email || ''
              });
            }
          } else {
            addEntryToDept(bureauOrdreDeptId, {
              _id: boUser._id,
              nom: boUser.username,
              prenom: '',
              username: boUser.username || null,
              poste: "Bureau d'Ordre",
              photo: boUser.photo || '',
              emailPersonnel: boUser.email || ''
            });
          }
        });
    }

    // 2. Map remaining live Personnel records to their department
    uniquePersonnel.forEach((p) => {
      const pId = String(p._id);
      if (handledRolePersonnelIds.has(pId)) return;

      const linkedUser = activeUsersByPersonnelId.get(pId)
        || (toId(p.userId) ? activeUsersById.get(toId(p.userId)) : null);
      if (linkedUser?.role === 'Director') return;

      const deptId = toId(p.activeDepartment)
        || (Array.isArray(p.departments) && p.departments.length > 0 ? toId(p.departments[0]) : null)
        || (linkedUser
          ? (toId(linkedUser.activeDepartment)
            || (Array.isArray(linkedUser.departments) && linkedUser.departments.length > 0
              ? toId(linkedUser.departments[0])
              : null))
          : null);

      if (!deptId) return;
      placedPersonnelIds.add(pId);
      const resolvedUsername = linkedUser?.username
        || (p.userId && typeof p.userId === 'object' && p.userId.isActive !== false && p.userId.isDeleted !== true
          ? p.userId.username
          : null)
        || null;
      addEntryToDept(deptId, {
        _id: p._id,
        nom: p.nom,
        prenom: p.prenom,
        username: resolvedUsername,
        poste: p.poste || '',
        photo: p.photo || linkedUser?.photo || '',
        emailPersonnel: p.emailPersonnel || linkedUser?.email || ''
      });
    });

    // 3. Map active department-scoped Users (AdminDepartment / User) not already placed via Personnel
    (activeUsers || []).forEach((u) => {
      if (u.role === 'Director' || u.role === 'AdminTuningDesk' || u.role === 'Admin') return;

      const deptId = toId(u.activeDepartment)
        || (Array.isArray(u.departments) && u.departments.length > 0 ? toId(u.departments[0]) : null);
      if (!deptId) return;

      const linkedP =
        (u.personnelId && typeof u.personnelId === 'object' && !u.personnelId.isDeleted
          ? u.personnelId
          : uniquePersonnelById.get(toId(u.personnelId))) || null;

      if (linkedP) {
        const pId = String(linkedP._id);
        if (handledRolePersonnelIds.has(pId) || placedPersonnelIds.has(pId)) return;
        placedPersonnelIds.add(pId);
        addEntryToDept(deptId, {
          _id: linkedP._id,
          nom: linkedP.nom,
          prenom: linkedP.prenom,
          username: u.username || null,
          poste: linkedP.poste || (u.role === 'AdminDepartment' ? 'Chef de département' : ''),
          photo: linkedP.photo || u.photo || '',
          emailPersonnel: linkedP.emailPersonnel || u.email || ''
        });
      } else {
        addEntryToDept(deptId, {
          _id: u._id,
          nom: u.username,
          prenom: '',
          username: u.username || null,
          poste: u.role === 'AdminDepartment' ? 'Chef de département' : 'Utilisateur',
          photo: u.photo || '',
          emailPersonnel: u.email || ''
        });
      }
    });

    // Separate departments into regalien and operational (excluding director's department from departments list)
    const regalienDepartments = [];
    const operationalDepartments = [];

    (departments || []).forEach((dept) => {
      const id = dept._id.toString();
      if (isBureauDirecteur(id)) {
        return;
      }

      const allDeptPersonnel = personnelByDept[id] || [];
      const totalPersonnel = allDeptPersonnel.length;

      if (isBureauOrdre(id)) {
        regalienDepartments.push({
          _id: dept._id,
          name: dept.name,
          unitType: 'bureau_ordre',
          totalPersonnel,
          personnel: allDeptPersonnel
        });
      } else if (isRH(id)) {
        regalienDepartments.push({
          _id: dept._id,
          name: dept.name,
          unitType: 'rh',
          totalPersonnel,
          personnel: allDeptPersonnel
        });
      } else {
        operationalDepartments.push({
          _id: dept._id,
          name: dept.name,
          unitType: 'service',
          totalPersonnel,
          personnel: allDeptPersonnel
        });
      }
    });

    // Ensure regalien order: bureau_ordre first, rh second
    regalienDepartments.sort((a, b) => {
      if (a.unitType === 'bureau_ordre' && b.unitType !== 'bureau_ordre') return -1;
      if (a.unitType !== 'bureau_ordre' && b.unitType === 'bureau_ordre') return 1;
      return 0;
    });

    res.status(200).json({
      success: true,
      data: {
        administration: {
          name: settings?.nomAdministration || 'الإدارة'
        },
        director,
        regalienDepartments,
        operationalDepartments
      }
    });
  } catch (error) { next(error); }
};

