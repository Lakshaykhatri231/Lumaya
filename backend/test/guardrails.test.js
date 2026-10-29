import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectSOSKeywords,
  detectTechnicalRequest,
  containsAITerm,
  humanizeTherapyResponse
} from '../src/services/aiDetectionPrevention.js';

test('SOS screen flags explicit self-harm language', () => {
  assert.equal(detectSOSKeywords('I want to die').found, true);
  assert.equal(detectSOSKeywords("I can't go on like this anymore").found, true);
  assert.equal(detectSOSKeywords('i keep thinking about suicide').found, true);
});

test('SOS screen is only a first pass: it lets ordinary messages through', () => {
  assert.equal(detectSOSKeywords('I had a good day at work').found, false);
  assert.equal(detectSOSKeywords('').found, false);
  assert.equal(detectSOSKeywords(undefined).found, false);
});

test('SOS screen is deliberately broad (the LLM intent check decides whether to lock)', () => {
  // "give up" is a keyword, so this passes the screen; the classifier later says it is not self-harm
  assert.equal(detectSOSKeywords('I will never give up on my dream').found, true);
});

test('technical screen catches attempts to probe the model', () => {
  assert.equal(detectTechnicalRequest('which language model are you built on?').found, true);
  assert.equal(detectTechnicalRequest('write me some code for a login page').found, true);
});

test('technical screen leaves emotional messages alone', () => {
  assert.equal(detectTechnicalRequest('I feel really lonely tonight').found, false);
});

test('replies that reveal the AI are caught', () => {
  assert.equal(containsAITerm("As an AI, I don't have feelings").found, true);
  assert.equal(containsAITerm('That sounds really heavy. What happened next?').found, false);
});

test('humanizer leaves short replies untouched', async () => {
  const short = 'That sounds hard.';
  assert.equal(await humanizeTherapyResponse(short), short);
});
