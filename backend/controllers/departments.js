
const Department = require('../models/Department');
const User = require('../models/User');
const Personnel = require('../models/Personnel');
const Folder = require('../models/Folder');
const IncomingDocument = require('../models/IncomingDocument');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
exports.getDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('createdBy', 'username');
    
    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }
    
    res.status(200).json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new department
// @route   POST /api/departments
// @access  Private/Admin
exports.createDepartment = async (req, res, next) => {
  try {
    // Add created by field
    req.body.createdBy = req.user.id;
    
    const department = await Department.create(req.body);
    
    res.status(201).json({
      success: true,
      data: department
    });
  } catch (err) {
    // Handle duplicate name
    if (err.code === 11000) {
      return next(new ErrorResponse('Department name already exists', 400));
    }
    next(err);
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
exports.updateDepartment = async (req, res, next) => {
  try {
    let department = await Department.findById(req.params.id);
    
    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Update department
    department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: department
    });
  } catch (err) {
    // Handle duplicate name
    if (err.code === 11000) {
      return next(new ErrorResponse('Department name already exists', 400));
    }
    next(err);
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
exports.deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }
    
    // 1. Vérifier s'il y a des Personnel rattachés à ce département (actif ou secondaire)
    const personnelCount = await Personnel.countDocuments({
      $or: [
        { activeDepartment: department._id },
        { departments: department._id }
      ]
    });

    // 2. Vérifier s'il y a des Folder avec ce department ID
    const foldersCount = await Folder.countDocuments({
      department: department._id
    });

    // 3. Vérifier s'il y a des IncomingDocument avec assignedTo.id = cet ID
    const documentsCount = await IncomingDocument.countDocuments({
      'assignedTo.id': department._id
    });

    // 4. Vérifier s'il y a des comptes User assignés à ce département
    const usersCount = await User.countDocuments({
      $or: [
        { departments: department._id },
        { activeDepartment: department._id }
      ]
    });

    // Si l'une de ces entités existe (count > 0), bloquer la suppression
    if (personnelCount > 0 || foldersCount > 0 || documentsCount > 0 || usersCount > 0) {
      const details = [];
      if (personnelCount > 0) details.push(`${personnelCount} agent(s)`);
      if (foldersCount > 0) details.push(`${foldersCount} dossier(s)`);
      if (documentsCount > 0) details.push(`${documentsCount} courrier(s)`);
      if (usersCount > 0) details.push(`${usersCount} utilisateur(s)`);

      return next(
        new ErrorResponse(
          `Impossible de supprimer ce département. Il contient encore ${details.join(' et ')}. Veuillez d'abord réaffecter ces éléments.`,
          400
        )
      );
    }
    
    await department.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get users in a department
// @route   GET /api/departments/:id/users
// @access  Private/Admin/AdminDepartment
exports.getDepartmentUsers = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return next(
        new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if AdminDepartment has access to this department
    if (req.user.role === 'AdminDepartment') {
      const hasDepartment = req.user.departments.some(
        dept => dept._id.toString() === req.params.id
      );
      
      if (!hasDepartment) {
        return next(
          new ErrorResponse(`Not authorized to access this department`, 403)
        );
      }
    }
    
    // Get users in this department
    const users = await User.find({ departments: department._id })
      .populate('departments')
      .populate('activeDepartment')
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};
