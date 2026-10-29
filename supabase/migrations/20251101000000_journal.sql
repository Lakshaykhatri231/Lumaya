/*
  # Journal

  1. New tables
    - `journal_entries`: one row per journal entry, with the AI's mood/emotion analysis
    - `journal_reminders`: per-user reminder preferences (one row per user)

  2. Security
    - RLS on both tables; users can only touch their own rows.
      The backend calls Supabase with the caller's JWT, so these policies are what enforce isolation.
*/

CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL,
  mood text,
  mood_score numeric(4, 1),
  prompt_used text NOT NULL DEFAULT '',
  image_url text,
  voice_url text,
  tags text[] NOT NULL DEFAULT '{}',
  emotions text[] NOT NULL DEFAULT '{}',
  ai_insight text,
  patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  word_count integer NOT NULL DEFAULT 0,
  session_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx ON journal_entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS journal_entries_user_session_date_idx ON journal_entries (user_id, session_date);
CREATE INDEX IF NOT EXISTS journal_entries_tags_idx ON journal_entries USING gin (tags);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS journal_reminders (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  reminder_time text NOT NULL DEFAULT '20:00' CHECK (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE journal_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own journal reminders"
  ON journal_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal reminders"
  ON journal_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal reminders"
  ON journal_reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
