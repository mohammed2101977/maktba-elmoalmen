import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
};

export type OptionChoice = {
  id: string;
  label: string;
  price: number;
};

export type OptionGroup = {
  id: string;
  name: string;
  mode: 'add' | 'replace';
  choices: OptionChoice[];
};

export type CheckboxOption = {
  id: string;
  label: string;
  mode: 'add' | 'replace';
  price: number;
  has_quantity?: boolean; // if true, shows a 1-10 "العدد" stepper that multiplies the price
};

// A set of checkboxes grouped together with an optional maximum number of selections
// (e.g. "اختر حتى 2 من الإضافات"). max_selections of 0 means unlimited.
export type CheckboxGroup = {
  id: string;
  name: string;
  max_selections: number;
  items: CheckboxOption[];
};

export type CounterOption = {
  id: string;
  name: string;
  step: number; // how much the counter value changes per +/- press
  price_per_step: number; // price added to the product price for every `step` increment
  min: number;
  max: number | null;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  images: string[];
  video_url: string | null;
  stock: number;
  rating: number;
  featured: boolean;
  sort_order: number;
  created_at: string;
  category?: Category | null;
  option_groups: OptionGroup[];
  checkbox_options: CheckboxOption[];
  checkbox_groups: CheckboxGroup[];
  counter_options: CounterOption[];
  availability_note: string | null;
  offer_ends_at: string | null;
  unavailable: boolean;
  gift_enabled: boolean;
  gift_min_qty: number;
  gift_description: string | null;
  gift_image: string | null;
};

export type ProductRating = {
  id: string;
  product_id: string | null;
  product_name: string;
  customer_id: string | null;
  customer_name: string | null;
  stars: number;
  created_at: string;
};

// Records a customer's star rating for a product (best-effort, fire-and-forget from the
// caller's perspective). Anonymous/guest customers are stored with customer_name = null,
// shown as "مجهول" in the admin dashboard.
export async function submitProductRating(
  product: Product,
  stars: number,
  customer: { id: string; name: string } | null
): Promise<void> {
  await supabase.from('product_ratings').insert({
    product_id: product.id,
    product_name: product.name,
    customer_id: customer?.id ?? null,
    customer_name: customer?.name ?? null,
    stars,
  });
}

export type Favorite = {
  id: string;
  customer_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
};

// Whether a product's discount price is currently a "live" offer: it must actually be a
// discount, and if a deadline is set, that deadline must not have passed yet. Once the
// deadline passes, the offer is treated as over (falls back to normal price) until the
// admin sets a new `offer_ends_at`.
export function isOfferLive(product: Product): boolean {
  if (product.discount_price == null || product.discount_price >= product.price) return false;
  if (!product.offer_ends_at) return true;
  return new Date(product.offer_ends_at).getTime() > Date.now();
}

// A concrete selection made by a customer on a product's options.
export type SelectedOptions = {
  groups: Record<string, string>; // groupId -> choiceId
  checkboxes: string[]; // list of selected standalone checkbox option ids
  checkboxGroups: Record<string, string[]>; // groupId -> selected item ids within that group
  checkboxQuantities: Record<string, number>; // checkbox/item id -> quantity (1-10), for has_quantity items
  counters: Record<string, number>; // counterId -> current value
};

export function emptySelectedOptions(): SelectedOptions {
  return { groups: {}, checkboxes: [], checkboxGroups: {}, checkboxQuantities: {}, counters: {} };
}

// Computes the effective price contribution of a single checkbox item, accounting for
// its optional 1-10 "العدد" quantity multiplier.
function checkboxItemPrice(item: CheckboxOption, quantities: Record<string, number>): number {
  const qty = item.has_quantity ? Math.min(10, Math.max(1, quantities[item.id] ?? 1)) : 1;
  return item.price * qty;
}

// Computes the effective unit price of a product given its base/discount price
// plus any selected option-group choices, checkbox options/groups, and counter options.
// "add" choices add to the running price, "replace" choices override it entirely.
export function computeUnitPrice(product: Product, selected: SelectedOptions): number {
  let price = isOfferLive(product) ? (product.discount_price as number) : product.price;

  for (const group of product.option_groups ?? []) {
    const choiceId = selected.groups[group.id];
    if (!choiceId) continue;
    const choice = group.choices.find((c) => c.id === choiceId);
    if (!choice) continue;
    price = group.mode === 'replace' ? choice.price : price + choice.price;
  }

  for (const cb of product.checkbox_options ?? []) {
    if (!selected.checkboxes.includes(cb.id)) continue;
    const value = checkboxItemPrice(cb, selected.checkboxQuantities);
    price = cb.mode === 'replace' ? value : price + value;
  }

  for (const group of product.checkbox_groups ?? []) {
    const selectedIds = selected.checkboxGroups[group.id] ?? [];
    for (const item of group.items) {
      if (!selectedIds.includes(item.id)) continue;
      const value = checkboxItemPrice(item, selected.checkboxQuantities);
      price = item.mode === 'replace' ? value : price + value;
    }
  }

  for (const counter of product.counter_options ?? []) {
    const value = selected.counters[counter.id] ?? counter.min ?? 0;
    const steps = counter.step > 0 ? value / counter.step : 0;
    price += steps * counter.price_per_step;
  }

  return Math.max(0, price);
}

// Human-readable summary of the chosen options, for cart/order display + snapshotting.
export function describeSelectedOptions(product: Product, selected: SelectedOptions): { group: string; choice: string }[] {
  const out: { group: string; choice: string }[] = [];
  for (const group of product.option_groups ?? []) {
    const choiceId = selected.groups[group.id];
    if (!choiceId) continue;
    const choice = group.choices.find((c) => c.id === choiceId);
    if (choice) out.push({ group: group.name, choice: choice.label });
  }
  for (const cb of product.checkbox_options ?? []) {
    if (!selected.checkboxes.includes(cb.id)) continue;
    const qty = cb.has_quantity ? Math.min(10, Math.max(1, selected.checkboxQuantities[cb.id] ?? 1)) : null;
    out.push({ group: cb.label, choice: qty ? `العدد: ${qty}` : 'مفعّل' });
  }
  for (const group of product.checkbox_groups ?? []) {
    const selectedIds = selected.checkboxGroups[group.id] ?? [];
    for (const item of group.items) {
      if (!selectedIds.includes(item.id)) continue;
      const qty = item.has_quantity ? Math.min(10, Math.max(1, selected.checkboxQuantities[item.id] ?? 1)) : null;
      out.push({ group: group.name, choice: qty ? `${item.label} (العدد: ${qty})` : item.label });
    }
  }
  for (const counter of product.counter_options ?? []) {
    const value = selected.counters[counter.id] ?? counter.min ?? 0;
    if (value > 0) out.push({ group: counter.name, choice: String(value) });
  }
  return out;
}

// A stable string key that identifies a distinct cart line for the same product
// (different option selections = different cart lines).
export function optionsKey(selected: SelectedOptions): string {
  const groupsKey = Object.keys(selected.groups).sort().map((k) => `${k}:${selected.groups[k]}`).join('|');
  const cbKey = [...selected.checkboxes].sort().join('|');
  const cbGroupsKey = Object.keys(selected.checkboxGroups).sort()
    .map((k) => `${k}:${[...selected.checkboxGroups[k]].sort().join(',')}`).join('|');
  const cbQtyKey = Object.keys(selected.checkboxQuantities).sort().map((k) => `${k}:${selected.checkboxQuantities[k]}`).join('|');
  const counterKey = Object.keys(selected.counters).sort().map((k) => `${k}:${selected.counters[k]}`).join('|');
  return `${groupsKey}__${cbKey}__${cbGroupsKey}__${cbQtyKey}__${counterKey}`;
}

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
};

// A pending account-activation request, created on signup and resolved manually
// by the store admin sending the code over WhatsApp.
export type ActivationRequest = {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  code: string;
  sent: boolean;
  created_at: string;
};

// A pending password-change/reset request, resolved the same way.
export type PasswordResetRequest = {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  code: string;
  sent: boolean;
  created_at: string;
};

// Generates a 6-digit verification code (used for both activation and password-reset requests).
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  selected_options: { group: string; choice: string }[];
  gift_earned: string | null;
};

export type Order = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items_total: number;
  delivery_fee: number;
  grand_total: number;
  payment_method: string;
  delivery_method: string;
  transfer_code: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type StoreSettings = {
  id: number;
  minya_delivery_fee: number;
  outside_minya_shipping: number;
  instapay_number: string;
  vodafone_cash_number: string;
  whatsapp_number: string;
  updated_at: string;
};

export const ADMIN_PASSWORD = '2666';

export const CURRENCY = 'ج.م';

export function formatPrice(price: number): string {
  return `${price.toFixed(2)} ${CURRENCY}`;
}

// Simple hash for password storage (client-side, not crypto-secure but adequate for this app)
export function hashPassword(password: string): string {
  let hash = 0;
  const salt = 'mM2026salt';
  const combined = password + salt;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}${combined.length}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
