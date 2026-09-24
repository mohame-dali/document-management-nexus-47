const OutgoingDocument = require('../../../models/OutgoingDocument');
const ErrorResponse = require('../../../utils/errorResponse');

// @desc    Toggle or set flag on outgoing document for follow-up
// @route   PUT /api/outgoing-documents/:id/flag
// @access  Private (all authenticated users)
exports.toggleFlag = async (req, res, next) => {
  try {
    const document = await OutgoingDocument.findById(req.params.id);

    if (!document) {
      return next(new ErrorResponse(`Document not found with id of ${req.params.id}`, 404));
    }

    const newFlagState = typeof req.body.isFlagged === 'boolean'
      ? req.body.isFlagged
      : !document.isFlagged;

    document.isFlagged = newFlagState;
    document.flaggedAt = newFlagState ? new Date() : null;
    document.flaggedBy = newFlagState ? (req.user ? req.user._id : null) : null;
    if (req.body.flagNote !== undefined) {
      document.flagNote = req.body.flagNote;
    }

    await document.save();

    await document.populate([
      { path: 'source.id' },
      { path: 'reference' },
      { path: 'folder' }
    ]);

    res.status(200).json({
      success: true,
      data: document,
      message: newFlagState ? 'Document marked for follow-up' : 'Document unflagged'
    });
  } catch (err) {
    next(err);
  }
};
