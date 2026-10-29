import { apiFetch } from './apiClient';

// The guided tools (dream, mental-health, life-prediction, relationship) build their own prompt;
// the model itself is only ever called from the backend.
export const generateTherapyResponse = async (prompt, type) => {
  const data = await apiFetch('/api/tools/generate', { method: 'POST', body: { prompt, type } });
  return data.response;
};
