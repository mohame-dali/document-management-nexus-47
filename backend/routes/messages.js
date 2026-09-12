
const express = require('express');
const path = require('path');
const fs = require('fs');
const { 
  getMessages, 
  getInboxMessages,
  getSentMessages,
  getMessage, 
  sendMessage, 
  deleteMessage, 
  markAsRead,
  markAllAsRead,
  getUnreadCount
} = require('../controllers/messages');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// Collection & utility routes (Must be declared BEFORE /:id parameter)
router.get('/', getMessages);
router.get('/unread/count', getUnreadCount);
router.get('/inbox', getInboxMessages);
router.get('/sent', getSentMessages);
router.put('/read-all', markAllAsRead);

// Route to serve attachment files
router.get('/attachments/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'uploads', 'attachments', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'الملف غير موجود'
      });
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          error: 'خطأ في إرسال الملف'
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

// Individual message operations
router.get('/:id', getMessage);
router.post('/', upload.array('attachments'), sendMessage);
router.delete('/:id', deleteMessage);
router.put('/:id/read', markAsRead);

module.exports = router;

