import React, { useCallback, useEffect, useState } from 'react';
import { getInsights, getMoodAnalysis, getStats, getStreak, getSummary } from '../../services/journalService';
import MoodChart from './MoodChart';
import { Card, ErrorNote, GhostButton, MoodBadge, Spinner } from './ui';

// Each range pairs the mood window with the matching /insights timeframe
const RANGES = [
  { key: 'week', label: '7 days', days: 7 },
  { key: 'month', label: '30 days', days: 30 },
  { key: 'year', label: '1 year', days: 365 }
];

const Stat = ({ label, value, hint }) => (
  <div className="bg-background border border-primary/15 rounded-2xl p-4">
    <p className="text-xs uppercase tracking-wide text-primary/60">{label}</p>
    <p className="text-2xl font-semibold text-primary mt-1">{value}</p>
    {hint && <p className="text-xs text-primary/50 mt-0.5">{hint}</p>}
  </div>
);

const TREND_LABEL = { improving: 'Trending up', declining: 'Trending down', stable: 'Steady' };

const InsightsTab = ({ refreshKey }) => {
  const [range, setRange] = useState(RANGES[1]);
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState(null);
  const [mood, setMood] = useState(null);
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSummary(null);
    try {
      const end = new Date();
      const start = new Date(end.getTime() - range.days * 24 * 60 * 60 * 1000);
      const [s, st, m, i] = await Promise.all([
        getStats(), getStreak(), getMoodAnalysis(start, end), getInsights(range.key)
      ]);
      setStats(s); setStreak(st); setMood(m); setInsights(i);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const makeSummary = async () => {
    setSummarizing(true);
    try {
      const end = new Date();
      setSummary(await getSummary(new Date(end.getTime() - range.days * 24 * 60 * 60 * 1000), end));
    } catch (err) {
      setError(err.message);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) return <Spinner label="Reading your journal" />;

  return (
    <div className="space-y-6">
      <ErrorNote>{error}</ErrorNote>

      {stats && streak && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Entries" value={stats.totalEntries} hint={`${streak.totalDaysWritten} days written`} />
          <Stat label="Current streak" value={`${streak.currentStreak} day${streak.currentStreak === 1 ? '' : 's'}`}
            hint={streak.nextMilestone ? `Next milestone: ${streak.nextMilestone} days` : 'Every milestone reached'} />
          <Stat label="Longest streak" value={`${streak.longestStreak} day${streak.longestStreak === 1 ? '' : 's'}`} />
          <Stat label="Words per entry" value={stats.averageWordsPerEntry} hint={stats.mostActiveDay ? `Most active: ${stats.mostActiveDay}` : undefined} />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-primary">Mood</h3>
        <div role="group" aria-label="Time range" className="inline-flex rounded-lg border border-primary/20 overflow-hidden">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r)} aria-pressed={range.key === r.key}
              className={`px-3 py-1.5 text-sm ${range.key === r.key ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {mood && (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <MoodBadge mood={mood.overallMood} />
              <span className="text-sm text-primary/70">{TREND_LABEL[mood.moodTrend]} · average score {mood.moodScore}</span>
            </div>
            <MoodChart series={mood.series || []} />
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card title="What came up most">
              {mood.dominantEmotions.length === 0 ? <p className="text-sm text-primary/60">Nothing yet.</p> : (
                <ul className="space-y-2">
                  {mood.dominantEmotions.map(({ name, count }) => (
                    <li key={name} className="flex justify-between text-sm"><span className="capitalize">{name}</span><span className="text-primary/60">{count}×</span></li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Noticed">
              <ul className="space-y-2 text-sm list-disc pl-5">
                {mood.insights.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </Card>
          </div>
        </>
      )}

      {insights && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Writing habits">
            <ul className="space-y-1.5 text-sm">
              <li>{insights.writingPatterns.entries} entries · {insights.writingPatterns.entriesPerWeek} per week</li>
              <li>{insights.wordCount.total.toLocaleString()} words · {insights.wordCount.average} per entry</li>
              {insights.writingTime.length > 0 && (
                <li>Usually: {insights.writingTime.map((t) => `${t.name} (${t.count})`).join(', ')}</li>
              )}
            </ul>
          </Card>
          <Card title="Recurring themes">
            {insights.topicTrends.length === 0 ? <p className="text-sm text-primary/60">Themes will appear as you write.</p> : (
              <ul className="space-y-2">
                {insights.topicTrends.map(({ name, count }) => (
                  <li key={name} className="flex justify-between text-sm"><span>{name}</span><span className="text-primary/60">{count}×</span></li>
                ))}
              </ul>
            )}
          </Card>
          {insights.recommendations.length > 0 && (
            <Card title="Suggestions" className="md:col-span-2">
              <ul className="space-y-2 text-sm list-disc pl-5">{insights.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
            </Card>
          )}
        </div>
      )}

      <Card title="Summary of this period">
        {summary ? (
          <div className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap">{summary.summary}</p>
            {summary.insights?.length > 0 && <ul className="list-disc pl-5 space-y-1">{summary.insights.map((i) => <li key={i}>{i}</li>)}</ul>}
          </div>
        ) : (
          <GhostButton onClick={makeSummary} disabled={summarizing}>{summarizing ? 'Writing summary…' : `Summarize the last ${range.label}`}</GhostButton>
        )}
      </Card>
    </div>
  );
};

export default InsightsTab;
