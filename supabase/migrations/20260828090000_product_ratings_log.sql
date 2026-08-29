/*
# Product ratings log

1. New Tables
- `product_ratings`: one row per star-rating a customer submits on a product page.
  Stores the product name and star count as a snapshot (so it still reads correctly even if
  the product is later renamed or removed), plus the customer's name if they were logged in
  at the time, or NULL for anonymous/guest ratings (shown as "مجهول" in the dashboard).

2. Security
- RLS enabled with the same permissive anon policy pattern used elsewhere in this app.
*/

CREATE TABLE IF NOT EXISTS product_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_product_ratings" ON product_ratings;
CREATE POLICY "anon_select_product_ratings" ON product_ratings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_product_ratings" ON product_ratings;
CREATE POLICY "anon_insert_product_ratings" ON product_ratings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_product_ratings_created_at ON product_ratings(created_at);
