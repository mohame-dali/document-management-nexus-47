
// Main entry point that re-exports all user controllers
const listControllers = require('./listControllers');
const detailControllers = require('./detailControllers');
const managementControllers = require('./managementControllers');
const accountControllers = require('./accountControllers');
const photoControllers = require('./photoControllers');

module.exports = {
  // List controllers
  getUsers: listControllers.getUsers,
  
  // Detail controllers
  getUser: detailControllers.getUser,
  
  // Management controllers
  createUser: managementControllers.createUser,
  updateUser: managementControllers.updateUser,
  deleteUser: managementControllers.deleteUser,
  
  // Account controllers
  deactivateUser: accountControllers.deactivateUser,
  resetPassword: accountControllers.resetPassword,
  
  // Photo controllers
  uploadPhoto: photoControllers.uploadPhoto
};
