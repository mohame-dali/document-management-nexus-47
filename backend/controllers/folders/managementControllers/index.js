// Re-export all folder management controllers
const createController = require('./createController');
const updateController = require('./updateController');
const deleteController = require('./deleteController');
const statusController = require('./statusController');

module.exports = {
  // Create operation
  createFolder: createController.createFolder,
  
  // Update operations
  updateFolder: updateController.updateFolder,
  moveFolder: updateController.moveFolder,
  
  // Delete operation
  deleteFolder: deleteController.deleteFolder,
  
  // Status management
  updateFolderStatus: statusController.updateFolderStatus
};
