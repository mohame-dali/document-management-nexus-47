
const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.log(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // Multer limit file size (413 Payload Too Large)
  if (err.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Fichier trop volumineux. Maximum 10 Mo.',
      error: 'Fichier trop volumineux. Maximum 10 Mo.'
    });
  }

  const finalMessage = Array.isArray(error.message)
    ? error.message.join(', ')
    : (error.message || 'Server Error');

  res.status(error.statusCode || 500).json({
    success: false,
    message: finalMessage,
    error: finalMessage
  });
};

module.exports = errorHandler;
