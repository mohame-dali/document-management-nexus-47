
module.exports = (io) => {
  // Store user socket connections
  const userSockets = new Map();
  
  io.on('connection', (socket) => {
    // Handle user connection
    socket.on('user_connected', (userId) => {
      userSockets.set(userId, socket.id);
    });
    
    // Handle new message
    socket.on('new_message', (data) => {
      // Notify recipients
      if (data.recipients && Array.isArray(data.recipients)) {
        data.recipients.forEach((recipientId) => {
          const recipientSocket = userSockets.get(recipientId);
          if (recipientSocket) {
            io.to(recipientSocket).emit('message_received', data);
          }
        });
      }
    });
    
    // Handle message read
    socket.on('message_read', (data) => {
      const senderSocket = userSockets.get(data.senderId);
      if (senderSocket) {
        io.to(senderSocket).emit('message_status_updated', {
          messageId: data.messageId,
          readBy: data.readerId
        });
      }
    });
    
    // Handle user disconnection
    socket.on('disconnect', () => {
      // Remove user from userSockets
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
    });
  });
};
