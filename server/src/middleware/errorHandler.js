// Central place that turns any thrown error into the standard API shape.
// Controllers can just `throw` or call `next(err)` and this catches it.
function errorHandler(err, req, res, next) {
  console.error('[PRAMAAN ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Something went wrong',
    },
  });
}

module.exports = errorHandler;
