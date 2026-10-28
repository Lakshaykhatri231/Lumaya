/*
  # Add nickname field to wallets array

  1. Changes
    - Add nickname field to wallets jsonb schema
    - Update existing wallets to include default nickname
    - Add validation for nickname in wallets array

  2. Notes
    - Existing wallets will get address as default nickname
    - New wallets must include nickname field
*/

DO $$ 
BEGIN
  -- Create a function to validate wallet jsonb structure
  CREATE OR REPLACE FUNCTION validate_wallet_jsonb()
  RETURNS trigger AS $$
  BEGIN
    IF NOT (
      SELECT bool_and(
        wallet ? 'nickname' AND 
        wallet ? 'address' AND 
        wallet ? 'monitorOptions'
      )
      FROM jsonb_array_elements(NEW.wallets) wallet
    ) THEN
      RAISE EXCEPTION 'Each wallet must contain nickname, address, and monitorOptions fields';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Update existing wallets to include nickname
  UPDATE users 
  SET wallets = (
    SELECT jsonb_agg(
      wallet || jsonb_build_object(
        'nickname',
        COALESCE(wallet->>'nickname', wallet->>'address')
      )
    )
    FROM jsonb_array_elements(wallets) wallet
  )
  WHERE jsonb_array_length(wallets) > 0;

  -- Create trigger for wallet validation
  DROP TRIGGER IF EXISTS validate_wallet_structure ON users;
  CREATE TRIGGER validate_wallet_structure
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_wallet_jsonb();
END $$;