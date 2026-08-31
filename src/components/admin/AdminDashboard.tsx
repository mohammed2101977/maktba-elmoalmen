import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  Star,
  Search,
  Users,
  ClipboardList,
  Settings,
  UserCheck,
  KeyRound,
  Image as ImageIcon,
  Gift,
} from 'lucide-react';
import { supabase, ADMIN_PASSWORD, formatPrice, type Product, type Category } from '@/lib/supabase';
import ProductForm from './ProductForm';
import CategoryForm from './CategoryForm';
import CustomersTab from './CustomersTab';
import OrdersTab from './OrdersTab';
import SettingsTab from './SettingsTab';
import ActivationRequestsTab from './ActivationRequestsTab';
import PasswordResetRequestsTab from './PasswordResetRequestsTab';
import RatingsTab from './RatingsTab';
import DynamicIcon from '@/components/DynamicIcon';
import BannersTab from './BannersTab';
import GeneralGiftsTab from './GeneralGiftsTab';
import VisitStatsPanel from './VisitStatsPanel';

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'products' | 'categories' | 'orders' | 'customers' | 'activation' | 'passwordReset' | 'ratings' | 'banners' | 'gifts' | 'settings'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [activationCount, setActivationCount] = useState(0);
  const [passwordResetCount, setPasswordResetCount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem('admin_authed') === '1') setAuthed(true);
  }, []);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [authed]);

  async function fetchBadgeCounts() {
    const [actRes, pwRes, ordRes] = await Promise.all([
      supabase.from('activation_requests').select('id', { count: 'exact', head: true }),
      supabase.from('password_reset_requests').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'reviewing'),
    ]);
    setActivationCount(actRes.count ?? 0);
    setPasswordResetCount(pwRes.count ?? 0);
    setNewOrdersCount(ordRes.count ?? 0);
  }

  async function fetchData() {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').order('sort_order', { ascending: true }),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    ]);
    if (prodRes.data) setProducts(prodRes.data as Product[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    setLoading(false);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem('admin_authed', '1');
      setError('');
    } else {
      setError('كلمة المرور غير صحيحة');
    }
  }

  function handleLogout() {
    setAuthed(false);
    sessionStorage.removeItem('admin_authed');
    setPassword('');
  }

  async function deleteProduct(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchData();
  }

  async function deleteCategory(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟ لن يتم حذف المنتجات المرتبطة به.')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchData();
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mb-3">
              <LayoutDashboard size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-800">لوحة تحكم مكتبة المعلمين بالمنيا</h1>
            <p className="text-sm text-gray-500 mt-1">أدخل كلمة المرور للدخول</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 text-center text-lg font-bold focus:outline-none focus:border-brand-500 transition"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center font-semibold">{error}</p>}
            <button
              type="submit"
              className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition"
            >
              دخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const discountedCount = products.filter(
    (p) => p.discount_price != null && p.discount_price < p.price
  ).length;

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: <LayoutDashboard size={18} />, badge: 0 },
    { key: 'products', label: 'المنتجات', icon: <Package size={18} />, badge: 0 },
    { key: 'categories', label: 'الأقسام', icon: <FolderTree size={18} />, badge: 0 },
    { key: 'orders', label: 'الطلبات', icon: <ClipboardList size={18} />, badge: newOrdersCount },
    { key: 'customers', label: 'العملاء', icon: <Users size={18} />, badge: 0 },
    { key: 'activation', label: 'طلبات التفعيل', icon: <UserCheck size={18} />, badge: activationCount },
    { key: 'passwordReset', label: 'طلبات تغيير كلمة السر', icon: <KeyRound size={18} />, badge: passwordResetCount },
    { key: 'ratings', label: 'التقييمات', icon: <Star size={18} />, badge: 0 },
    { key: 'banners', label: 'الإعلانات', icon: <ImageIcon size={18} />, badge: 0 },
    { key: 'gifts', label: 'هدايا عامة', icon: <Gift size={18} />, badge: 0 },
    { key: 'settings', label: 'الإعدادات', icon: <Settings size={18} />, badge: 0 },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-gray-900 text-white lg:min-h-screen shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-gray-800">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <div className="font-bold text-sm">لوحة التحكم</div>
            <div className="text-xs text-gray-400">مكتبة المعلمين بالمنيا</div>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex lg:flex-col overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition whitespace-nowrap ${
                tab === t.key ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {t.icon}
              {t.label}
              {t.badge > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-extrabold leading-none">
                  {t.badge > 99 ? '99+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 mt-auto hidden lg:block">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm text-gray-300 hover:bg-red-900/50 hover:text-red-300 transition w-full"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
        {/* Overview */}
        {tab === 'overview' && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-extrabold text-gray-800 mb-6">نظرة عامة</h1>
            <VisitStatsPanel />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={<Package size={24} />} label="إجمالي المنتجات" value={products.length} color="bg-blue-500" />
              <StatCard icon={<FolderTree size={24} />} label="الأقسام" value={categories.length} color="bg-green-500" />
              <StatCard icon={<Star size={24} />} label="منتجات بتخفيض" value={discountedCount} color="bg-brand-500" />
              <StatCard icon={<Package size={24} />} label="إجمالي المخزون" value={totalStock} color="bg-purple-500" />
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-lg text-gray-800 mb-4">أحدث المنتجات</h2>
              <div className="space-y-2">
                {products.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {p.images[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-800 truncate">{p.name}</h4>
                      <p className="text-xs text-gray-500">
                        {formatPrice(p.price)}
                        {p.discount_price && p.discount_price < p.price && (
                          <span className="text-brand-600 font-bold mr-2">
                            → {formatPrice(p.discount_price)}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.stock > 0 ? `${p.stock} متوفر` : 'نفد'}
                    </span>
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="text-center text-gray-400 py-8">لا توجد منتجات بعد</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        {tab === 'products' && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h1 className="text-2xl font-extrabold text-gray-800">المنتجات</h1>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductForm(true);
                }}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-sm"
              >
                <Plus size={18} />
                إضافة منتج
              </button>
            </div>

            <div className="relative mb-4 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 pr-11 text-sm focus:outline-none focus:border-brand-500 transition"
              />
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Package size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-semibold">لا توجد منتجات</p>
                  <p className="text-sm">ابدأ بإضافة منتج جديد</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <table className="hidden md:block w-full">
                    <thead className="bg-gray-50 text-sm text-gray-500">
                      <tr>
                        <th className="text-right p-4 font-bold">المنتج</th>
                        <th className="text-right p-4 font-bold">ترتيب الظهور</th>
                        <th className="text-right p-4 font-bold">القسم</th>
                        <th className="text-right p-4 font-bold">السعر</th>
                        <th className="text-right p-4 font-bold">التخفيض</th>
                        <th className="text-right p-4 font-bold">المخزون</th>
                        <th className="text-right p-4 font-bold">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                {p.images[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <span className="font-bold text-gray-800 line-clamp-1 max-w-xs">{p.name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs">
                              {p.sort_order}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">{p.category?.name ?? '—'}</td>
                          <td className="p-4 font-semibold text-gray-700">{formatPrice(p.price)}</td>
                          <td className="p-4">
                            {p.discount_price && p.discount_price < p.price ? (
                              <span className="text-brand-600 font-bold">{formatPrice(p.discount_price)}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setShowProductForm(true);
                                }}
                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => deleteProduct(p.id)}
                                className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredProducts.map((p) => (
                      <div key={p.id} className="p-4 flex gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {p.images[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-800 truncate">{p.name}</h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-gray-100 text-gray-700 font-bold text-[11px]">
                              #{p.sort_order}
                            </span>
                            {p.category?.name ?? '—'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-sm text-gray-700">{formatPrice(p.price)}</span>
                            {p.discount_price && p.discount_price < p.price && (
                              <span className="text-brand-600 font-bold text-sm">{formatPrice(p.discount_price)}</span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setShowProductForm(true);
                              }}
                              className="flex items-center gap-1 text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded-lg"
                            >
                              <Pencil size={14} /> تعديل
                            </button>
                            <button
                              onClick={() => deleteProduct(p.id)}
                              className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-lg"
                            >
                              <Trash2 size={14} /> حذف
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        {tab === 'categories' && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h1 className="text-2xl font-extrabold text-gray-800">الأقسام</h1>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryForm(true);
                }}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-sm"
              >
                <Plus size={18} />
                إضافة قسم
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {categories.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <FolderTree size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-semibold">لا توجد أقسام</p>
                  <p className="text-sm">ابدأ بإضافة قسم جديد</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {categories.map((cat) => {
                    const count = products.filter((p) => p.category_id === cat.id).length;
                    return (
                      <div key={cat.id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition">
                        <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                          {cat.icon ? <DynamicIcon name={cat.icon} size={20} /> : <FolderTree size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-800">{cat.name}</h4>
                          <p className="text-xs text-gray-500">{count} منتج</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setShowCategoryForm(true);
                            }}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders */}
        {tab === 'orders' && <OrdersTab />}

        {/* Customers */}
        {tab === 'customers' && <CustomersTab />}

        {/* Activation requests */}
        {tab === 'activation' && <ActivationRequestsTab />}

        {/* Password reset requests */}
        {tab === 'passwordReset' && <PasswordResetRequestsTab />}

        {/* Ratings */}
        {tab === 'ratings' && <RatingsTab />}

        {/* Banners */}
        {tab === 'banners' && <BannersTab />}

        {/* General gifts */}
        {tab === 'gifts' && <GeneralGiftsTab />}

        {/* Settings */}
        {tab === 'settings' && <SettingsTab />}
      </main>

      {/* Product form modal */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onClose={() => setShowProductForm(false)}
          onSaved={() => {
            setShowProductForm(false);
            fetchData();
          }}
        />
      )}

      {/* Category form modal */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => setShowCategoryForm(false)}
          onSaved={() => {
            setShowCategoryForm(false);
            fetchData();
          }}
        />
      )}

      {/* Mobile logout */}
      <button
        onClick={handleLogout}
        className="lg:hidden fixed bottom-4 left-4 w-12 h-12 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5">
      <div className={`w-11 h-11 ${color} text-white rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-extrabold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 font-semibold">{label}</div>
    </div>
  );
}
