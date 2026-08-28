import { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingCart, Star, Menu, X, ChevronLeft, Heart, User, Phone, Clock, Gift } from 'lucide-react';
import {
  supabase,
  formatPrice,
  isOfferLive,
  fetchRatingSummaries,
  fetchActiveBanners,
  fetchActiveGifts,
  earnedGeneralGifts,
  type Product,
  type Category,
  type SelectedOptions,
  type RatingSummary,
  type StoreBanner,
  type StoreGift,
  emptySelectedOptions,
  describeSelectedOptions,
} from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useFavorites } from '@/lib/favorites';
import ProductModal from './ProductModal';
import CountdownTimer from './CountdownTimer';
import CheckoutModal from './CheckoutModal';
import AuthModal from '@/components/auth/AuthModal';
import { useStoreVisitTracking } from '@/lib/visitTracking';

export default function StoreFront() {
  useStoreVisitTracking();
  const { customer } = useAuth();
  const { cart, cartCount, cartTotal, addToCart, removeLine, setQty, clearCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'activate'>('login');
  // Bumping this forces a re-render so an expired offer's price flips back immediately.
  const [, setOfferTick] = useState(0);
  const bumpOfferTick = () => setOfferTick((t) => t + 1);
  const [showAuth, setShowAuth] = useState(false);
  const [ratingSummaries, setRatingSummaries] = useState<Record<string, RatingSummary>>({});
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [generalGifts, setGeneralGifts] = useState<StoreGift[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').order('sort_order', { ascending: true }),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    ]);
    if (prodRes.data) setProducts(prodRes.data as Product[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    setLoading(false);
    fetchRatingSummaries().then(setRatingSummaries);
    fetchActiveBanners().then(setBanners);
    fetchActiveGifts().then(setGeneralGifts);
  }

  function handleRatingSubmitted(productId: string, summary: RatingSummary) {
    setRatingSummaries((prev) => ({ ...prev, [productId]: summary }));
  }

  const filteredProducts = useMemo(() => {
    // Products without a category are treated as drafts/unlisted and never shown in the store.
    let list = products.filter((p) => !!p.category_id);
    if (activeCategory) {
      list = list.filter((p) => p.category_id === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategory, search]);

  const featuredProducts = useMemo(() => products.filter((p) => p.featured && !!p.category_id), [products]);

  function getEffectivePrice(p: Product) {
    return isOfferLive(p) ? (p.discount_price as number) : p.price;
  }

  function getDiscountPercent(p: Product) {
    if (!isOfferLive(p)) return 0;
    return Math.round(((p.price - (p.discount_price as number)) / p.price) * 100);
  }

  function hasConfigurableOptions(p: Product) {
    return (p.option_groups?.length ?? 0) > 0 || (p.checkbox_options?.length ?? 0) > 0 || (p.checkbox_groups?.length ?? 0) > 0 || (p.counter_options?.length ?? 0) > 0;
  }

  // Quick add from the product card: if the product has options that affect price,
  // open the modal so the customer picks them first; otherwise add straight to cart.
  function quickAdd(product: Product) {
    if (hasConfigurableOptions(product)) {
      setSelectedProduct(product);
      return;
    }
    addToCart(product, emptySelectedOptions());
  }

  function handleFavoriteClick(product: Product) {
    if (!customer) {
      setShowAuth(true);
      return;
    }
    toggleFavorite(product);
  }

  function handleCheckout() {
    if (!customer) {
      setAuthInitialMode('login');
      setShowAuth(true);
      return;
    }
    if (!customer.is_active) {
      setAuthInitialMode('activate');
      setShowAuth(true);
      return;
    }
    setShowCheckout(true);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-brand-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center gap-3 h-16">
            <button
              className="lg:hidden p-2 hover:bg-brand-700 rounded-lg transition"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>

            <a href="#/" className="flex items-center gap-2 shrink-0">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-brand-600 font-extrabold text-lg">م ع</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-extrabold text-lg leading-tight">مكتبة المعلمين بالمنيا</div>
                <div className="text-xs text-brand-100">متجرك التعليمي الأول</div>
              </div>
            </a>

            {/* Search - desktop inline */}
            <div className="hidden lg:block flex-1 max-w-2xl mx-2">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="w-full h-10 rounded-lg px-4 pr-11 text-gray-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="flex-1 lg:hidden" />

            {/* Contact link */}
            <a href="#/contact" className="p-2 hover:bg-brand-700 rounded-lg transition shrink-0" title="اتصل بنا">
              <Phone size={22} />
            </a>

            {/* Account icon */}
            <a href="#/account" className="relative p-2 hover:bg-brand-700 rounded-lg transition shrink-0" title="حسابي">
              <User size={22} />
            </a>

            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 hover:bg-brand-700 rounded-lg transition shrink-0"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-brand-100 text-brand-800 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search - mobile full-width row */}
        <div className="lg:hidden max-w-7xl mx-auto px-3 pb-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full h-12 rounded-xl px-4 pr-12 text-gray-800 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 shadow-sm"
            />
            <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </header>

      {/* Category nav bar */}
      <nav className="bg-brand-700 text-white sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="hidden lg:flex items-center gap-1 h-11 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition whitespace-nowrap ${
                !activeCategory ? 'bg-brand-800' : 'hover:bg-brand-600'
              }`}
            >
              كل المنتجات
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition whitespace-nowrap ${
                  activeCategory === cat.id ? 'bg-brand-800' : 'hover:bg-brand-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-fade-in overflow-y-auto">
            <div className="bg-brand-600 text-white p-4 flex items-center justify-between">
              <span className="font-bold text-lg">الأقسام</span>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  setActiveCategory(null);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-right px-4 py-3 rounded-lg font-semibold transition ${
                  !activeCategory ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-100'
                }`}
              >
                كل المنتجات
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-right px-4 py-3 rounded-lg font-semibold transition ${
                    activeCategory === cat.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero banner */}
      {!search && !activeCategory && featuredProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-l from-brand-600 to-brand-500 text-white p-6 sm:p-10">
            <div className="relative z-10 max-w-lg">
              <h2 className="text-2xl sm:text-4xl font-extrabold mb-2">عروض خاصة</h2>
              <p className="text-brand-100 mb-4 text-sm sm:text-base">تشكيلة مختارة من أفضل المنتجات بأسعار مخفضة لفترة محدودة</p>
              <button
                onClick={() => {
                  const el = document.getElementById('featured');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white text-brand-700 font-bold px-6 py-2.5 rounded-lg hover:bg-brand-50 transition text-sm"
              >
                تسوق الآن
              </button>
            </div>
            <div className="absolute left-0 bottom-0 w-1/2 h-full opacity-20 bg-[radial-gradient(circle_at_left,white,transparent)]" />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        {/* Ad banners */}
        {banners.length > 0 && (
          <div className="mb-8 -mx-3 sm:mx-0 px-3 sm:px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-1">
            {banners.map((banner) => {
              const content = (
                <img
                  src={banner.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              );
              return (
                <div key={banner.id} className="shrink-0 w-full snap-center rounded-2xl overflow-hidden shadow-sm aspect-[21/6] sm:aspect-[21/5] bg-gray-100">
                  {banner.link_url ? (
                    <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      {content}
                    </a>
                  ) : (
                    content
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Featured */}
        {!search && !activeCategory && featuredProducts.length > 0 && (
          <section id="featured" className="mb-8">
            <h3 className="text-xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              <Star size={22} className="text-brand-500 fill-brand-500" />
              منتجات مميزة
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {featuredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isFavorite={isFavorite(p.id)}
                  onFavorite={() => handleFavoriteClick(p)}
                  onClick={() => setSelectedProduct(p)}
                  onAddToCart={() => quickAdd(p)}
                  getEffectivePrice={getEffectivePrice}
                  getDiscountPercent={getDiscountPercent}
                  onOfferExpire={bumpOfferTick}
                  ratingSummary={ratingSummaries[p.id]}
                />
              ))}
            </div>
          </section>
        )}

        {/* All products / filtered */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-extrabold text-gray-800">
              {activeCategory
                ? categories.find((c) => c.id === activeCategory)?.name ?? 'المنتجات'
                : search
                ? `نتائج البحث: "${search}"`
                : 'كل المنتجات'}
            </h3>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="text-sm text-brand-600 font-semibold hover:underline flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                كل المنتجات
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
                  <div className="w-full aspect-square bg-gray-200 rounded-lg mb-3" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-semibold">لا توجد منتجات</p>
              <p className="text-sm">جرّب البحث بكلمات أخرى أو تصفح كل الأقسام</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isFavorite={isFavorite(p.id)}
                  onFavorite={() => handleFavoriteClick(p)}
                  onClick={() => setSelectedProduct(p)}
                  onAddToCart={() => quickAdd(p)}
                  getEffectivePrice={getEffectivePrice}
                  getDiscountPercent={getDiscountPercent}
                  onOfferExpire={bumpOfferTick}
                  ratingSummary={ratingSummaries[p.id]}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-extrabold text-lg">م ع</span>
              </div>
              <span className="font-extrabold text-white text-lg">مكتبة المعلمين بالمنيا</span>
            </div>
            <p className="text-sm text-gray-400">متجرك التعليمي الأول لكل احتياجات المعلم والطالب</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#/" className="hover:text-brand-400 transition">الرئيسية</a></li>
              <li><a href="#/contact" className="hover:text-brand-400 transition">اتصل بنا</a></li>
              <li><a href="#/account" className="hover:text-brand-400 transition">حسابي</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">تواصل معنا</h4>
            <p className="text-sm text-gray-400">متاحون لخدمتك دائماً</p>
          </div>
        </div>
        <div className="border-t border-gray-800 py-4 text-center text-sm text-gray-500">
          © 2026 مكتبة المعلمين بالمنيا. جميع الحقوق محفوظة.
        </div>
      </footer>

      {/* Product modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(selected: SelectedOptions) => addToCart(selectedProduct, selected)}
          ratingSummary={ratingSummaries[selectedProduct.id]}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl animate-fade-in flex flex-col">
            <div className="bg-brand-600 text-white p-4 flex items-center justify-between">
              <span className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart size={22} />
                سلة التسوق ({cartCount})
              </span>
              <button onClick={() => setCartOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length > 0 && generalGifts.length > 0 && (
                <div className="space-y-2 mb-4">
                  {generalGifts.map((gift) => {
                    const current = gift.threshold_type === 'amount' ? cartTotal : cartCount;
                    const earned = current >= gift.threshold_value;
                    const remaining = Math.max(0, gift.threshold_value - current);
                    const progressPct = Math.min(100, (current / gift.threshold_value) * 100);
                    return (
                      <div key={gift.id} className={`rounded-xl overflow-hidden border-2 ${earned ? 'border-green-300 bg-green-50' : 'border-brand-100 bg-brand-50'}`}>
                        {gift.image_url && (
                          <div className="w-full aspect-[16/9] bg-gray-100">
                            <img src={gift.image_url} alt={gift.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Gift size={16} className={earned ? 'text-green-600' : 'text-brand-600'} />
                            <span className="font-bold text-sm text-gray-800">{gift.name}</span>
                          </div>
                          {earned ? (
                            <p className="text-xs text-green-700 font-semibold">مبروك! هذه الهدية ستُضاف مع طلبك 🎉</p>
                          ) : (
                            <>
                              <p className="text-xs text-gray-600 mb-1.5">
                                {gift.threshold_type === 'amount'
                                  ? `أضف منتجات بقيمة ${formatPrice(remaining)} أخرى للحصول عليها`
                                  : `أضف ${remaining} قطعة أخرى للحصول عليها`}
                              </p>
                              <div className="h-1.5 rounded-full bg-white overflow-hidden">
                                <div className="h-full bg-brand-500 transition-all" style={{ width: `${progressPct}%` }} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="font-semibold">سلتك فارغة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const optionLabels = describeSelectedOptions(item.product, item.selected);
                    return (
                      <div key={item.key} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                        <img
                          src={item.product.images[0] || 'https://placehold.co/100'}
                          alt={item.product.name}
                          className="w-16 h-16 rounded-lg object-cover bg-gray-200"
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.product.name}</h4>
                          {optionLabels.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {optionLabels.map((o) => `${o.group}: ${o.choice}`).join(' · ')}
                            </p>
                          )}
                          <p className="text-brand-600 font-bold text-sm">
                            {formatPrice(item.unitPrice)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => setQty(item.key, item.qty - 1)}
                              className="w-7 h-7 rounded-md bg-gray-200 hover:bg-gray-300 font-bold text-sm"
                            >
                              -
                            </button>
                            <span className="font-bold text-sm w-6 text-center">{item.qty}</span>
                            <button
                              onClick={() => setQty(item.key, item.qty + 1)}
                              className="w-7 h-7 rounded-md bg-gray-200 hover:bg-gray-300 font-bold text-sm"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeLine(item.key)}
                              className="mr-auto text-red-500 text-xs font-semibold hover:underline"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center justify-between font-bold text-lg">
                  <span>الإجمالي:</span>
                  <span className="text-brand-600">{formatPrice(cartTotal)}</span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition">
                  إتمام الطلب
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          onClose={() => setShowCheckout(false)}
          onOrderPlaced={() => {
            clearCart();
            setCartOpen(false);
          }}
          onRequireAuth={() => {
            setShowCheckout(false);
            setAuthInitialMode(customer && !customer.is_active ? 'activate' : 'login');
            setShowAuth(true);
          }}
        />
      )}

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          initialMode={authInitialMode}
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            if (authInitialMode === 'activate') return;
            setShowAuth(false);
            if (cart.length > 0) setShowCheckout(true);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  isFavorite,
  onFavorite,
  onClick,
  onAddToCart,
  getEffectivePrice,
  getDiscountPercent,
  onOfferExpire,
  ratingSummary,
}: {
  product: Product;
  isFavorite: boolean;
  onFavorite: () => void;
  onClick: () => void;
  onAddToCart: () => void;
  getEffectivePrice: (p: Product) => number;
  getDiscountPercent: (p: Product) => number;
  onOfferExpire?: () => void;
  ratingSummary?: RatingSummary;
}) {
  const discount = getDiscountPercent(product);
  const price = getEffectivePrice(product);
  const hasOptions = (product.option_groups?.length ?? 0) > 0 || (product.checkbox_options?.length ?? 0) > 0 || (product.checkbox_groups?.length ?? 0) > 0 || (product.counter_options?.length ?? 0) > 0;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingCart size={40} />
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
            -{discount}%
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="absolute top-2 left-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:scale-110 transition"
        >
          <Heart size={18} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h4 className="font-bold text-sm text-gray-800 line-clamp-2 mb-1 leading-snug">{product.name}</h4>
        {product.category?.name && (
          <span className="text-xs text-gray-400 mb-2">{product.category.name}</span>
        )}
        <div className="flex items-center gap-1 mb-2">
          {(ratingSummary?.count ?? 0) > 0 ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  className={i < Math.round(ratingSummary?.avg ?? 0) ? 'fill-brand-400 text-brand-400' : 'text-gray-200'}
                />
              ))}
              <span className="text-[11px] text-gray-400">({ratingSummary?.count})</span>
            </>
          ) : (
            <span className="text-[11px] text-gray-300">لا يوجد تقييمات</span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="text-lg font-extrabold text-brand-600">{price.toFixed(2)}</span>
          <span className="text-xs text-gray-500">ج.م</span>
          {discount > 0 && (
            <span className="text-xs text-gray-400 line-through">{product.price.toFixed(2)}</span>
          )}
          {hasOptions && <span className="text-xs text-gray-400">وأكثر</span>}
        </div>
        {discount > 0 && product.offer_ends_at && (
          <div className="flex items-center gap-1 text-red-500 mt-1">
            <Clock size={12} />
            <span className="text-xs">ينتهي العرض خلال</span>
            <CountdownTimer endsAt={product.offer_ends_at} onExpire={onOfferExpire} compact />
          </div>
        )}
        {product.unavailable ? (
          <button disabled className="mt-2 w-full bg-gray-100 text-gray-400 font-bold text-sm py-2 rounded-lg cursor-not-allowed">
            المنتج غير موجود الآن
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            className="mt-2 w-full bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-sm py-2 rounded-lg transition"
          >
            {hasOptions ? 'اختر واطلب' : 'أضف للسلة'}
          </button>
        )}
      </div>
    </div>
  );
}
