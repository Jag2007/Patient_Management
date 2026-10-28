// Escapes regex special characters so user text is matched literally. Used by patient search and the AI tools.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
