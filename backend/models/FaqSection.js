// One paragraph of a clinic FAQ document (e.g. cancellation-policy.md, section 2).
// The text index lets the AI assistant search these paragraphs by keywords.
// Filled by the seed script; searched by retrievalService.
const mongoose = require('mongoose');

const faqSectionSchema = new mongoose.Schema({
  source: { type: String, required: true },
  section: { type: Number, required: true },
  text: { type: String, required: true },
});

faqSectionSchema.index({ text: 'text' });

module.exports = mongoose.model('FaqSection', faqSectionSchema, 'faq_sections');
