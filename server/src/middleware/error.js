export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || (err.statusCode ? err.statusCode : 500);
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Unexpected server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details: err.details || (process.env.NODE_ENV === 'development' ? err.stack : undefined)
    }
  });
}
