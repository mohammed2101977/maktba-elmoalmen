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
};

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
