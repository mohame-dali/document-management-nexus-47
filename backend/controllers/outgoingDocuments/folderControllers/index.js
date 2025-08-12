
// Re-export all folder-related controllers
const assignmentController = require('./assignmentController');

module.exports = {
  assignToFolder: assignmentController.assignToFolder
};
