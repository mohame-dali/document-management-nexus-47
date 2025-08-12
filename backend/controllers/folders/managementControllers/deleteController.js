
const Folder = require('../../../models/Folder');
const IncomingDocument = require('../../../models/IncomingDocument');
const OutgoingDocument = require('../../../models/OutgoingDocument');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private/AdminDepartment
exports.deleteFolder = async (req, res, next) => {
  try {
    console.log(`Attempting to delete folder with ID: ${req.params.id}`);
    console.log(`User: ${req.user.username}, Department: ${req.user.activeDepartment?.name}`);
    
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      console.log(`Folder with ID ${req.params.id} not found in database`);
      return next(
        new ErrorResponse(`Folder not found with id of ${req.params.id}`, 404)
      );
    }
    
    console.log(`Found folder: ${folder.name}, Department: ${folder.department}`);
    
    // Check if user has access to this folder
    if (folder.department.toString() !== req.user.activeDepartment._id.toString()) {
      console.log(`Access denied. Folder department: ${folder.department}, User department: ${req.user.activeDepartment._id}`);
      return next(
        new ErrorResponse(`Not authorized to delete this folder`, 403)
      );
    }
    
    // Check if folder has subfolders
    const subfolders = await Folder.find({ parent: req.params.id });
    console.log(`Found ${subfolders.length} subfolders`);
    
    if (subfolders.length > 0) {
      return next(
        new ErrorResponse('Cannot delete folder that contains subfolders. Please delete subfolders first.', 400)
      );
    }
    
    // Check if folder has documents
    const incomingDocs = await IncomingDocument.countDocuments({ folder: req.params.id });
    const outgoingDocs = await OutgoingDocument.countDocuments({ folder: req.params.id });
    
    console.log(`Found ${incomingDocs} incoming documents and ${outgoingDocs} outgoing documents`);
    
    if (incomingDocs > 0 || outgoingDocs > 0) {
      return next(
        new ErrorResponse('Cannot delete folder that contains documents. Please move or delete documents first.', 400)
      );
    }
    
    // Delete the folder
    await Folder.findByIdAndDelete(req.params.id);
    console.log(`Successfully deleted folder: ${folder.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (err) {
    console.error('Error in deleteFolder:', err);
    next(err);
  }
};
