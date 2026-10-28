// Benchmarks the AI assistant on eval/goldenSet.json against the real database and the real model.
// Scores each case, prints a table and a summary, and writes eval/results.json. Run with: npm run eval
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const chatService = require('../services/chatService');
const { cases } = require('./goldenSet.json');

const EVAL_USER = { id: 'eval', username: 'eval', role: 'admin' };
const PAUSE_MS = Number(process.env.EVAL_PAUSE_MS) || 6000; // Groq free tier is about 8k tokens per minute
const RETRY_PAUSE_MS = 60000; // after a 429 or timeout, wait for the per-minute limit to reset
const RESULTS_FILE = path.join(__dirname, 'results.json');
const OUTCOMES = ['correct', 'partial', 'unsupported', 'wrongly_declined', 'correct_decline', 'error'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []);
const percent = (part, whole) => (whole ? `${((100 * part) / whole).toFixed(1)}%` : 'n/a');

// A fact can be one string or a list of acceptable spellings.
function hasFact(text, fact) {
  return asList(fact).some((option) => text.includes(option.toLowerCase()));
}

function citesExpectedSource(testCase, sources) {
  const wanted = asList(testCase.sourceContains);
  if (wanted.length === 0) return true;
  return sources.some((s) => wanted.some((w) => s.label.includes(w)));
}

function declineType(answer) {
  if (answer === chatService.FALLBACK) return 'fallback';
  if (answer === chatService.MEDICAL_REFUSAL || answer === chatService.INJECTION_REFUSAL) return 'refusal';
  return 'tool reply';
}

// Returns { outcome, note, grounded } for one case.
function score(testCase, result) {
  const sources = result.sources || [];
  const answered = Boolean(result.verified);
  const text = result.answer.toLowerCase();
  const grounded = answered && citesExpectedSource(testCase, sources);

  if (testCase.expected !== 'answer') {
    if (answered) return { outcome: 'unsupported', note: 'answered a question it should have declined', grounded };
    const got = declineType(result.answer);
    return { outcome: 'correct_decline', note: got === testCase.expected ? '' : `declined with ${got}`, grounded };
  }

  if (!answered) return { outcome: 'wrongly_declined', note: `got ${declineType(result.answer)}`, grounded };

  const contradictions = asList(testCase.mustNotContain).filter((fact) => hasFact(text, fact));
  if (contradictions.length) return { outcome: 'unsupported', note: `contains ${contradictions.join(', ')}`, grounded };

  const missing = testCase.mustContain.filter((fact) => !hasFact(text, fact));
  const problems = [];
  if (missing.length) problems.push(`missing ${missing.map((f) => asList(f)[0]).join(', ')}`);
  if (!grounded) problems.push(`cited ${sources.map((s) => s.label).join('; ') || 'nothing'}`);
  if (problems.length) return { outcome: 'partial', note: problems.join('; '), grounded };
  return { outcome: 'correct', note: '', grounded };
}

// One try, then one retry after a longer pause (rate limits and timeouts are the usual cause).
async function ask(testCase) {
  for (let attempt = 1; ; attempt++) {
    const started = Date.now();
    try {
      const result = await chatService.answerQuestion(testCase.question, EVAL_USER, testCase.history || []);
      return { result, ms: Date.now() - started };
    } catch (error) {
      if (attempt === 2) return { error: error.message, ms: Date.now() - started };
      console.log(`  ${testCase.id}: ${error.message} (retrying in ${RETRY_PAUSE_MS / 1000} s)`);
      await sleep(RETRY_PAUSE_MS);
    }
  }
}

function summarise(rows) {
  const count = (list, outcome) => list.filter((r) => r.outcome === outcome).length;
  const answerable = rows.filter((r) => r.expected === 'answer');
  const declinable = rows.filter((r) => r.expected !== 'answer');
  const answered = answerable.filter((r) => r.verified);
  const timed = rows.filter((r) => r.outcome !== 'error');

  const byCategory = {};
  for (const r of rows) {
    byCategory[r.category] ||= { total: 0, ...Object.fromEntries(OUTCOMES.map((o) => [o, 0])) };
    byCategory[r.category].total++;
    byCategory[r.category][r.outcome]++;
  }

  return {
    total: rows.length,
    counts: Object.fromEntries(OUTCOMES.map((o) => [o, count(rows, o)])),
    accuracy: percent(count(rows, 'correct') + count(rows, 'correct_decline'), rows.length),
    answerAccuracy: percent(count(answerable, 'correct'), answerable.length),
    declineAccuracy: percent(count(declinable, 'correct_decline'), declinable.length),
    sourceGrounding: percent(answered.filter((r) => r.grounded).length, answered.length),
    averageLatencyMs: timed.length ? Math.round(timed.reduce((sum, r) => sum + r.ms, 0) / timed.length) : null,
    byCategory,
  };
}

function printSummary(summary) {
  console.log('\nOutcomes');
  for (const o of OUTCOMES) console.log(`  ${o.padEnd(18)} ${summary.counts[o]}`);
  console.log(`\nAccuracy (correct + correct_decline): ${summary.accuracy} of ${summary.total}`);
  console.log(`Answer accuracy (answerable cases):  ${summary.answerAccuracy}`);
  console.log(`Decline accuracy (should decline):   ${summary.declineAccuracy}`);
  console.log(`Source grounding (answers citing the expected source): ${summary.sourceGrounding}`);
  console.log(`Average latency per question: ${summary.averageLatencyMs} ms`);

  console.log('\nBy category');
  for (const [category, c] of Object.entries(summary.byCategory)) {
    const good = c.correct + c.correct_decline;
    console.log(`  ${category.padEnd(22)} ${good}/${c.total} ok, partial ${c.partial}, declined wrongly ${c.wrongly_declined}, unsupported ${c.unsupported}, error ${c.error}`);
  }
}

async function main() {
  await connectDB();
  const rows = [];
  console.log(`Running ${cases.length} cases, ${PAUSE_MS / 1000} s apart\n`);
  console.log(`${'id'.padEnd(32)}${'category'.padEnd(22)}${'outcome'.padEnd(18)}${'ms'.padStart(6)}  note`);

  for (const testCase of cases) {
    const { result, error, ms } = await ask(testCase);
    const scored = error ? { outcome: 'error', note: error, grounded: false } : score(testCase, result);
    rows.push({
      id: testCase.id,
      category: testCase.category,
      question: testCase.question,
      expected: testCase.expected,
      expectedAnswer: testCase.expectedAnswer,
      outcome: scored.outcome,
      note: scored.note,
      answer: result ? result.answer : null,
      sources: result ? result.sources : [],
      verified: Boolean(result && result.verified),
      grounded: scored.grounded,
      ms,
    });
    console.log(`${testCase.id.padEnd(32)}${testCase.category.padEnd(22)}${scored.outcome.padEnd(18)}${String(ms).padStart(6)}  ${scored.note}`);
    await sleep(PAUSE_MS);
  }

  const summary = summarise(rows);
  printSummary(summary);

  const report = { model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b', ranAt: new Date().toISOString(), summary, cases: rows };
  fs.writeFileSync(RESULTS_FILE, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nSaved ${path.relative(process.cwd(), RESULTS_FILE)}`);

  await mongoose.disconnect();
  process.exit(summary.counts.error ? 1 : 0);
}

main().catch(async (error) => {
  console.error('Evaluation failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
