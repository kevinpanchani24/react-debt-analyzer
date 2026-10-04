/**
 * Global error handling middleware.
 * Catches errors passed via next(err) in route handlers.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl} → ${err.message}`);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: Object.values(err.errors).map((e) => e.message).join(', '),
    });
  }

  // Mongoose cast error (bad ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, error: 'Invalid ID format.' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
