
// Main entry point that re-exports all incoming document controllers
const listControllers = require('./listControllers');
const detailControllers = require('./detailControllers');
const managementControllers = require('./managementControllers');
const searchControllers = require('./searchControllers');

module.exports = {
  // List controllers
  getIncomingDocuments: listControllers.getIncomingDocuments,
  
  // Detail controllers 
  getIncomingDocument: detailControllers.getIncomingDocument,
  
  // Management controllers
  createIncomingDocument: managementControllers.createIncomingDocument,
  updateIncomingDocument: managementControllers.updateIncomingDocument,
  deleteIncomingDocument: managementControllers.deleteIncomingDocument,
  assignResponsible: managementControllers.assignResponsible,
  addAnswer: managementControllers.addAnswer,
  assignToFolder: managementControllers.assignToFolder,
  
  // Search controllers
  searchIncomingDocuments: searchControllers.searchIncomingDocuments
};
