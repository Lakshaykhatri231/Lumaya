import React, { useEffect, useState } from 'react';
import { getReminders, saveReminders } from '../../services/journalService';
import { Card, ErrorNote, PrimaryButton, Spinner } from './ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const RemindersTab = ({ onSaved }) => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getReminders().then(setSettings).catch((err) => setError(err.message));
  }, []);

  if (!settings) return error ? <ErrorNote>{error}</ErrorNote> : <Spinner label="Loading" />;

  const toggleDay = (day) =>
    setSettings((s) => ({ ...s, days: s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day].sort() }));

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveReminders(settings);
      setSettings(saved);
      setMessage('Saved.');
      onSaved?.(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <Card title="Daily reminder">
        <div className="space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="h-5 w-5 accent-[rgb(var(--color-primary))]" />
            <span>Remind me to journal</span>
          </label>

          <div className={settings.enabled ? '' : 'opacity-50 pointer-events-none'}>
            <label htmlFor="reminder-time" className="block text-sm text-primary/70 mb-1">Time</label>
            <input id="reminder-time" type="time" value={settings.time} onChange={(e) => setSettings({ ...settings, time: e.target.value })}
              className="p-2 rounded-lg bg-background border border-primary/20" />

            <fieldset className="mt-4">
              <legend className="text-sm text-primary/70 mb-2">Days</legend>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((label, day) => (
                  <button key={label} type="button" aria-pressed={settings.days.includes(day)} onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${settings.days.includes(day) ? 'bg-primary text-white border-primary' : 'border-primary/30 text-primary hover:bg-primary/10'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <ErrorNote>{error}</ErrorNote>
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryButton>
            {message && <span role="status" className="text-sm text-primary/70">{message}</span>}
          </div>
        </div>
      </Card>
      <p className="text-sm text-primary/60">
        Reminders appear at the top of your journal when you open it after your chosen time and haven't written that day.
        Lumaya doesn't send emails or push notifications for them.
      </p>
    </div>
  );
};

export default RemindersTab;
