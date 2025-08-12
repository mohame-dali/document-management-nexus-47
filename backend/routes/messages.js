
const express = require('express');
const path = require('path');
const { 
  getMessages, 
  getMessage, 
  sendMessage, 
  deleteMessage, 
  markAsRead,
  getUnreadCount
} = require('../controllers/messages');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Protect all routes - but allow all authenticated users (no role restrictions)
router.use(protect);

// Routes - accessible to all authenticated users
router.get('/', getMessages);
router.get('/unread/count', getUnreadCount);

// Route to serve attachment files
router.get('/attachments/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'uploads', 'attachments', filename);
    
    console.log('طلب تحميل مرفق:', filename);
    console.log('مسار الملف:', filePath);
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      console.error('الملف غير موجود:', filePath);
      return res.status(404).json({
        success: false,
        error: 'الملف غير موجود'
      });
    }
    
    // Send the file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('خطأ في إرسال الملف:', err);
        res.status(500).json({
          success: false,
          error: 'خطأ في إرسال الملف'
        });
      }
    });
  } catch (error) {
    console.error('خطأ في تحميل المرفق:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
});

// Individual message routes - accessible to all authenticated users
router.get('/:id', getMessage);
router.post('/', upload.array('attachments'), sendMessage);
router.delete('/:id', deleteMessage);
router.put('/:id/read', markAsRead);

module.exports = router;
