
// Main entry point that re-exports all message controllers
const listControllers = require('./listControllers');
const detailControllers = require('./detailControllers');
const managementControllers = require('./managementControllers');
const countControllers = require('./countControllers');

module.exports = {
  // List controllers
  getMessages: listControllers.getMessages,
  getInboxMessages: listControllers.getInboxMessages,
  getSentMessages: listControllers.getSentMessages,
  
  // Detail controllers
  getMessage: detailControllers.getMessage,
  
  // Management controllers
  sendMessage: managementControllers.sendMessage,
  deleteMessage: managementControllers.deleteMessage,
  markAsRead: managementControllers.markAsRead,
  markAllAsRead: managementControllers.markAllAsRead,
  
  // Count controllers
  getUnreadCount: countControllers.getUnreadCount
};

