import { generateChatResponse } from '../geminiService';

export const generateDreamInterpretation = async (dream) => {
  const prompt = `As a dream interpreter with expertise in Jungian psychology and symbolism, please analyze this dream:
${dream}

Please provide:
1. Key symbols and their meanings
2. Possible psychological interpretations
3. Potential messages or insights
4. Practical advice based on the interpretation`;

  return generateChatResponse(prompt, 'dream-interpretation');
};