/*
  # Create stealth wallets table

  1. New Tables
    - `stealth_wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `wallet_address` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on stealth_wallets table
    - Add policies for users to manage their own stealth wallets
*/

CREATE TABLE IF NOT EXISTS stealth_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  wallet_address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stealth_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own stealth wallets"
  ON stealth_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stealth wallets"
  ON stealth_wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stealth wallets"
  ON stealth_wallets
  FOR DELETE
  USING (auth.uid() = user_id);