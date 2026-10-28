// Lists the clinic documents the AI reads, grouped by file, for the admin Documents page.
// Section numbers match the source labels under chat answers, e.g. "billing.md (section 2)".
const FaqSection = require('../models/FaqSection');

// The seed stores each paragraph as "Title: text".
function splitTitle(text) {
  const index = text.indexOf(': ');
  return index === -1 ? { title: '', body: text } : { title: text.slice(0, index), body: text.slice(index + 2) };
}

async function listDocuments() {
  const sections = await FaqSection.find().sort({ source: 1, section: 1 }).lean();
  const documents = new Map();

  for (const { source, section, text } of sections) {
    const { title, body } = splitTitle(text);
    if (!documents.has(source)) documents.set(source, { source, title, sections: [] });
    documents.get(source).sections.push({ section, text: body });
  }
  return [...documents.values()];
}

module.exports = { listDocuments };
