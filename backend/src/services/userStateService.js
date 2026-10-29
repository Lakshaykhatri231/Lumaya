// Reads how the user is behaving right now and picks the therapeutic style that fits,
// the way a therapist shifts approach depending on the person in front of them.
import { THERAPIST_STYLES, getTherapistPrompt } from './prompts.js';
import { config } from '../config/index.js';

export const USER_STATES = ['distressed', 'guarded', 'seeking_advice', 'looping', 'open', 'positive', 'neutral'];

// 'neutral' has no entry on purpose: with no clear signal the caller falls back to the weighted random style
const STATE_TO_STYLE = {
  distressed: 'brief',
  guarded: 'questioning',
  seeking_advice: 'solution_focused',
  looping: 'hard_truths',
  open: 'interrogative',
  positive: 'questioning'
};

// Hard truths need rapport: not in the first few turns, and never while someone is struggling
const MIN_USER_TURNS_FOR_HARD_TRUTHS = 4;

const DISTRESS_RE = /\b(overwhelm\w*|panic\w*|hopeless|cry(ing)?|can'?t (take|cope|breathe|do this)|falling apart|breaking down|exhaust\w*|terrified|scared|anxious|anxiety|hurting|lonely|worthless|miserable|devastat\w*|numb)\b/i;
const ADVICE_RE = /\b(what should i do|what do i do|how (do|can|should) i|any (advice|tips|suggestions)|give me (advice|tips)|help me (figure|decide|with)|should i)\b/i;
const POSITIVE_RE = /\b(better|proud|happy|excited|grateful|good news|great day|relieved|progress|improved|finally)\b/i;
const LOOPING_RE = /\b(again|always|every time|same thing|keeps? happening|can'?t stop thinking|over and over|stuck in)\b/i;
const GUARDED_RE = /^(idk|i don'?t know|fine|ok(ay)?|nothing|whatever|nvm|nevermind|not really|maybe|sure|k|hmm+)[.!\s]*$/i;

const wordsOf = (text) => (text.toLowerCase().match(/[a-z']+/g) || []);
const STOP_WORDS = new Set(['the', 'and', 'but', 'that', 'this', 'with', 'for', 'was', 'are', 'have', 'has', 'had', 'you', 'not', 'just', 'its', 'it\'s', 'i\'m', 'like', 'they', 'them', 'what', 'when', 'about', 'there', 'would', 'could', 'been', 'from', 'she', 'his', 'her']);

const contentWords = (text) => new Set(wordsOf(text).filter((w) => w.length > 3 && !STOP_WORDS.has(w)));

function overlap(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared / Math.min(a.size, b.size);
}

/**
 * Fast, offline read of the user's state from this message and their last few messages.
 * Order matters: distress and explicit asks outrank softer signals.
 */
export function heuristicUserState(message, recentUserMessages = []) {
  const text = (message || '').trim();
  if (!text) return 'neutral';

  const words = wordsOf(text);

  if (DISTRESS_RE.test(text)) return 'distressed';
  if (ADVICE_RE.test(text)) return 'seeking_advice';

  if (GUARDED_RE.test(text) || (words.length <= 3 && recentUserMessages.slice(-1).some((m) => wordsOf(m).length <= 4))) {
    return 'guarded';
  }

  const current = contentWords(text);
  const repeatsEarlierTheme = recentUserMessages.slice(-3).some((m) => overlap(current, contentWords(m)) >= 0.5 && current.size >= 3);
  if (repeatsEarlierTheme || LOOPING_RE.test(text)) return 'looping';

  if (POSITIVE_RE.test(text)) return 'positive';
  if (words.length >= 40) return 'open';

  return 'neutral';
}

/**
 * Distress doesn't vanish after one calmer message: if the last two turns were distressed,
 * a weak signal (open / guarded / positive / neutral) keeps the supportive stance for one more turn.
 */
export function resolveState(rawState, previousStates = []) {
  const lastTwo = previousStates.slice(-2);
  const sustainedDistress = lastTwo.length === 2 && lastTwo.every((s) => s === 'distressed');
  const weak = ['open', 'guarded', 'positive', 'neutral'].includes(rawState);
  return sustainedDistress && weak ? 'distressed' : rawState;
}

/**
 * Maps a state to a style, or null when there's no clear signal (caller uses its weighted random).
 */
export function chooseStyle(state, { userTurns = 0, previousStates = [] } = {}) {
  let style = STATE_TO_STYLE[state] || null;

  if (style === 'hard_truths') {
    const recentlyDistressed = previousStates.slice(-2).includes('distressed');
    if (userTurns < MIN_USER_TURNS_FOR_HARD_TRUTHS || recentlyDistressed) style = 'questioning';
  }

  return style;
}

const stateHistory = (chatContext) =>
  chatContext.filter((m) => m.role === 'assistant' && m.state).map((m) => m.state);

/**
 * LLM read of the conversation; used on top of the heuristic for nuance (sarcasm, subtext).
 * Returns null on any failure so the heuristic result stands.
 */
async function llmUserState(genAI, message, chatContext) {
  try {
    const recent = chatContext
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'USER' : 'THERAPIST'}: ${m.content}`)
      .join('\n');

    const prompt = `You are helping a therapist notice how a client is presenting right now.
Classify the client's CURRENT state from their latest message and the recent conversation.

States:
- distressed: overwhelmed, panicking, hopeless, in acute emotional pain
- guarded: withdrawn, deflecting, giving minimal answers, avoiding the topic
- seeking_advice: asking what to do, wants concrete help or a plan
- looping: ruminating or circling the same story/excuse without moving, or avoiding the real issue
- open: reflective, curious, willing to explore feelings in depth
- positive: reporting progress, good news, or an improved mood
- neutral: nothing notable

Recent conversation:
${recent}

Latest client message: "${message}"

Reply with exactly one word from the list above.`;

    const model = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: { temperature: 0, maxOutputTokens: 8 }
    });
    const result = await model.generateContent(prompt);
    const label = result.response.text().trim().toLowerCase().replace(/[^a-z_]/g, '');
    return USER_STATES.includes(label) ? label : null;
  } catch (error) {
    console.error('User state classification failed, using heuristic:', error.message);
    return null;
  }
}

/**
 * Detects the user's state for this message. The heuristic always runs; the LLM refines it.
 * A heuristic "distressed" is never overridden downward by the LLM (err toward the gentler stance).
 */
export async function detectUserState(genAI, message, chatContext = []) {
  const recentUserMessages = chatContext.filter((m) => m.role === 'user').map((m) => m.content || '');
  const heuristic = heuristicUserState(message, recentUserMessages);

  if (process.env.PERSONA_STATE_DETECTION === 'off' || !genAI || !message?.trim()) {
    return resolveState(heuristic, stateHistory(chatContext));
  }

  const fromLlm = await llmUserState(genAI, message, chatContext);
  const raw = heuristic === 'distressed' ? 'distressed' : (fromLlm || heuristic);

  return resolveState(raw, stateHistory(chatContext));
}

/**
 * Picks the style for a turn. `prompt` is null when there's no clear signal so the caller keeps its random fallback.
 */
export function selectPersona(state, chatContext = []) {
  const userTurns = chatContext.filter((m) => m.role === 'user').length;
  const style = chooseStyle(state, { userTurns, previousStates: stateHistory(chatContext) });
  return { state, style, prompt: style ? getTherapistPrompt(style) : null };
}

/**
 * For nudges: reuse the style of the last real reply so a nudge sounds like the same therapist.
 */
export function promptFromLastStyle(chatContext = []) {
  const last = [...chatContext].reverse().find((m) => m.role === 'assistant' && m.style && THERAPIST_STYLES.includes(m.style));
  return last ? getTherapistPrompt(last.style) : null;
}
