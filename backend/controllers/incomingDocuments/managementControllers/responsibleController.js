
const IncomingDocument = require('../../../models/IncomingDocument');
const User = require('../../../models/User');
const ResponsibleNotification = require('../../../models/ResponsibleNotification');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Assign responsible user to document
// @route   PUT /api/incoming-documents/:id/responsible
// @access  Private/AdminDepartment
exports.assignResponsible = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return next(
        new ErrorResponse('Please provide a user ID', 400)
      );
    }
    
    // Check if document exists
    let document = await IncomingDocument.findById(req.params.id);
    
    if (!document) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }
    
    // Check if document is assigned to the active department
    if (!req.user.activeDepartment) {
      return next(new ErrorResponse('No active department selected', 403));
    }
    
    const isAssigned = document.assignedTo.some(
      dept => dept.id.toString() === req.user.activeDepartment._id.toString()
    );
    
    if (!isAssigned) {
      return next(
        new ErrorResponse(`Document is not assigned to your department`, 403)
      );
    }
    
    // Check if user exists and belongs to the active department
    const user = await User.findById(userId);
    
    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${userId}`, 404)
      );
    }
    
    const hasUserAccess = user.departments.some(
      dept => dept.toString() === req.user.activeDepartment._id.toString()
    );
    
    if (!hasUserAccess) {
      return next(
        new ErrorResponse(`User does not belong to your department`, 403)
      );
    }
    
    // Update document
    document = await IncomingDocument.findByIdAndUpdate(
      req.params.id,
      { responsibleUser: userId },
      { new: true, runValidators: true }
    ).populate('assignedTo.id')
      .populate('responsibleUser', 'username photo')
      .populate('answer')
      .populate('folder');

    // Create responsible notification
    try {
      await ResponsibleNotification.create({
        documentId: req.params.id,
        assignedUserId: userId,
        assignedBy: req.user.id
      });
    } catch (notificationError) {
      console.error('Error creating responsible notification:', notificationError);
      // Don't fail the main operation if notification creation fails
    }
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (err) {
    next(err);
  }
};
