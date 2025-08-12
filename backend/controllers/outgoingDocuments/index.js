
// Main entry point that re-exports all outgoing document controllers
const listControllers = require('./listControllers');
const detailControllers = require('./detailControllers');
const managementControllers = require('./managementControllers');
const folderControllers = require('./folderControllers');
const searchControllers = require('./searchControllers');

module.exports = {
  // List controllers
  getOutgoingDocuments: listControllers.getOutgoingDocuments,
  
  // Detail controllers
  getOutgoingDocument: detailControllers.getOutgoingDocument,
  
  // Management controllers
  createOutgoingDocument: managementControllers.createOutgoingDocument,
  updateOutgoingDocument: managementControllers.updateOutgoingDocument,
  deleteOutgoingDocument: managementControllers.deleteOutgoingDocument,
  
  // Folder controllers
  assignToFolder: folderControllers.assignToFolder,
  
  // Search controllers
  searchOutgoingDocuments: searchControllers.searchOutgoingDocuments
};
