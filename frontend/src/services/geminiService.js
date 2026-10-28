import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const generateChatResponse = async (prompt, context = '') => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const chat = model.startChat({
      history: context ? [{ role: 'user', parts: context }] : []
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
};

export const generateTherapyResponse = async (prompt, type) => {
  const contextMap = {
    'dream': 'You are an expert dream interpreter with deep knowledge of Jungian psychology and symbolism. Help interpret dreams with compassion and insight.',
    'mental-health': 'You are a professional mental health counselor creating personalized mental wellness plans. Focus on actionable steps and evidence-based strategies.',
    'life-prediction': 'You are an AI life coach using data and patterns to provide insights about potential future paths. Always maintain ethical boundaries and emphasize personal agency.',
    'relationship': 'You are an experienced relationship counselor offering empathetic guidance on interpersonal dynamics. Focus on healthy communication and boundaries.'
  };

  const context = contextMap[type] || '';
  return generateChatResponse(prompt, context);
};