
const DocumentOptions = require('../models/DocumentOptions');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all document options
// @route   GET /api/document-options
// @access  Private
exports.getDocumentOptions = async (req, res, next) => {
  try {
    const { category, documentType } = req.query;
    
    let filter = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    
    if (documentType) {
      filter.$or = [
        { documentType: documentType },
        { documentType: 'both' }
      ];
    }
    
    const options = await DocumentOptions.find(filter)
      .populate('createdBy', 'username')
      .sort({ category: 1, value: 1 });
    
    res.status(200).json({
      success: true,
      data: options
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create document option
// @route   POST /api/document-options
// @access  Private (AdminTuningDesk only)
exports.createDocumentOption = async (req, res, next) => {
  try {
    const { category, documentType, value } = req.body;
    
    if (!category || !documentType || !value) {
      return next(new ErrorResponse('Category, documentType and value are required', 400));
    }
    
    const option = await DocumentOptions.create({
      category,
      documentType,
      value,
      createdBy: req.user._id
    });
    
    await option.populate('createdBy', 'username');
    
    res.status(201).json({
      success: true,
      data: option
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ErrorResponse('This option already exists', 400));
    }
    next(error);
  }
};

// @desc    Update document option
// @route   PUT /api/document-options/:id
// @access  Private (AdminTuningDesk only)
exports.updateDocumentOption = async (req, res, next) => {
  try {
    const { value, isActive } = req.body;
    
    const option = await DocumentOptions.findById(req.params.id);
    
    if (!option) {
      return next(new ErrorResponse('Document option not found', 404));
    }
    
    if (value !== undefined) option.value = value;
    if (isActive !== undefined) option.isActive = isActive;
    
    await option.save();
    await option.populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      data: option
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete document option
// @route   DELETE /api/document-options/:id
// @access  Private (AdminTuningDesk only)
exports.deleteDocumentOption = async (req, res, next) => {
  try {
    const option = await DocumentOptions.findById(req.params.id);
    
    if (!option) {
      return next(new ErrorResponse('Document option not found', 404));
    }
    
    await option.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
