import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Product } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type FavoritesContextType = {
  favoriteIds: string[];
  favoriteProducts: Product[];
  loading: boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product) => void;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      refresh();
    } else {
      setFavoriteIds([]);
      setFavoriteProducts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  async function refresh() {
    if (!customer) return;
    setLoading(true);
    const { data } = await supabase
      .from('favorites')
      .select('product_id, product:products(*, category:categories(*))')
      .eq('customer_id', customer.id);
    if (data) {
      const rows = data as unknown as { product_id: string; product: Product | null }[];
      const products = rows.map((row) => row.product).filter((p): p is Product => !!p);
      setFavoriteIds(rows.map((row) => row.product_id));
      setFavoriteProducts(products);
    }
    setLoading(false);
  }

  function isFavorite(productId: string) {
    return favoriteIds.includes(productId);
  }

  async function toggleFavorite(product: Product) {
    if (!customer) return;
    const already = favoriteIds.includes(product.id);
    if (already) {
      setFavoriteIds((prev) => prev.filter((id) => id !== product.id));
      setFavoriteProducts((prev) => prev.filter((p) => p.id !== product.id));
      await supabase.from('favorites').delete().eq('customer_id', customer.id).eq('product_id', product.id);
    } else {
      setFavoriteIds((prev) => [...prev, product.id]);
      setFavoriteProducts((prev) => [...prev, product]);
      await supabase.from('favorites').insert({ customer_id: customer.id, product_id: product.id });
    }
  }

  return (
    <FavoritesContext.Provider value={{ favoriteIds, favoriteProducts, loading, isFavorite, toggleFavorite, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
