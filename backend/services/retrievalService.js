// Finds the FAQ paragraphs that best match a question, using MongoDB's text index (keyword search).
// Common question words (can, what, how...) are dropped first so they don't match unrelated paragraphs.
// Returns at most 3 sections above a minimum score, each with a short ID (S1, S2, S3) the AI must cite.
// If nothing matches well enough, it returns an empty list and the AI is not called for FAQ questions.
const FaqSection = require('../models/FaqSection');

const MAX_SECTIONS = 3;
const MIN_SCORE = 0.5;
const QUESTION_WORDS = new Set(['can', 'could', 'do', 'does', 'i', 'we', 'you', 'what', 'how', 'when', 'where', 'which', 'is', 'are', 'my', 'your', 'the', 'a', 'an']);

function keywordsOf(question) {
  return question
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((word) => word && !QUESTION_WORDS.has(word))
    .join(' ');
}

async function findRelevantSections(question) {
  const keywords = keywordsOf(question);
  if (!keywords) return [];

  const results = await FaqSection.find({ $text: { $search: keywords } }, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(MAX_SECTIONS)
    .lean();

  return results
    .filter((result) => result.score >= MIN_SCORE)
    .map((result, index) => ({ id: `S${index + 1}`, source: result.source, section: result.section, text: result.text }));
}

module.exports = { findRelevantSections };
