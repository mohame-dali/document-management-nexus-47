
const jwt = require('jsonwebtoken');

module.exports = (io) => {
  // Store user socket connections
  const userSockets = new Map();
  
  // Socket.IO authentication middleware
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        socket.disconnect(true);
        return next(new Error('Authentication error: Token required'));
      }
      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        socket.disconnect(true);
        return next(new Error('Authentication error: Server configuration error'));
      }
      const decoded = jwt.verify(token, secret);
      socket.userId = decoded.id || decoded._id;
      if (!socket.userId) {
        socket.disconnect(true);
        return next(new Error('Authentication error: Invalid token'));
      }
      next();
    } catch (err) {
      socket.disconnect(true);
      return next(new Error('Authentication error: ' + (err.message || 'Invalid token')));
    }
  });

  io.on('connection', (socket) => {
    // Automatically register connection using authenticated socket.userId
    if (socket.userId) {
      userSockets.set(String(socket.userId), socket.id);
    }

    // Handle user connection: use authenticated socket.userId instead of trusting client parameter
    socket.on('user_connected', () => {
      if (socket.userId) {
        userSockets.set(String(socket.userId), socket.id);
      }
    });
    
    // Handle new message
    socket.on('new_message', (data) => {
      // Notify recipients
      if (data.recipients && Array.isArray(data.recipients)) {
        data.recipients.forEach((recipientId) => {
          const recipientSocket = userSockets.get(String(recipientId));
          if (recipientSocket) {
            io.to(recipientSocket).emit('message_received', data);
          }
        });
      }
    });
    
    // Handle message read
    socket.on('message_read', (data) => {
      const senderSocket = userSockets.get(String(data.senderId));
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
