/*
# Store ad banners + cart-wide "spend X, get gift" tiers

1. New Tables
- `store_banners`: ad/promo images shown at the top of the storefront, above the products.
  Each has an image, an optional link to open when tapped, an active flag, and a sort order.
- `store_gifts`: general gifts that apply to the whole cart (not tied to one product), unlike
  the existing per-product gift on `products`. Each gift has a name, image, and a threshold —
  either a minimum total quantity of items in the cart ('quantity') or a minimum cart amount
  in EGP ('amount'). Multiple gifts (and multiple tiers) can be active at once. Because these
  are genuine promotions, the gift's image/name is meant to be shown to the customer *before*
  checkout (e.g. in the cart), unlike the per-product gift which is only revealed after the
  order is placed.

2. Security
- RLS enabled with the same permissive anon policy pattern used elsewhere in this app.
*/

CREATE TABLE IF NOT EXISTS store_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_store_banners" ON store_banners;
CREATE POLICY "anon_select_store_banners" ON store_banners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_store_banners" ON store_banners;
CREATE POLICY "anon_insert_store_banners" ON store_banners FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_store_banners" ON store_banners;
CREATE POLICY "anon_update_store_banners" ON store_banners FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_store_banners" ON store_banners;
CREATE POLICY "anon_delete_store_banners" ON store_banners FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS store_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  threshold_type text NOT NULL DEFAULT 'amount' CHECK (threshold_type IN ('quantity', 'amount')),
  threshold_value numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_store_gifts" ON store_gifts;
CREATE POLICY "anon_select_store_gifts" ON store_gifts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_store_gifts" ON store_gifts;
CREATE POLICY "anon_insert_store_gifts" ON store_gifts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_store_gifts" ON store_gifts;
CREATE POLICY "anon_update_store_gifts" ON store_gifts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_store_gifts" ON store_gifts;
CREATE POLICY "anon_delete_store_gifts" ON store_gifts FOR DELETE
  TO anon, authenticated USING (true);
