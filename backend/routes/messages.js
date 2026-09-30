
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
    const { filename } = req.params;
    const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'attachments');

    // Sécurité : nettoyer le nom pour éviter path traversal
    const safeName = path.basename(filename);
    let filePath = path.join(UPLOAD_DIR, safeName);

    // Cas 1 : fichier trouvé directement (nom réel Multer)
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    // Cas 2 : fallback — chercher par suffixe (ancien message avec originalName)
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      const matching = files.find(f => 
        f === safeName ||                    // exact
        f.endsWith(`-${safeName}`) ||        // msg-xxx-logo.webp
        f.endsWith(`_${safeName}`) ||        // msg-xxx_logo.webp
        f.toLowerCase().includes(safeName.toLowerCase()) // contient le nom
      );

      if (matching) {
        filePath = path.join(UPLOAD_DIR, matching);
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        }
      }
    }

    return res.status(404).json({
      success: false,
      error: 'الملف غير موجود'
    });
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في التحميل'
    });
  }
});

// Individual message operations
router.get('/:id', getMessage);
router.post('/', upload.array('attachments'), sendMessage);
router.delete('/:id', deleteMessage);
router.put('/:id/read', markAsRead);

module.exports = router;

