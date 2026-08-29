/*
# Grouped checkboxes with a max-selection cap + per-checkbox quantity multiplier

1. Changes to `products`
- `checkbox_groups` (jsonb, default '[]'): groups of checkboxes shown together under one
  heading, with an optional maximum number of selections allowed within the group
  (e.g. "اختر حتى 2 إضافات"). Each item within a group can also have `has_quantity: true`,
  which shows the customer a 1-5 "العدد" stepper that multiplies that item's price.
  This is additive — existing standalone `checkbox_options` keep working unchanged, and now
  also support the same optional `has_quantity` field.
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS checkbox_groups jsonb DEFAULT '[]'::jsonb;
