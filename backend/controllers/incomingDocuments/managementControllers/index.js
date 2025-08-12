
// Main entry point that re-exports all incoming document management controllers
const documentCreateController = require('./documentCreateController');
const documentUpdateController = require('./documentUpdateController');
const documentDeleteController = require('./documentDeleteController');
const responsibleController = require('./responsibleController');
const answerController = require('./answerController');
const folderController = require('./folderController');

module.exports = {
  // Document CRUD
  createIncomingDocument: documentCreateController.createIncomingDocument,
  updateIncomingDocument: documentUpdateController.updateIncomingDocument,
  deleteIncomingDocument: documentDeleteController.deleteIncomingDocument,
  
  // Assignment operations
  assignResponsible: responsibleController.assignResponsible,
  addAnswer: answerController.addAnswer,
  assignToFolder: folderController.assignToFolder
};
