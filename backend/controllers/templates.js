
const Template = require('../models/Template');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');

// @desc    Get all templates
// @route   GET /api/templates
// @access  Private (All authenticated users)
exports.getTemplates = asyncHandler(async (req, res, next) => {
  const templates = await Template.find({ isActive: true })
    .populate('uploadedBy', 'username')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: templates.length,
    data: templates
  });
});

// @desc    Get single template
// @route   GET /api/templates/:id
// @access  Private (All authenticated users)
exports.getTemplate = asyncHandler(async (req, res, next) => {
  const template = await Template.findById(req.params.id)
    .populate('uploadedBy', 'username');

  if (!template) {
    return next(new ErrorResponse('Template not found', 404));
  }

  res.status(200).json({
    success: true,
    data: template
  });
});

// @desc    Create new template
// @route   POST /api/templates
// @access  Private (AdminTuningDesk only)
exports.createTemplate = asyncHandler(async (req, res, next) => {
  // Check if user is SuperAdmin or AdminTuningDesk
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'AdminTuningDesk') {
    return next(new ErrorResponse('Not authorized to create templates', 403));
  }

  if (!req.file) {
    return next(new ErrorResponse('Please upload a template file', 400));
  }

  const { name, description } = req.body;

  const template = await Template.create({
    name,
    description,
    fileName: req.file.filename,
    filePath: req.file.path,
    fileSize: req.file.size,
    uploadedBy: req.user.id
  });

  const populatedTemplate = await Template.findById(template._id)
    .populate('uploadedBy', 'username');

  res.status(201).json({
    success: true,
    data: populatedTemplate
  });
});

// @desc    Update template
// @route   PUT /api/templates/:id
// @access  Private (AdminTuningDesk only)
exports.updateTemplate = asyncHandler(async (req, res, next) => {
  // Check if user is SuperAdmin or AdminTuningDesk
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'AdminTuningDesk') {
    return next(new ErrorResponse('Not authorized to update templates', 403));
  }

  let template = await Template.findById(req.params.id);

  if (!template) {
    return next(new ErrorResponse('Template not found', 404));
  }

  const { name, description } = req.body;
  const updateData = { name, description };

  // If new file is uploaded, update file info and delete old file
  if (req.file) {
    // Delete old file
    if (fs.existsSync(template.filePath)) {
      fs.unlinkSync(template.filePath);
    }

    updateData.fileName = req.file.filename;
    updateData.filePath = req.file.path;
    updateData.fileSize = req.file.size;
  }

  template = await Template.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  }).populate('uploadedBy', 'username');

  res.status(200).json({
    success: true,
    data: template
  });
});

// @desc    Delete template
// @route   DELETE /api/templates/:id
// @access  Private (AdminTuningDesk only)
exports.deleteTemplate = asyncHandler(async (req, res, next) => {
  // Check if user is SuperAdmin or AdminTuningDesk
  if (req.user.role !== 'SuperAdmin' && req.user.role !== 'AdminTuningDesk') {
    return next(new ErrorResponse('Not authorized to delete templates', 403));
  }

  const template = await Template.findById(req.params.id);

  if (!template) {
    return next(new ErrorResponse('Template not found', 404));
  }

  // Delete file from filesystem
  if (fs.existsSync(template.filePath)) {
    fs.unlinkSync(template.filePath);
  }

  await template.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Download template
// @route   GET /api/templates/:id/download
// @access  Private (All authenticated users)
exports.downloadTemplate = asyncHandler(async (req, res, next) => {
  const template = await Template.findById(req.params.id);

  if (!template) {
    return next(new ErrorResponse('Template not found', 404));
  }

  if (!fs.existsSync(template.filePath)) {
    return next(new ErrorResponse('Template file not found', 404));
  }

  // Increment download count
  await Template.findByIdAndUpdate(req.params.id, {
    $inc: { downloads: 1 }
  });

  // Set appropriate headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  // Send file
  res.download(template.filePath, template.fileName);
});
