import test from 'node:test';
import assert from 'node:assert/strict';
import { JournalService } from '../src/services/journalService.js';

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return JournalService.toDateKey(d);
};

test('tags are trimmed, lowercased, de-duplicated and capped', () => {
  assert.deepEqual(JournalService.normalizeTags(['  Work ', 'work', 'Family', 42, '']), ['work', 'family']);
  assert.equal(JournalService.normalizeTags(Array.from({ length: 40 }, (_, i) => `t${i}`)).length, 20);
});

test('streak counts consecutive days ending today', () => {
  const entries = [0, 1, 2].map((n) => ({ session_date: dayOffset(n) }));
  assert.equal(JournalService.calculateStreak(entries), 3);
});

test('streak is still alive if the last entry was yesterday', () => {
  const entries = [1, 2].map((n) => ({ session_date: dayOffset(n) }));
  assert.equal(JournalService.calculateStreak(entries), 2);
});

test('streak resets after a gap', () => {
  const entries = [3, 4].map((n) => ({ session_date: dayOffset(n) }));
  assert.equal(JournalService.calculateStreak(entries), 0);
});

test('several entries on the same day count once', () => {
  const entries = [{ session_date: dayOffset(0) }, { session_date: dayOffset(0) }, { session_date: dayOffset(1) }];
  assert.equal(JournalService.calculateStreak(entries), 2);
});

test('countBy ranks values and ignores empties', () => {
  assert.deepEqual(JournalService.countBy(['a', 'b', 'a', null, 'a', 'b'], 2), [
    { name: 'a', count: 3 },
    { name: 'b', count: 2 }
  ]);
});

// A chainable stand-in for the Supabase query builder that resolves to fixed rows
function fakeEntriesClient(rows) {
  const builder = {
    select: () => builder, eq: () => builder, gte: () => builder, lte: () => builder, order: () => builder,
    then: (resolve) => resolve({ data: rows, error: null })
  };
  return { from: () => builder };
}

test('mood analysis reports trend, dominant emotions and a daily series', async () => {
  const rows = [-4, -3, 3, 5].map((score, i) => ({
    created_at: `2030-01-0${i + 1}T10:00:00Z`,
    session_date: `2030-01-0${i + 1}`,
    mood_score: score,
    emotions: score > 0 ? ['hopeful'] : ['sad'],
    tags: []
  }));
  const result = await JournalService.getMoodAnalysis(fakeEntriesClient(rows), 'u1', new Date(0), new Date());

  assert.equal(result.moodTrend, 'improving');
  assert.equal(result.series.length, 4);
  assert.equal(result.dominantEmotions.length, 2);
  assert.equal(result.moodScore, 0.3);
});

test('csv export quotes cells and embeds commas safely', async () => {
  const rows = [{
    created_at: '2030-01-01T10:00:00Z', session_date: '2030-01-01', title: 'Good, bad', mood: 'mixed',
    mood_score: 1, tags: ['a', 'b'], content: 'He said "hi"', ai_insight: ''
  }];
  const csv = await JournalService.exportEntries(fakeEntriesClient(rows), 'u1', new Date(0), new Date(), 'csv');

  assert.match(csv.split('\n')[1], /"Good, bad"/);
  assert.match(csv, /"He said ""hi"""/);
});
