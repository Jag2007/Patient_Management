// Formats dates the same way everywhere the AI sees them, e.g. "09 Sept 1988" or "12 Nov 2026, 10:00".
function formatDate(date, withTime) {
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' });
  return new Date(date).toLocaleString('en-GB', options);
}

module.exports = formatDate;
