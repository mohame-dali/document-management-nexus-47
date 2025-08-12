
// Main entry point that re-exports all folder controllers
const listControllers = require('./listControllers');
const detailControllers = require('./detailControllers');
const managementControllers = require('./managementControllers');
const documentControllers = require('./documentControllers');

module.exports = {
  // List controllers
  getFolders: listControllers.getFolders,
  getRootFolders: listControllers.getRootFolders,
  getSubFolders: listControllers.getSubFolders,
  
  // Detail controllers
  getFolder: detailControllers.getFolder,
  
  // Management controllers
  createFolder: managementControllers.createFolder,
  updateFolder: managementControllers.updateFolder,
  deleteFolder: managementControllers.deleteFolder,
  updateFolderStatus: managementControllers.updateFolderStatus,
  
  // Document controllers
  getFolderDocuments: documentControllers.getFolderDocuments
};
