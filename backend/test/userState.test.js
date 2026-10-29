import test from 'node:test';
import assert from 'node:assert/strict';
import {
  heuristicUserState,
  resolveState,
  chooseStyle,
  selectPersona,
  promptFromLastStyle
} from '../src/services/userStateService.js';
import { getTherapistPrompt, THERAPIST_STYLES } from '../src/services/prompts.js';

test('reads distress, advice-seeking, guardedness, looping and progress from the message', () => {
  assert.equal(heuristicUserState("I'm so overwhelmed, I can't take this anymore"), 'distressed');
  assert.equal(heuristicUserState('What should I do about my manager?'), 'seeking_advice');
  assert.equal(heuristicUserState('idk'), 'guarded');
  assert.equal(heuristicUserState('I finally feel a lot better this week'), 'positive');
  assert.equal(heuristicUserState('It keeps happening again and again at work'), 'looping');
});

test('repeating an earlier theme reads as looping', () => {
  const earlier = ['My boss never listens to my ideas in meetings'];
  assert.equal(heuristicUserState('My boss never listens to anything I suggest in meetings', earlier), 'looping');
});

test('a very short reply after another short reply reads as guarded', () => {
  assert.equal(heuristicUserState('not much', ['fine']), 'guarded');
});

test('no signal means neutral', () => {
  assert.equal(heuristicUserState('I went to the shop today'), 'neutral');
  assert.equal(heuristicUserState(''), 'neutral');
});

test('distress outranks an advice request', () => {
  assert.equal(heuristicUserState("I'm panicking, what should I do"), 'distressed');
});

test('sustained distress carries over one calmer message, a single one does not', () => {
  assert.equal(resolveState('positive', ['distressed', 'distressed']), 'distressed');
  assert.equal(resolveState('positive', ['neutral', 'distressed']), 'positive');
  assert.equal(resolveState('seeking_advice', ['distressed', 'distressed']), 'seeking_advice');
});

test('each state maps to the fitting style', () => {
  assert.equal(chooseStyle('distressed'), 'brief');
  assert.equal(chooseStyle('seeking_advice'), 'solution_focused');
  assert.equal(chooseStyle('open'), 'interrogative');
  assert.equal(chooseStyle('guarded'), 'questioning');
});

test('no clear signal gives no style, so the weighted random fallback applies', () => {
  assert.equal(chooseStyle('neutral'), null);
});

test('hard truths wait for rapport and never land on someone who is struggling', () => {
  assert.equal(chooseStyle('looping', { userTurns: 2 }), 'questioning');
  assert.equal(chooseStyle('looping', { userTurns: 8 }), 'hard_truths');
  assert.equal(chooseStyle('looping', { userTurns: 8, previousStates: ['distressed', 'neutral'] }), 'questioning');
});

test('selectPersona returns the prompt for the chosen style', () => {
  const context = Array.from({ length: 6 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }));
  const persona = selectPersona('seeking_advice', context);
  assert.equal(persona.style, 'solution_focused');
  assert.equal(persona.prompt, getTherapistPrompt('solution_focused'));
  assert.equal(selectPersona('neutral', context).prompt, null);
});

test('nudges reuse the style of the last reply', () => {
  const context = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello', state: 'distressed', style: 'brief' }
  ];
  assert.equal(promptFromLastStyle(context), getTherapistPrompt('brief'));
  assert.equal(promptFromLastStyle([{ role: 'assistant', content: 'no style yet' }]), null);
});

test('all five styles resolve to distinct prompts', () => {
  const prompts = new Set(THERAPIST_STYLES.map(getTherapistPrompt));
  assert.equal(prompts.size, 5);
});
