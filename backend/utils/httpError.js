// Makes an Error with an HTTP status, e.g. httpError(404, 'Patient not found'). errorHandler sends it as JSON.
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = httpError;
