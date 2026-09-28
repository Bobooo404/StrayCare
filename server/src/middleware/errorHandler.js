const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const mongoose = require('mongoose');
const multer = require('multer');

/** Turns Mongoose documents into a plain object keyed by field path. */
function extractMongooseErrors(err) {
  if (!err.errors) return null;
  const details = {};
  for (const [field, fieldError] of Object.entries(err.errors)) {
    details[field] = fieldError.message;
  }
  return details;
}

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err instanceof multer.MulterError) {
    statusCode =
      err.code === 'LIMIT_FILE_SIZE'
        ? 413
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 400
          : 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be smaller than 5MB'
        : 'Unexpected upload field. Use the "image" field.';
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = 'Please correct the highlighted fields';
    details = extractMongooseErrors(err);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || { field: null })[0];
    message =
      field === 'email'
        ? 'An account with that email already exists'
        : `Duplicate value for "${field}"`;
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
    if (!env.isProduction) message = err.message || message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
