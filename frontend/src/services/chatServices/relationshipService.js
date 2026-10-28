import { generateChatResponse } from '../geminiService';

export const generateRelationshipAdvice = async (data) => {
  const prompt = `As a relationship counselor, please provide guidance based on:
Current Situation: ${data.situation}
Challenges: ${data.challenges}
Goals: ${data.goals}
History: ${data.history}

Please provide:
1. Analysis of the situation
2. Communication strategies
3. Action steps for improvement
4. Boundary-setting recommendations
5. Red flags to watch for`;

  return generateChatResponse(prompt, 'relationship');
};