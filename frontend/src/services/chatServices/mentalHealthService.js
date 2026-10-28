import { generateChatResponse } from '../geminiService';

export const generateMentalHealthPlan = async (data) => {
  const prompt = `As a mental health professional, please create a personalized wellness plan based on:
Goals: ${data.goals}
Current Challenges: ${data.challenges}
Current Strategies: ${data.currentStrategies}
Support System: ${data.supportSystem}

Please provide:
1. Short-term actionable steps
2. Long-term strategies
3. Coping mechanisms
4. Self-care recommendations
5. When to seek professional help`;

  return generateChatResponse(prompt, 'mental-health');
};