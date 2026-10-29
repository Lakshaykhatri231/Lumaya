/*
  # Subscriptions (Paddle)

  1. New table
    - `subscriptions`: kept in sync by the Paddle webhook (backend/src/routes/webhookRoutes.js)

  2. Security
    - Users may read their own subscription.
    - Nobody but the service role writes: the webhook uses the service-role key, which bypasses RLS.
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paddle_user_id text,
  subscription_id text NOT NULL,
  plan_id text,
  status text NOT NULL,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subscription_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);
