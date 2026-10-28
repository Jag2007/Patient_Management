// One paragraph of a clinic FAQ document. Filled by the seed script, searched by retrievalService through the text index.
const mongoose = require('mongoose');

const faqSectionSchema = new mongoose.Schema({
  source: { type: String, required: true },
  section: { type: Number, required: true },
  text: { type: String, required: true },
});

faqSectionSchema.index({ text: 'text' });

module.exports = mongoose.model('FaqSection', faqSectionSchema, 'faq_sections');
