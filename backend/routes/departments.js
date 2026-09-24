
const express = require('express');
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentUsers
} = require('../controllers/departments');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Department routes
router.route('/')
  .get(getDepartments)
  .post(authorize('Admin'), createDepartment);

// Specific department routes
router.route('/:id')
  .get(getDepartment)
  .put(authorize('Admin'), updateDepartment)
  .delete(authorize('Admin'), deleteDepartment);

// Get users of a department
router.get('/:id/users', authorize('Director', 'Admin', 'AdminDepartment'), getDepartmentUsers);

module.exports = router;
