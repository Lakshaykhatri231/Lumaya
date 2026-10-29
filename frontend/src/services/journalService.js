import { apiFetch } from './apiClient';

const isoDay = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dayKey = isoDay;
export const monthKey = (date) => isoDay(date).slice(0, 7);

const J = '/api/journal';

export const getInitialPrompt = () => apiFetch(`${J}/initial-prompt`).then((r) => r.prompt);

export const submitEntry = (entry, conversationContext, sessionDate) =>
  apiFetch(`${J}/entry`, { method: 'POST', body: { entry, conversationContext, sessionDate } });

export const getPersonalizedPrompts = (count = 5) =>
  apiFetch(`${J}/personalized-prompts`, { query: { count } }).then((r) => r.prompts);

export const getCalendar = (month) => apiFetch(`${J}/calendar`, { query: { month } }).then((r) => r.days);

export const getEntriesForDate = (date) => apiFetch(`${J}/entries/${dayKey(date)}`).then((r) => r.entries);

export const deleteEntry = (entryId) => apiFetch(`${J}/entry/${entryId}`, { method: 'DELETE' });

export const searchEntries = (query) => apiFetch(`${J}/search`, { query: { query } });

export const getAllTags = () => apiFetch(`${J}/tags`).then((r) => r.tags);

export const getEntriesByTag = (tag) => apiFetch(`${J}/entries/by-tag`, { query: { tag } });

export const tagEntry = (entryId, tags) =>
  apiFetch(`${J}/entry/${entryId}/tags`, { method: 'POST', body: { tags } }).then((r) => r.tags);

export const getStats = () => apiFetch(`${J}/stats`);

export const getStreak = () => apiFetch(`${J}/streak`);

export const getMoodAnalysis = (startDate, endDate) =>
  apiFetch(`${J}/mood-analysis`, { query: { startDate: startDate.toISOString(), endDate: endDate?.toISOString() } });

export const getInsights = (timeframe) => apiFetch(`${J}/insights`, { query: { timeframe } });

export const getSummary = (startDate, endDate) =>
  apiFetch(`${J}/summary`, { query: { startDate: startDate.toISOString(), endDate: endDate?.toISOString() } });

export const getReminders = () => apiFetch(`${J}/reminders`).then((r) => r.settings);

export const saveReminders = (settings) =>
  apiFetch(`${J}/reminders`, { method: 'POST', body: settings }).then((r) => r.settings);

/** Downloads an export as a file in the browser. */
export const downloadExport = async (startDate, endDate, format) => {
  const response = await apiFetch(`${J}/export`, {
    query: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), format },
    raw: true
  });
  const blob = format === 'json' ? new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' }) : await response.blob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lumaya-journal-${dayKey(startDate)}_to_${dayKey(endDate)}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
