import { generateChatResponse } from '../geminiService';

export const generateLifePrediction = async (data) => {
  const prompt = `As a life coach and advisor, please analyze this situation and provide insights:
Current Situation: ${data.currentSituation}
Aspirations: ${data.aspirations}
Concerns: ${data.concerns}
Timeframe: ${data.timeframe}

Please provide:
1. Potential paths and opportunities
2. Challenges to prepare for
3. Actionable steps toward goals
4. Resources and skills to develop
5. Timeline recommendations`;

  return generateChatResponse(prompt, 'life-prediction');
};