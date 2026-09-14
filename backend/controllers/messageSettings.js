const Message = require('../models/Message');
const ErrorResponse = require('../utils/errorResponse');
const fs = require('fs');
const path = require('path');

// Delete messages by period
exports.deleteMessagesByPeriod = async (req, res) => {
  try {
    const { period, unit } = req.body; // period: number, unit: 'days', 'months', 'years'
    
    if (!period || !unit) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد الفترة والوحدة'
      });
    }

    // Calculate the date threshold
    const now = new Date();
    let thresholdDate;
    
    switch (unit) {
      case 'days':
        thresholdDate = new Date(now.getTime() - (period * 24 * 60 * 60 * 1000));
        break;
      case 'months':
        thresholdDate = new Date(now);
        thresholdDate.setMonth(thresholdDate.getMonth() - period);
        break;
      case 'years':
        thresholdDate = new Date(now);
        thresholdDate.setFullYear(thresholdDate.getFullYear() - period);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'وحدة زمنية غير صالحة'
        });
    }

    // Find messages to delete and their attachments
    const messagesToDelete = await Message.find({
      createdAt: { $lt: thresholdDate }
    });

    let deletedAttachments = 0;
    
    // Delete attachments files
    for (const message of messagesToDelete) {
      if (message.attachments && message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          try {
            if (attachment.path && fs.existsSync(attachment.path)) {
              fs.unlinkSync(attachment.path);
              deletedAttachments++;
            }
          } catch (error) {
            console.error('خطأ في حذف المرفق:', error);
          }
        }
      }
    }

    // Delete messages from database
    const deleteResult = await Message.deleteMany({
      createdAt: { $lt: thresholdDate }
    });

    res.status(200).json({
      success: true,
      data: {
        deletedCount: deleteResult.deletedCount,
        deletedAttachments,
        thresholdDate,
        period,
        unit
      },
      message: `تم حذف ${deleteResult.deletedCount} رسالة و ${deletedAttachments} مرفق`
    });

  } catch (error) {
    console.error('خطأ في حذف الرسائل:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
};

// Set retention policy (for future automatic deletion)
exports.setRetentionPolicy = async (req, res) => {
  try {
    const { enabled, period, unit } = req.body;
    
    // This would typically be stored in a settings table or config file
    // For now, we'll create a simple JSON file to store the policy
    const policyPath = path.join(__dirname, '..', 'config', 'retention-policy.json');
    
    const policy = {
      enabled: Boolean(enabled),
      period: parseInt(period),
      unit,
      updatedAt: new Date(),
      updatedBy: req.user.id
    };

    // Ensure config directory exists
    const configDir = path.dirname(policyPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2));

    res.status(200).json({
      success: true,
      data: policy,
      message: 'تم حفظ سياسة الاحتفاظ بالرسائل'
    });

  } catch (error) {
    console.error('خطأ في حفظ سياسة الاحتفاظ:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
};

// Get retention policy
exports.getRetentionPolicy = async (req, res) => {
  try {
    const policyPath = path.join(__dirname, '..', 'config', 'retention-policy.json');
    
    let policy = {
      enabled: false,
      period: 6,
      unit: 'months'
    };

    if (fs.existsSync(policyPath)) {
      const policyData = fs.readFileSync(policyPath, 'utf8');
      policy = JSON.parse(policyData);
    }

    res.status(200).json({
      success: true,
      data: policy
    });

  } catch (error) {
    console.error('خطأ في قراءة سياسة الاحتفاظ:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
};

// Get messages statistics
exports.getMessagesStats = async (req, res) => {
  try {
    const totalMessages = await Message.countDocuments();
    
    // Count messages by age
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    const [
      lastMonth,
      lastThreeMonths,
      lastSixMonths,
      lastYear,
      olderThanYear
    ] = await Promise.all([
      Message.countDocuments({ createdAt: { $gte: oneMonthAgo } }),
      Message.countDocuments({ createdAt: { $gte: threeMonthsAgo, $lt: oneMonthAgo } }),
      Message.countDocuments({ createdAt: { $gte: sixMonthsAgo, $lt: threeMonthsAgo } }),
      Message.countDocuments({ createdAt: { $gte: oneYearAgo, $lt: sixMonthsAgo } }),
      Message.countDocuments({ createdAt: { $lt: oneYearAgo } })
    ]);

    // Count total attachments
    const messagesWithAttachments = await Message.find(
      { "attachments.0": { $exists: true } },
      { attachments: 1 }
    );
    
    const totalAttachments = messagesWithAttachments.reduce((total, msg) => {
      return total + (msg.attachments ? msg.attachments.length : 0);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        totalMessages,
        totalAttachments,
        messagesByAge: {
          lastMonth,
          lastThreeMonths,
          lastSixMonths,
          lastYear,
          olderThanYear
        }
      }
    });

  } catch (error) {
    console.error('خطأ في احصائيات الرسائل:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم'
    });
  }
};