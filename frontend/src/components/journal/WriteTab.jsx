import React, { useEffect, useRef, useState } from 'react';
import { getInitialPrompt, submitEntry, getPersonalizedPrompts, dayKey } from '../../services/journalService';
import { ErrorNote, GhostButton, MoodBadge, PrimaryButton, Spinner, TagChip } from './ui';

const MAX_LENGTH = 10000;

const WriteTab = ({ onEntrySaved }) => {
  // The conversation is kept in the browser and sent along so the AI replies in context
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const endRef = useRef(null);

  const startSession = async () => {
    setLoadingPrompt(true);
    setError('');
    setSuggestions([]);
    try {
      const prompt = await getInitialPrompt();
      setMessages([{ role: 'assistant', content: prompt, timestamp: new Date().toISOString() }]);
    } catch (err) {
      setMessages([{ role: 'assistant', content: "What's on your mind today?", timestamp: new Date().toISOString() }]);
    } finally {
      setLoadingPrompt(false);
    }
  };

  useEffect(() => { startSession(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, saving]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const entry = draft.trim();
    if (!entry || saving) return;

    setSaving(true);
    setError('');
    const context = messages.map(({ role, content, timestamp }) => ({ role, content, timestamp }));

    try {
      const result = await submitEntry(entry, context, dayKey(new Date()));
      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: entry, timestamp: now },
        { role: 'assistant', content: result.response, timestamp: now, analysis: result.analysis },
        ...(result.nextPrompt ? [{ role: 'assistant', content: result.nextPrompt, timestamp: now, isPrompt: true }] : [])
      ]);
      setDraft('');
      onEntrySaved?.();
    } catch (err) {
      setError(err.message || 'Could not save your entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      setSuggestions(await getPersonalizedPrompts(4));
    } catch {
      setError('Could not load prompt ideas right now.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const usePrompt = (prompt) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: prompt, timestamp: new Date().toISOString(), isPrompt: true }]);
    setSuggestions([]);
  };

  if (loadingPrompt) return <Spinner label="Preparing your prompt" />;

  return (
    <div className="space-y-5">
      <div className="space-y-4" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              m.role === 'user'
                ? 'bg-primary text-white rounded-br-sm'
                : m.isPrompt
                  ? 'bg-background-secondary border border-primary/20 text-primary italic rounded-bl-sm'
                  : 'bg-background-secondary text-primary rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.analysis && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 not-italic">
                  <MoodBadge mood={m.analysis.mood} />
                  {(m.analysis.emotions || []).slice(0, 4).map((emotion) => <TagChip key={emotion}>{emotion}</TagChip>)}
                </div>
              )}
            </div>
          </div>
        ))}
        {saving && <Spinner label="Reflecting on your entry" />}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="journal-draft" className="sr-only">Your journal entry</label>
        <textarea
          id="journal-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Write freely. This space is only yours."
          className="w-full h-40 p-4 rounded-xl bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none resize-y"
        />
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={!draft.trim() || saving}>
            {saving ? 'Saving…' : 'Save entry'}
          </PrimaryButton>
          <GhostButton type="button" onClick={loadSuggestions} disabled={loadingSuggestions}>
            {loadingSuggestions ? 'Thinking…' : 'Give me a prompt'}
          </GhostButton>
          <GhostButton type="button" onClick={startSession} disabled={saving}>New session</GhostButton>
          <span className="ml-auto text-xs text-primary/50">{draft.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}</span>
        </div>
      </form>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-primary/60">Pick one to write about:</p>
          <div className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => usePrompt(s)}
                className="text-left px-4 py-2.5 rounded-lg border border-primary/20 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteTab;
