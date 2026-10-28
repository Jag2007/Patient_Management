// Creates an error that carries an HTTP status code, e.g. httpError(404, 'Patient not found').
// Services throw these; the central error handler turns them into JSON responses.
// This keeps status codes out of try/catch blocks scattered across the code.
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = httpError;
