/*
  # Retire the wallet-era validation trigger

  This project started as a crypto wallet tracker. The `users` table (and the `stealth_wallets`
  and `watchlist` tables) are no longer used by the app.

  This only removes the trigger that rejects rows without wallet data. The tables and their data
  are left in place; drop them yourself once you're sure nothing needs them:

    DROP TABLE IF EXISTS watchlist, stealth_wallets, users;
*/

DROP TRIGGER IF EXISTS validate_wallet_structure ON users;
DROP FUNCTION IF EXISTS validate_wallet_jsonb();
