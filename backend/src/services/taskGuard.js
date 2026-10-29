// Spots messages that ask Lumaya to *do a task* (maths, code, puzzles, homework, translation, trivia)
// or to step out of character (jailbreaks, "which model are you?"), as opposed to talking about feelings.
//
// These patterns are deliberately tight and directive ("write me a script", "what is 12 * 7?") so that people
// talking about their lives ("my job is coding and I'm burnt out", "I have a maths exam and I'm terrified")
// are never caught. They are the offline fail-safe; the LLM read in userStateService handles the subtle cases.

export const TASK_KINDS = ['math', 'code', 'puzzle', 'homework', 'translation', 'trivia', 'jailbreak', 'model_probe'];

const PATTERNS = {
  jailbreak: [
    /\bignore (?:all |any |your |the |my |previous |prior |above |earlier )*(?:instructions|rules|prompt|guidelines|restrictions|programming)\b/i,
    /\b(?:system|hidden|initial|original) prompt\b/i,
    /\b(?:reveal|show|print|repeat|leak|tell me)\s+(?:me\s+)?(?:your|the)\s+(?:instructions|prompt|rules|guidelines|programming|configuration)\b/i,
    /\b(?:you are now|from now on,? you|pretend (?:that )?you(?:'re| are)|act as if you(?:'re| were| are)|developer mode|jailbreak|do anything now)\b/i,
    /\bDAN\b/
  ],
  model_probe: [
    /\bwhat (?:model|llm|ai|language model) are you\b/i,
    /\bwhich (?:model|llm|ai|language model)\b[^.?!]{0,20}\byou\b/i,
    /\bare you (?:chat ?gpt|gpt|gemini|claude|llama|an? (?:ai|bot|robot|llm|language model))\b/i,
    /\bwho (?:made|built|created|trained|programmed) you\b/i,
    /\bwhat are you (?:built|made|running|powered) (?:on|with|by)\b/i,
    /\bwhat (?:is|'s) your (?:training data|architecture|tech stack)\b/i
  ],
  code: [
    /```/,
    /\b(?:def|function|class)\s+\w+\s*\(/,
    /\b(?:console\.log|System\.out\.println|#include\s*<|import\s+\w+\s+from|SELECT\s+.+\s+FROM)\b/i,
    /\b(?:write|create|make|build|generate|code|fix|debug|explain|convert|refactor|optimi[sz]e)\b[^.?!]{0,40}\b(?:code|script|program|function|algorithm|sql query|query|regex|html|css|api|snake game|calculator|website|web app|bot)\b/i,
    /\b(?:fix|debug)\b[^.?!]{0,40}\b(?:bug|error|exception|stack trace)\b/i
  ],
  math: [
    // an actual sum, ending in "=" or "?"
    /(?:^|\s)\d[\d.,]*\s*[+\-*/×÷^x]\s*\d[\d.,]*\s*(?:[+\-*/×÷^x]\s*\d[\d.,]*\s*)*[=?]/i,
    /\b(?:what(?:'s| is)|calculate|compute|evaluate|simplify|find)\b[^.?!]{0,40}(?:\d[\d.,]*\s*[+\-*/×÷^]\s*\d|\d+\s*%\s*of|square root|factorial|derivative|integral|\bsum of\b|\bproduct of\b|\blcm\b|\bgcd\b)/i,
    /\bsolve\b[^.?!]{0,40}(?:=|\bfor [a-z]\b)/i,
    /\b(?:derivative|integral|differentiate|quadratic equation|pythagorean theorem|square root of|factorial of|is \d+ (?:a )?prime)\b/i
  ],
  puzzle: [
    /\b(?:solve|give me|tell me|got|here(?:'s| is))\s+(?:me\s+)?(?:a |an |this |the )?(?:riddle|puzzle|brain ?teaser|logic (?:puzzle|question))\b/i
  ],
  homework: [
    /\b(?:write|draft|do|finish|complete|help me with)\b[^.?!]{0,30}\b(?:essay|homework|assignment|thesis|term paper|book report|lab report)\b/i,
    /\b(?:summari[sz]e|paraphrase)\b[^.?!]{0,20}\b(?:this|the)\s+(?:article|text|passage|chapter|paper)\b/i
  ],
  translation: [
    /\btranslate\b[^.?!]{0,80}\b(?:to|into)\s+[a-z]+/i
  ],
  trivia: [
    /\b(?:capital of|population of|speed of light|boiling point|who (?:invented|discovered)|who won the|what year (?:did|was)|president of|prime minister of)\b/i
  ]
};

// Order matters: stepping out of character outranks the rest
const ORDER = ['jailbreak', 'model_probe', 'code', 'math', 'puzzle', 'homework', 'translation', 'trivia'];

// A long message is someone telling their story, even if it mentions code or maths
const MAX_WORDS_FOR_TASK = 60;

export function heuristicTask(message) {
  const text = (message || '').trim();
  if (!text) return 'none';
  if (text.split(/\s+/).length > MAX_WORDS_FOR_TASK) return 'none';

  for (const kind of ORDER) {
    if (PATTERNS[kind].some((pattern) => pattern.test(text))) return kind;
  }
  return 'none';
}
