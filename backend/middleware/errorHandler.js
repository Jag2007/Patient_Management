// The single place where errors become HTTP responses. Registered last in app.js.
// Turns Mongoose validation errors, bad IDs, duplicates and our own httpErrors into clean JSON.
// Unexpected errors are logged on the server, and the user only sees a generic message.
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    const fields = {};
    for (const [field, detail] of Object.entries(err.errors)) fields[field] = detail.message;
    return res.status(400).json({ error: 'Please fix the highlighted fields', fields });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'This record already exists' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong, please try again' });
}

module.exports = errorHandler;
