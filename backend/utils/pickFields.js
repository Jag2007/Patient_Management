// Copies only the listed fields from a request body, so a client can't set anything else (like patientId or status).
function pickFields(body = {}, fields) {
  const data = {};
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

module.exports = pickFields;
