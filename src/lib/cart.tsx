import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type Product,
  type SelectedOptions,
  emptySelectedOptions,
  computeUnitPrice,
  optionsKey,
} from '@/lib/supabase';

export type CartLine = {
  key: string; // product.id + optionsKey
  product: Product;
  qty: number;
  selected: SelectedOptions;
  unitPrice: number;
};

type CartContextType = {
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product, selected?: SelectedOptions, qty?: number) => void;
  removeLine: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = 'store_cart_v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  function addToCart(product: Product, selected: SelectedOptions = emptySelectedOptions(), qty: number = 1) {
    const key = `${product.id}__${optionsKey(selected)}`;
    const unitPrice = computeUnitPrice(product, selected);
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + qty } : c));
      }
      return [...prev, { key, product, qty, selected, unitPrice }];
    });
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }

  function setQty(key: string, qty: number) {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, qty: Math.max(1, qty) } : c)));
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.qty * c.unitPrice, 0);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, addToCart, removeLine, setQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
