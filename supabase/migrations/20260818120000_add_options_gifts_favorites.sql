/*
# إضافة خيارات المنتج، الهدايا، المفضلة، وكود التحويل

1. تعديلات على جدول products
  - `option_groups` (jsonb): قوائم اختيار (مثل المقاس/اللون) لكل خيار سعر إضافة أو استبدال
  - `checkbox_options` (jsonb): خيارات شيك (نعم/لا) تضيف أو تستبدل السعر
  - `gift_enabled` (boolean): هل يوجد هدية مرتبطة بهذا المنتج
  - `gift_min_qty` (int): الحد الأدنى من الكمية للحصول على الهدية
  - `gift_description` (text): وصف الهدية
  - `gift_image` (text): صورة الهدية (اختياري)

2. تعديلات على جدول order_items
  - `selected_options` (jsonb): لقطة من الخيارات التي اختارها العميل وقت الشراء
  - `gift_earned` (text): وصف الهدية التي استحقها العميل في هذا العنصر (إن وجدت)

3. تعديلات على جدول orders
  - `transfer_code` (text): كود/رقم عملية التحويل الذي يدخله العميل عند تأكيد الشراء

4. جدول جديد: favorites
  - يربط العميل بالمنتجات التي أضافها للمفضلة (customer_id + product_id) لتظهر في صفحة حسابه

5. Security
  - نفس نمط الأمان المتبع في باقي الجداول (anon + authenticated لديهم صلاحيات كاملة لأن التطبيق يستخدم anon key بدون Supabase auth حقيقي)
*/

-- Products: options + gift
ALTER TABLE products ADD COLUMN IF NOT EXISTS option_groups jsonb NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS checkbox_options jsonb NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_min_qty int NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_image text;

-- Order items: options snapshot + gift earned
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_options jsonb NOT NULL DEFAULT '[]';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS gift_earned text;

-- Orders: transfer code entered by the customer at checkout
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transfer_code text;

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_favorites" ON favorites;
CREATE POLICY "anon_select_favorites" ON favorites FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_favorites" ON favorites;
CREATE POLICY "anon_insert_favorites" ON favorites FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_favorites" ON favorites;
CREATE POLICY "anon_delete_favorites" ON favorites FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_favorites_customer ON favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product ON favorites(product_id);
