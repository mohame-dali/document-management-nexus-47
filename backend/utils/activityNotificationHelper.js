
const ActivityNotification = require('../models/ActivityNotification');
const User = require('../models/User');

// Create notifications for activity dates
const createActivityNotifications = async (documentId, activity, dateActivity, assignedTo) => {
  if (!activity || !dateActivity) return;

  // Get document details for enhanced notification message
  const IncomingDocument = require('../models/IncomingDocument');
  const document = await IncomingDocument.findById(documentId).select('serialNumber subject year');
  if (!document) return;

  const documentInfo = `الوثيقة رقم ${document.serialNumber}/${document.year} - ${document.subject}`;

  // Get all users from assigned departments
  const departmentIds = assignedTo.map(dept => dept.id);
  const users = await User.find({ 
    'departments': { $in: departmentIds },
    isActive: true 
  }).select('_id');

  const recipients = users.map(user => ({ userId: user._id }));
  if (recipients.length === 0) return;

  const activityDate = new Date(dateActivity);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const notifications = [];

  // Calculate different notification types
  const daysDiff = Math.ceil((activityDate - today) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Today
    notifications.push({
      documentId,
      activity,
      dateActivity: activityDate,
      notificationType: 'today',
      recipients,
      message: `النشاط "${activity}" مجدول لليوم - ${documentInfo}`
    });
  } else if (daysDiff === 1) {
    // Tomorrow
    notifications.push({
      documentId,
      activity,
      dateActivity: activityDate,
      notificationType: 'tomorrow',
      recipients,
      message: `النشاط "${activity}" مجدول لغداً - ${documentInfo}`
    });
  } else if (daysDiff === 2) {
    // 2 days ahead
    notifications.push({
      documentId,
      activity,
      dateActivity: activityDate,
      notificationType: '2days',
      recipients,
      message: `النشاط "${activity}" مجدول خلال يومين - ${documentInfo}`
    });
  } else if (daysDiff === 3) {
    // 3 days ahead
    notifications.push({
      documentId,
      activity,
      dateActivity: activityDate,
      notificationType: '3days',
      recipients,
      message: `النشاط "${activity}" مجدول خلال 3 أيام - ${documentInfo}`
    });
  } else if (daysDiff < 0) {
    // Overdue
    notifications.push({
      documentId,
      activity,
      dateActivity: activityDate,
      notificationType: 'overdue',
      recipients,
      message: `النشاط "${activity}" متأخر بـ ${Math.abs(daysDiff)} يوم - ${documentInfo}`
    });
  }

  if (notifications.length > 0) {
    await ActivityNotification.insertMany(notifications);
  }
};

// Update notifications when activity or date changes
const updateActivityNotifications = async (documentId, activity, dateActivity, assignedTo) => {
  // First, deactivate existing notifications for this document
  await ActivityNotification.updateMany(
    { documentId },
    { isActive: false }
  );

  // Create new notifications if activity and date are provided
  if (activity && dateActivity) {
    await createActivityNotifications(documentId, activity, dateActivity, assignedTo);
  }
};

// Get notifications for a user
const getUserActivityNotifications = async (userId) => {
  return await ActivityNotification.find({
    'recipients': {
      $elemMatch: {
        'userId': userId,
        'read': false
      }
    },
    isActive: true
  }).populate('documentId', 'serialNumber subject year correspondenceNumber arrivalDate')
    .sort({ createdAt: -1 });
};

// Mark notification as read
const markNotificationAsRead = async (notificationId, userId) => {
  return await ActivityNotification.updateOne(
    { 
      _id: notificationId,
      'recipients.userId': userId 
    },
    { 
      $set: { 
        'recipients.$.read': true,
        'recipients.$.readAt': new Date()
      }
    }
  );
};

// Daily notification check (to be run via cron job)
const checkDailyNotifications = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const twoDaysAhead = new Date(today);
  twoDaysAhead.setDate(twoDaysAhead.getDate() + 2);
  
  const threeDaysAhead = new Date(today);
  threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);

  // Find documents with activities due today, tomorrow, in 2 days, or in 3 days
  const IncomingDocument = require('../models/IncomingDocument');
  
  const documentsToday = await IncomingDocument.find({
    activity: { $ne: null },
    dateActivity: {
      $gte: today,
      $lt: tomorrow
    }
  }).populate('assignedTo.id');

  const documentsTomorrow = await IncomingDocument.find({
    activity: { $ne: null },
    dateActivity: {
      $gte: tomorrow,
      $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
    }
  }).populate('assignedTo.id');

  const documentsTwoDays = await IncomingDocument.find({
    activity: { $ne: null },
    dateActivity: {
      $gte: twoDaysAhead,
      $lt: new Date(twoDaysAhead.getTime() + 24 * 60 * 60 * 1000)
    }
  }).populate('assignedTo.id');

  const documentsThreeDays = await IncomingDocument.find({
    activity: { $ne: null },
    dateActivity: {
      $gte: threeDaysAhead,
      $lt: new Date(threeDaysAhead.getTime() + 24 * 60 * 60 * 1000)
    }
  }).populate('assignedTo.id');

  // Create notifications for each category
  for (const doc of documentsToday) {
    await createActivityNotifications(doc._id, doc.activity, doc.dateActivity, doc.assignedTo);
  }

  for (const doc of documentsTomorrow) {
    await createActivityNotifications(doc._id, doc.activity, doc.dateActivity, doc.assignedTo);
  }

  for (const doc of documentsTwoDays) {
    await createActivityNotifications(doc._id, doc.activity, doc.dateActivity, doc.assignedTo);
  }

  for (const doc of documentsThreeDays) {
    await createActivityNotifications(doc._id, doc.activity, doc.dateActivity, doc.assignedTo);
  }
};

module.exports = {
  createActivityNotifications,
  updateActivityNotifications,
  getUserActivityNotifications,
  markNotificationAsRead,
  checkDailyNotifications
};
