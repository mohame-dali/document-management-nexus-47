const Department = require('../models/Department');
const Personnel = require('../models/Personnel');
const OrganizationSettings = require('../models/OrganizationSettings');

exports.getOrganizationChart = async (req, res, next) => {
  try {
    const settings = await OrganizationSettings.findOne();
    const departments = await Department.find({ isActive: true })
      .select('name description').lean();
    const personnel = await Personnel.find({ statut: 'actif' })
      .select('nom prenom poste photo activeDepartment')
      .populate('activeDepartment', 'name').lean();

    const isBureauDirecteur = (id) => settings?.bureauDirecteurDepartmentId?.toString() === id?.toString();
    const isBureauOrdre = (id) => settings?.bureauOrdreDepartmentId?.toString() === id?.toString();
    const isRH = (id) => settings?.rhDepartmentId?.toString() === id?.toString();

    const personnelByDept = {};
    personnel.forEach((p) => {
      const deptId = p.activeDepartment?._id?.toString();
      if (!deptId) return;
      if (!personnelByDept[deptId]) personnelByDept[deptId] = [];
      personnelByDept[deptId].push({
        _id: p._id, nom: p.nom, prenom: p.prenom, poste: p.poste, photo: p.photo || ''
      });
    });

    const departmentsData = departments.map((dept) => {
      const id = dept._id.toString();
      let unitType = null;
      if (isBureauDirecteur(id)) unitType = 'bureau_directeur';
      else if (isBureauOrdre(id)) unitType = 'bureau_ordre';
      else if (isRH(id)) unitType = 'rh';

      return {
        _id: dept._id, name: dept.name, description: dept.description || '',
        isFunctional: unitType !== null, unitType,
        personnel: personnelByDept[id] || []
      };
    });

    const order = { bureau_directeur: 0, bureau_ordre: 1, rh: 2 };
    departmentsData.sort((a, b) => (order[a.unitType] ?? 99) - (order[b.unitType] ?? 99));

    res.status(200).json({
      success: true,
      data: {
        administration: {
          name: settings?.nomAdministration || 'Administration',
          departments: departmentsData
        }
      }
    });
  } catch (error) { next(error); }
};
