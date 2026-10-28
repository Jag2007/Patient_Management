// Escapes special regex characters so user text is matched literally (e.g. "(.*" can't widen a search).
// Used by patient search and by the AI tools' name lookup.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
