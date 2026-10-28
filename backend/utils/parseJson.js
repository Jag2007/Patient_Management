// Pulls the first {...} JSON object out of an LLM reply. Returns null if there isn't a valid one.
// Used by chatService and judgeService.
function extractJson(text) {
  const match = (text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

module.exports = { extractJson };
