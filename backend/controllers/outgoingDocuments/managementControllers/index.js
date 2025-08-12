
// Main entry point that re-exports all outgoing document management controllers
const documentCreateController = require('./documentCreateController');
const documentUpdateController = require('./documentUpdateController');
const documentDeleteController = require('./documentDeleteController');

module.exports = {
  // Document CRUD
  createOutgoingDocument: documentCreateController.createOutgoingDocument,
  updateOutgoingDocument: documentUpdateController.updateOutgoingDocument,
  deleteOutgoingDocument: documentDeleteController.deleteOutgoingDocument
};
