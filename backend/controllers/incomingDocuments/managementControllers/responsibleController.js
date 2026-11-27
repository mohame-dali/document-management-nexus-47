
const mongoose = require('mongoose');
const IncomingDocument = require('../../../models/IncomingDocument');
const User = require('../../../models/User');
const ResponsibleNotification = require('../../../models/ResponsibleNotification');
const ErrorResponse = require('../../../utils/errorResponse');

function extractId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (value.id) return extractId(value.id);
  return typeof value.toString === 'function' ? value.toString() : '';
}

// @desc    Assign responsible user to document
// @route   PUT /api/incoming-documents/:id/responsible
// @access  Private/AdminDepartment/Admin
exports.assignResponsible = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return next(
        new ErrorResponse('Please provide a user ID', 400)
      );
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return next(new ErrorResponse('Invalid identifier format', 400));
    }
    
    // Check if document exists
    let document = await IncomingDocument.findById(req.params.id);
    
    if (!document || document.isDeleted) {
      return next(
        new ErrorResponse(`Document not found with id of ${req.params.id}`, 404)
      );
    }

    const activeDeptId = extractId(req.user.activeDepartment);
    const docAssignedDeptIds = Array.isArray(document.assignedTo)
      ? document.assignedTo.map((dept) => extractId(dept.id || dept)).filter(Boolean)
      : [];

    // Department managers can only assign on documents assigned to their active department
    if (req.user.role !== 'Admin') {
      if (!activeDeptId) {
        return next(new ErrorResponse('No active department selected', 403));
      }

      if (!docAssignedDeptIds.includes(activeDeptId)) {
        return next(
          new ErrorResponse('Document is not assigned to your department', 403)
        );
      }
    }
    
    // Check if target user exists, is active, and is eligible for assignment
    const user = await User.findById(userId);
    
    if (!user || user.isDeleted || user.isActive === false) {
      return next(
        new ErrorResponse(`User not found with id of ${userId}`, 404)
      );
    }

    if (user.role === 'Admin' || user.role === 'AdminTuningDesk') {
      return next(
        new ErrorResponse('Selected user role cannot be assigned as document responsible', 400)
      );
    }

    const userDeptIds = new Set(
      [
        ...(Array.isArray(user.departments) ? user.departments.map(extractId) : []),
        extractId(user.activeDepartment)
      ].filter(Boolean)
    );

    if (req.user.role !== 'Admin') {
      if (!userDeptIds.has(activeDeptId)) {
        return next(
          new ErrorResponse('User does not belong to your department', 403)
        );
      }
    } else if (docAssignedDeptIds.length > 0) {
      const matchesDocDepartment = docAssignedDeptIds.some((deptId) => userDeptIds.has(deptId));
      if (!matchesDocDepartment) {
        return next(
          new ErrorResponse('User does not belong to the assigned department(s) of this document', 403)
        );
      }
    }
    
    // Update document
    document = await IncomingDocument.findByIdAndUpdate(
      req.params.id,
      { responsibleUser: userId },
      { new: true, runValidators: true }
    )
      .populate('assignedTo.id')
      .populate({
        path: 'responsibleUser',
        select: 'username role photo personnelId',
        populate: { path: 'personnelId', select: 'nom prenom poste' }
      })
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
