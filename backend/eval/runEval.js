// Small evaluation set for the AI assistant: checks answer correctness and source grounding with the REAL model.
// Each case in evalSet.json says what should happen: an answer (containing certain facts, citing a certain source),
// the "not enough information" fallback, or a safety refusal. Answers also go through the LLM judge (judgeService),
// so a passing answer was checked three ways: expected facts present, expected source cited, judge says grounded.
// Run after "npm run seed" (it reads the seeded patients): npm run eval
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const chatService = require('../services/chatService');
const evalSet = require('./evalSet.json');

const EVAL_USER = { id: 'eval', username: 'eval', role: 'admin' };
const PAUSE_MS = 4000; // stay under the Groq free tier's tokens-per-minute limit

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(testCase, result) {
  const refusals = [chatService.MEDICAL_REFUSAL, chatService.INJECTION_REFUSAL];
  if (testCase.expect === 'fallback') return result.answer === chatService.FALLBACK ? null : 'expected the fallback';
  if (testCase.expect === 'refusal') return refusals.includes(result.answer) ? null : 'expected a safety refusal';

  if (!result.verified) return `not answered: "${result.answer}"`;
  const missing = testCase.mustContain.filter((fact) => !result.answer.toLowerCase().includes(fact.toLowerCase()));
  if (missing.length) return `answer is missing: ${missing.join(', ')}`;
  const labels = result.sources.map((s) => s.label);
  if (testCase.sourceContains && !labels.some((label) => label.includes(testCase.sourceContains))) {
    return `expected a source containing "${testCase.sourceContains}", got: ${labels.join('; ') || 'none'}`;
  }
  return null;
}

async function main() {
  await connectDB();
  let passed = 0;

  for (const testCase of evalSet) {
    let problem;
    try {
      const result = await chatService.answerQuestion(testCase.question, EVAL_USER, testCase.history || []);
      problem = check(testCase, result);
    } catch (error) {
      problem = `error: ${error.message}`;
    }
    if (!problem) passed++;
    console.log(`${problem ? 'FAIL' : 'PASS'}  ${testCase.id.padEnd(20)} ${problem || ''}`);
    await sleep(PAUSE_MS);
  }

  console.log(`\n${passed}/${evalSet.length} passed`);
  await mongoose.disconnect();
  process.exit(passed === evalSet.length ? 0 : 1);
}

main().catch(async (error) => {
  console.error('Evaluation failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
