import React, { useCallback, useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './journal.css';
import {
  deleteEntry, downloadExport, getAllTags, getCalendar, getEntriesByTag, getEntriesForDate,
  monthKey, dayKey, searchEntries, tagEntry
} from '../../services/journalService';
import { Card, ErrorNote, formatDay, GhostButton, MoodBadge, PrimaryButton, Spinner, TagChip } from './ui';

const EXPORT_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 }
];

// Dot colour on the calendar follows the day's average mood score
const dotClass = (score) =>
  score > 1 ? 'bg-green-600' : score < -1 ? 'bg-rose-500' : 'bg-amber-500';

const EntryCard = ({ entry, onDelete, onTagsChange }) => {
  const [newTag, setNewTag] = useState('');
  const [confirming, setConfirming] = useState(false);

  const addTag = (e) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (!tag || (entry.tags || []).includes(tag)) { setNewTag(''); return; }
    onTagsChange(entry, [...(entry.tags || []), tag]);
    setNewTag('');
  };

  return (
    <article className="bg-background border border-primary/15 rounded-2xl p-5 space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-primary">{entry.title || 'Untitled entry'}</h4>
          <p className="text-xs text-primary/50">
            {new Date(entry.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            {entry.word_count ? ` · ${entry.word_count} words` : ''}
          </p>
        </div>
        <MoodBadge mood={entry.mood} />
      </header>

      <p className="whitespace-pre-wrap text-primary/90">{entry.content}</p>

      {entry.ai_insight && (
        <p className="text-sm italic text-primary/70 border-l-2 border-primary/30 pl-3">{entry.ai_insight}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {(entry.tags || []).map((tag) => (
          <TagChip key={tag} onRemove={() => onTagsChange(entry, entry.tags.filter((t) => t !== tag))}>{tag}</TagChip>
        ))}
        <form onSubmit={addTag} className="inline-flex">
          <label className="sr-only" htmlFor={`tag-${entry.id}`}>Add tag</label>
          <input
            id={`tag-${entry.id}`}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="+ tag"
            maxLength={30}
            className="w-20 px-2 py-0.5 text-xs rounded-full bg-transparent border border-dashed border-primary/30 focus:outline-none focus:border-primary"
          />
        </form>
      </div>

      <footer className="flex justify-end">
        {confirming ? (
          <span className="flex items-center gap-2 text-sm">
            Delete this entry?
            <button className="text-rose-600 font-medium" onClick={() => onDelete(entry)}>Yes, delete</button>
            <button className="text-primary/60" onClick={() => setConfirming(false)}>Cancel</button>
          </span>
        ) : (
          <button className="text-sm text-primary/50 hover:text-rose-600" onClick={() => setConfirming(true)}>Delete</button>
        )}
      </footer>
    </article>
  );
};

const HistoryTab = ({ refreshKey, onChanged }) => {
  const [selected, setSelected] = useState(new Date());
  const [activeMonth, setActiveMonth] = useState(monthKey(new Date()));
  const [calendarDays, setCalendarDays] = useState({});
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [filter, setFilter] = useState(null); // { label, entries } when searching or filtering by tag

  const [exportDays, setExportDays] = useState(30);
  const [exportFormat, setExportFormat] = useState('md');
  const [exporting, setExporting] = useState(false);

  const loadCalendar = useCallback(async () => {
    try {
      const days = await getCalendar(activeMonth);
      setCalendarDays(Object.fromEntries(days.map((d) => [d.date, d])));
    } catch { /* the calendar is decoration; entries still load */ }
  }, [activeMonth]);

  const loadDay = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEntries(await getEntriesForDate(selected));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const loadTags = useCallback(async () => {
    try { setTags(await getAllTags()); } catch { /* optional */ }
  }, []);

  useEffect(() => { loadCalendar(); }, [loadCalendar, refreshKey]);
  useEffect(() => { loadDay(); }, [loadDay, refreshKey]);
  useEffect(() => { loadTags(); }, [loadTags, refreshKey]);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) { setFilter(null); return; }
    setError('');
    try {
      const result = await searchEntries(query.trim());
      setFilter({ label: `Search: “${query.trim()}”`, entries: result.entries });
    } catch (err) { setError(err.message); }
  };

  const filterByTag = async (tag) => {
    setError('');
    try {
      const result = await getEntriesByTag(tag);
      setFilter({ label: `Tag: ${tag}`, entries: result.entries });
    } catch (err) { setError(err.message); }
  };

  const clearFilter = () => { setFilter(null); setQuery(''); };

  const replaceEntry = (updated) => {
    const swap = (list) => list.map((e) => (e.id === updated.id ? updated : e));
    setEntries(swap);
    setFilter((f) => (f ? { ...f, entries: swap(f.entries) } : f));
  };

  const handleTagsChange = async (entry, nextTags) => {
    try {
      const saved = await tagEntry(entry.id, nextTags);
      replaceEntry({ ...entry, tags: saved });
      loadTags();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (entry) => {
    try {
      await deleteEntry(entry.id);
      const drop = (list) => list.filter((e) => e.id !== entry.id);
      setEntries(drop);
      setFilter((f) => (f ? { ...f, entries: drop(f.entries) } : f));
      loadCalendar();
      loadTags();
      onChanged?.();
    } catch (err) { setError(err.message); }
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const end = new Date();
      const start = new Date(end.getTime() - exportDays * 24 * 60 * 60 * 1000);
      await downloadExport(start, end, exportFormat);
    } catch (err) { setError(err.message); }
    finally { setExporting(false); }
  };

  const shown = filter ? filter.entries : entries;

  return (
    <div className="grid lg:grid-cols-[22rem_1fr] gap-8">
      <aside className="space-y-6">
        <Calendar
          className="journal-calendar"
          value={selected}
          onChange={(date) => { setSelected(date); setFilter(null); }}
          onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setActiveMonth(monthKey(activeStartDate))}
          maxDate={new Date()}
          tileContent={({ date, view }) => {
            const day = view === 'month' ? calendarDays[dayKey(date)] : null;
            return day ? <span className={`journal-day-dot ${dotClass(day.averageMoodScore)}`} title={`${day.count} entr${day.count === 1 ? 'y' : 'ies'}`} /> : null;
          }}
        />
        <p className="text-xs text-primary/50 -mt-3 px-1">A dot marks a day you wrote. Green leaned positive, amber mixed, red heavier.</p>

        <Card title="Export">
          <div className="space-y-3">
            <div className="flex gap-2">
              <select aria-label="Export range" value={exportDays} onChange={(e) => setExportDays(Number(e.target.value))}
                className="flex-1 p-2 rounded-lg bg-background border border-primary/20">
                {EXPORT_RANGES.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}
              </select>
              <select aria-label="Export format" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}
                className="p-2 rounded-lg bg-background border border-primary/20">
                <option value="md">Markdown</option>
                <option value="txt">Text</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <GhostButton className="w-full" onClick={handleExport} disabled={exporting}>{exporting ? 'Preparing…' : 'Download'}</GhostButton>
          </div>
        </Card>
      </aside>

      <div className="space-y-5 min-w-0">
        <form onSubmit={runSearch} className="flex gap-2">
          <label htmlFor="journal-search" className="sr-only">Search your entries</label>
          <input id="journal-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your entries…"
            className="flex-1 p-3 rounded-lg bg-background border border-primary/20 focus:ring-2 focus:ring-primary focus:outline-none" />
          <PrimaryButton type="submit">Search</PrimaryButton>
        </form>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Filter by tag">
            {tags.slice(0, 20).map(({ tag, count }) => (
              <TagChip key={tag} onClick={() => filterByTag(tag)} active={filter?.label === `Tag: ${tag}`}>{tag} · {count}</TagChip>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">
            {filter ? `${filter.label} (${filter.entries.length})` : formatDay(dayKey(selected))}
          </h3>
          {filter && <button className="text-sm text-primary/60 hover:text-primary underline" onClick={clearFilter}>Back to calendar</button>}
        </div>

        <ErrorNote>{error}</ErrorNote>

        {loading && !filter ? <Spinner label="Loading entries" /> : shown.length === 0 ? (
          <p className="text-primary/60 py-10 text-center">{filter ? 'Nothing matched.' : 'No entries for this day.'}</p>
        ) : (
          <div className="space-y-4">
            {shown.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} onTagsChange={handleTagsChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
