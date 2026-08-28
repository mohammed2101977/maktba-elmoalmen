/*
# Offer countdown, manual "unavailable" flag, and store visit tracking

1. Changes to `products`
- `offer_ends_at` (timestamptz, nullable): when set, the product's discount price is only
  treated as a live "offer" while `now() < offer_ends_at`, and the storefront shows a
  countdown next to it. Once the deadline passes, the offer countdown/badge disappears and
  the product falls back to its normal price — until the admin sets a new deadline.
- `unavailable` (boolean, default false): manual admin override. When true, the storefront
  shows a disabled "المنتج غير موجود الآن" button instead of the normal add-to-cart button.

2. New Tables
- `store_visits`: one row per unique visitor session per day, used to compute "visitors today"
  and per-day visit counts for the admin overview.
- `store_presence`: one row per active visitor session (upserted via id = session id), holding
  `last_seen`. Used to compute how many people are on the store right now (recent last_seen).

3. Security
- RLS enabled on both new tables with the same permissive anon policy pattern used elsewhere
  in this app (no real Supabase Auth session is used anywhere, including the admin dashboard).
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unavailable boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS store_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_store_visits" ON store_visits;
CREATE POLICY "anon_select_store_visits" ON store_visits FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_store_visits" ON store_visits;
CREATE POLICY "anon_insert_store_visits" ON store_visits FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_store_visits_visited_at ON store_visits(visited_at);

CREATE TABLE IF NOT EXISTS store_presence (
  id text PRIMARY KEY,
  last_seen timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_store_presence" ON store_presence;
CREATE POLICY "anon_select_store_presence" ON store_presence FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_store_presence" ON store_presence;
CREATE POLICY "anon_insert_store_presence" ON store_presence FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_store_presence" ON store_presence;
CREATE POLICY "anon_update_store_presence" ON store_presence FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_store_presence_last_seen ON store_presence(last_seen);
