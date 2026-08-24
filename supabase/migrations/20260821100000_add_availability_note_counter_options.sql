/*
# Custom availability label + counter-style priced options

1. Changes to `products`
- `availability_note` (text, nullable): optional custom text the admin can set to replace the
  default "متوفر" availability label — e.g. "متوفر حسب الطلب" for made-to-order items.
  When set, the product is always treated as orderable regardless of `stock`.
- `counter_options` (jsonb, default '[]'): a list of stepper/counter priced options, similar in
  spirit to `option_groups` and `checkbox_options` but rendered as a +/- counter on the product
  page (e.g. "عدد الصفحات الإضافية"). Each entry has an id, a name, a step size (how much the
  counter changes per press), a price added per step, and optional min/max bounds.
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS availability_note text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS counter_options jsonb DEFAULT '[]'::jsonb;
