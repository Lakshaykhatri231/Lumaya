import React, { useCallback, useEffect, useState } from 'react';
import { dayKey, getEntriesForDate, getReminders, getStreak } from '../../services/journalService';
import WriteTab from './WriteTab';
import HistoryTab from './HistoryTab';
import InsightsTab from './InsightsTab';
import RemindersTab from './RemindersTab';

const TABS = [
  { id: 'write', label: 'Write' },
  { id: 'history', label: 'History' },
  { id: 'insights', label: 'Insights' },
  { id: 'reminders', label: 'Reminders' }
];

// True when today's reminder time has passed and nothing has been written yet today
const reminderDue = (settings, wroteToday, now = new Date()) => {
  if (!settings?.enabled || wroteToday) return false;
  if (!settings.days.includes(now.getDay())) return false;
  const [hours, minutes] = settings.time.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes;
};

const JournalPage = ({ initialTab = 'write' }) => {
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : 'write');
  // Bumped after an entry is saved or deleted so the other tabs reload
  const [refreshKey, setRefreshKey] = useState(0);
  const [streak, setStreak] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [wroteToday, setWroteToday] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const refreshHeader = useCallback(async () => {
    try {
      const [s, r, today] = await Promise.all([getStreak(), getReminders(), getEntriesForDate(new Date())]);
      setStreak(s);
      setReminders(r);
      setWroteToday(today.length > 0);
    } catch { /* the header is a nicety; the tabs report their own errors */ }
  }, []);

  useEffect(() => { refreshHeader(); }, [refreshHeader]);

  const handleChanged = () => {
    setRefreshKey((k) => k + 1);
    refreshHeader();
  };

  const showBanner = !dismissed && reminderDue(reminders, wroteToday);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary">Journal</h1>
            <p className="text-primary/70 mt-1">A private place to think out loud. Lumaya reflects back; only you see your entries.</p>
          </div>
          {streak && (
            <div className="text-right" title={streak.longestStreak ? `Longest streak: ${streak.longestStreak} days` : undefined}>
              <p className="text-3xl font-semibold text-primary leading-none">{streak.currentStreak}</p>
              <p className="text-xs text-primary/60 mt-1">day streak</p>
            </div>
          )}
        </header>

        {showBanner && (
          <div role="status" className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-background-secondary px-4 py-3">
            <p className="text-primary">It's time for your journal. Even a few lines count today.</p>
            <div className="flex gap-3 text-sm">
              <button className="font-medium text-primary underline" onClick={() => { setTab('write'); setDismissed(true); }}>Write now</button>
              <button className="text-primary/60" onClick={() => setDismissed(true)}>Later</button>
            </div>
          </div>
        )}

        <div role="tablist" aria-label="Journal sections" className="flex gap-1 border-b border-primary/15 mb-8 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              id={`journal-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`journal-panel-${id}`}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-primary/60 hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`journal-panel-${tab}`} aria-labelledby={`journal-tab-${tab}`}>
          {tab === 'write' && <WriteTab onEntrySaved={handleChanged} />}
          {tab === 'history' && <HistoryTab refreshKey={refreshKey} onChanged={handleChanged} />}
          {tab === 'insights' && <InsightsTab refreshKey={refreshKey} />}
          {tab === 'reminders' && <RemindersTab onSaved={(saved) => { setReminders(saved); setDismissed(false); }} />}
        </div>
      </div>
    </div>
  );
};

export default JournalPage;
