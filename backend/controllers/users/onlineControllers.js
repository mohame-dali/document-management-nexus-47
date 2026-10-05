const User = require('../../models/User');

exports.getOnlineUsers = async (req, res) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const onlineUsers = await User.find({
      lastSeen: { $gte: twoMinutesAgo },
      isActive: true,
      isDeleted: { $ne: true }
    }).select('_id username nom prenom');

    res.status(200).json({
      success: true,
      data: onlineUsers.map(u => u._id.toString())
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين المتصلين'
    });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      lastSeen: new Date()
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
