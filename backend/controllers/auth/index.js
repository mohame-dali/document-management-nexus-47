
const loginController = require('./loginController');
const userController = require('./userController');
const passwordController = require('./passwordController');
const departmentController = require('./departmentController');
const adminController = require('./adminController');

// Export all controllers
module.exports = {
  login: loginController.login,
  getMe: userController.getMe,
  logout: userController.logout,
  updatePassword: passwordController.updatePassword,
  switchDepartment: departmentController.switchDepartment,
  testAdminCredentials: adminController.testAdminCredentials,
  resetAdminPassword: adminController.resetAdminPassword
};
