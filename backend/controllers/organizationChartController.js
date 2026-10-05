const Department = require('../models/Department');
const Personnel = require('../models/Personnel');
const OrganizationSettings = require('../models/OrganizationSettings');
const User = require('../models/User');

exports.getOrganizationChart = async (req, res, next) => {
  try {
    const settings = await OrganizationSettings.findOne();
    const departments = await Department.find({ isActive: true })
      .select('name description').lean();

    const personnel = await Personnel.find({
      statut: { $in: ['actif', 'en_attente'] },
      isDeleted: { $ne: true }
    })
      .select('nom prenom poste photo cin activeDepartment departments')
      .populate('activeDepartment', 'name').lean();

    // Deduplicate by cin or nom+prenom
    const seen = new Set();
    const uniquePersonnel = personnel.filter((p) => {
      const key = p.cin && p.cin.trim() !== ''
        ? p.cin.trim()
        : `${p.nom || ''}_${p.prenom || ''}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const isBureauDirecteur = (id) => settings?.bureauDirecteurDepartmentId?.toString() === id?.toString();
    const isBureauOrdre = (id) => settings?.bureauOrdreDepartmentId?.toString() === id?.toString();
    const isRH = (id) => settings?.rhDepartmentId?.toString() === id?.toString();

    // Extract Director
    let director = null;
    const directorDeptId = settings?.bureauDirecteurDepartmentId?.toString();
    if (directorDeptId) {
      const directorPersonnel = uniquePersonnel.find((p) => {
        const deptId = p.activeDepartment?._id?.toString()
          || p.activeDepartment?.toString()
          || (p.departments && p.departments[0]?.toString());
        return deptId === directorDeptId;
      });
      if (directorPersonnel) {
        director = {
          _id: directorPersonnel._id,
          nom: directorPersonnel.nom,
          prenom: directorPersonnel.prenom,
          poste: directorPersonnel.poste || 'Directeur',
          photo: directorPersonnel.photo || '',
          cin: directorPersonnel.cin || ''
        };
      }
    }

    if (!director) {
      const directorUser = await User.findOne({ role: 'Director', isDeleted: { $ne: true } })
        .populate('personnelId').lean();
      if (directorUser) {
        if (directorUser.personnelId) {
          director = {
            _id: directorUser.personnelId._id,
            nom: directorUser.personnelId.nom,
            prenom: directorUser.personnelId.prenom,
            poste: directorUser.personnelId.poste || 'Directeur',
            photo: directorUser.personnelId.photo || directorUser.photo || '',
            cin: directorUser.personnelId.cin || ''
          };
        } else {
          director = {
            _id: directorUser._id,
            nom: directorUser.username,
            prenom: '',
            poste: 'Directeur',
            photo: directorUser.photo || '',
            cin: ''
          };
        }
      }
    }

    // Map personnel by department (excluding Director's department if director is assigned there)
    const personnelByDept = {};
    uniquePersonnel.forEach((p) => {
      const deptId = p.activeDepartment?._id?.toString()
        || p.activeDepartment?.toString()
        || (p.departments && p.departments[0]?.toString());
      if (!deptId) return;
      if (!personnelByDept[deptId]) personnelByDept[deptId] = [];
      personnelByDept[deptId].push({
        _id: p._id,
        nom: p.nom,
        prenom: p.prenom,
        poste: p.poste || '',
        photo: p.photo || '',
        cin: p.cin || ''
      });
    });

    // Separate departments into regalien and operational (excluding director's department from departments list)
    const regalienDepartments = [];
    const operationalDepartments = [];

    departments.forEach((dept) => {
      const id = dept._id.toString();
      // Exclude director's department as it is part of Niveau 1 (Director)
      if (isBureauDirecteur(id)) {
        return;
      }

      const allDeptPersonnel = personnelByDept[id] || [];
      const totalPersonnel = allDeptPersonnel.length;
      const deptPersonnelSlice = allDeptPersonnel.slice(0, 10);

      if (isBureauOrdre(id)) {
        regalienDepartments.push({
          _id: dept._id,
          name: dept.name,
          unitType: 'bureau_ordre',
          totalPersonnel,
          personnel: deptPersonnelSlice
        });
      } else if (isRH(id)) {
        regalienDepartments.push({
          _id: dept._id,
          name: dept.name,
          unitType: 'rh',
          totalPersonnel,
          personnel: deptPersonnelSlice
        });
      } else {
        operationalDepartments.push({
          _id: dept._id,
          name: dept.name,
          unitType: 'service',
          totalPersonnel,
          personnel: deptPersonnelSlice
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
          name: settings?.nomAdministration || 'الإدارة',
        },
        director,
        regalienDepartments,
        operationalDepartments
      }
    });
  } catch (error) { next(error); }
};

