/*
# Manual WhatsApp verification (free replacement for the automated OTP/UltraMsg flow)

1. Changes
- `customers.is_active`: new boolean column. New signups start as `false` (not activated) until an
  admin manually sends them their activation code over WhatsApp and they enter it correctly.
  Existing customers default to `true` so nobody already registered gets locked out.

2. New Tables
- `activation_requests`: one row per customer waiting for account activation.
  Holds the customer's name/phone, the activation code to send them on WhatsApp, and a `sent`
  flag the admin toggles once the WhatsApp message has actually been sent.
- `password_reset_requests`: one row per customer waiting to set a new password.
  Same shape as `activation_requests` — code to send on WhatsApp + a `sent` flag.

  Both rows are deleted automatically once the customer successfully enters the correct code
  (see the app's `activateAccount` / `confirmPasswordReset` functions), which is how they
  disappear from their respective admin sections.

3. Security
- RLS enabled on both new tables.
- Same permissive anon policy pattern as the rest of the schema (this app has no real
  Supabase Auth session — the whole app, including the admin dashboard, uses the anon key).
*/

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Activation requests (account activation via WhatsApp code)
CREATE TABLE IF NOT EXISTS activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activation_requests" ON activation_requests;
CREATE POLICY "anon_select_activation_requests" ON activation_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activation_requests" ON activation_requests;
CREATE POLICY "anon_insert_activation_requests" ON activation_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activation_requests" ON activation_requests;
CREATE POLICY "anon_update_activation_requests" ON activation_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activation_requests" ON activation_requests;
CREATE POLICY "anon_delete_activation_requests" ON activation_requests FOR DELETE
  TO anon, authenticated USING (true);

-- Password reset requests (change/forgot password via WhatsApp code)
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  code text NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_password_reset_requests" ON password_reset_requests;
CREATE POLICY "anon_select_password_reset_requests" ON password_reset_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_password_reset_requests" ON password_reset_requests;
CREATE POLICY "anon_insert_password_reset_requests" ON password_reset_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_password_reset_requests" ON password_reset_requests;
CREATE POLICY "anon_update_password_reset_requests" ON password_reset_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_password_reset_requests" ON password_reset_requests;
CREATE POLICY "anon_delete_password_reset_requests" ON password_reset_requests FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_activation_requests_phone ON activation_requests(phone);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_phone ON password_reset_requests(phone);
