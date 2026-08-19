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
  gift_enabled: boolean;
  gift_min_qty: number;
  gift_description: string | null;
  gift_image: string | null;
};

export type Favorite = {
  id: string;
  customer_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
};

// A concrete selection made by a customer on a product's options.
export type SelectedOptions = {
  groups: Record<string, string>; // groupId -> choiceId
  checkboxes: string[]; // list of selected checkbox option ids
};

export function emptySelectedOptions(): SelectedOptions {
  return { groups: {}, checkboxes: [] };
}

// Computes the effective unit price of a product given its base/discount price
// plus any selected option-group choices and checkbox options.
// "add" choices add to the running price, "replace" choices override it entirely.
export function computeUnitPrice(product: Product, selected: SelectedOptions): number {
  let price = product.discount_price != null && product.discount_price < product.price
    ? product.discount_price
    : product.price;

  for (const group of product.option_groups ?? []) {
    const choiceId = selected.groups[group.id];
    if (!choiceId) continue;
    const choice = group.choices.find((c) => c.id === choiceId);
    if (!choice) continue;
    price = group.mode === 'replace' ? choice.price : price + choice.price;
  }

  for (const cb of product.checkbox_options ?? []) {
    if (!selected.checkboxes.includes(cb.id)) continue;
    price = cb.mode === 'replace' ? cb.price : price + cb.price;
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
    if (selected.checkboxes.includes(cb.id)) out.push({ group: cb.label, choice: 'مفعّل' });
  }
  return out;
}

// A stable string key that identifies a distinct cart line for the same product
// (different option selections = different cart lines).
export function optionsKey(selected: SelectedOptions): string {
  const groupsKey = Object.keys(selected.groups).sort().map((k) => `${k}:${selected.groups[k]}`).join('|');
  const cbKey = [...selected.checkboxes].sort().join('|');
  return `${groupsKey}__${cbKey}`;
}

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  password_hash: string;
  created_at: string;
};

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
