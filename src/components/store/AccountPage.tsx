import { useEffect, useState } from 'react';
import { User, KeyRound, Package, ArrowRight, Printer, ChevronLeft, ShoppingBag, Heart, ShoppingCart, Gift, ShieldAlert } from 'lucide-react';
import { supabase, formatPrice, type Order, type OrderItem } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/favorites';
import { useCart } from '@/lib/cart';
import { emptySelectedOptions } from '@/lib/supabase';
import AuthModal from '@/components/auth/AuthModal';

const statusLabels: Record<string, string> = { reviewing: 'جارٍ المراجعة', preparing: 'تم التجهيز', shipping: 'الشحن', delivered: 'تم التسليم' };
const statusColors: Record<string, string> = { reviewing: 'bg-amber-100 text-amber-700', preparing: 'bg-blue-100 text-blue-700', shipping: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700' };
const deliveryLabels: Record<string, string> = { pickup: 'استلام من المتجر', minya: 'توصيل داخل المنيا', outside_minya: 'توصيل خارج المنيا' };

export default function AccountPage() {
  const { customer, logout } = useAuth();
  const { favoriteProducts, loading: favLoading, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const [tab, setTab] = useState<'orders' | 'favorites'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (customer) fetchOrders();
    else setLoading(false);
  }, [customer]);

  async function fetchOrders() {
    if (!customer) return;
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false });
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }

  async function viewOrder(order: Order) {
    setSelectedOrder(order);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    if (data) setOrderItems(data as OrderItem[]);
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><User size={32} className="text-white" /></div>
          <h1 className="text-xl font-extrabold text-gray-800 mb-2">حسابي</h1>
          <p className="text-gray-500 text-sm mb-6">سجّل دخولك لعرض طلباتك ومفضلتك وإدارة حسابك</p>
          <button onClick={() => setShowAuth(true)} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition">تسجيل الدخول / إنشاء حساب</button>
          <a href="#/" className="block text-center mt-4 text-sm text-gray-500 hover:text-brand-600">العودة للمتجر</a>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={fetchOrders} />}
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => setSelectedOrder(null)} className="text-brand-600 hover:underline flex items-center gap-1 text-sm mb-4"><ArrowRight size={18} /> العودة لطلباتي</button>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-gray-800">تفاصيل الطلب</h2>
              <button onClick={() => window.print()} className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-lg transition"><Printer size={16} /> طباعة الفاتورة</button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">رقم الطلب:</span><span className="font-semibold">#{selectedOrder.id.slice(0, 8)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span><span className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString('ar-EG')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الحالة:</span><span className={`font-bold px-2 py-0.5 rounded text-xs ${statusColors[selectedOrder.status]}`}>{statusLabels[selectedOrder.status]}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">طريقة التسليم:</span><span className="font-semibold">{deliveryLabels[selectedOrder.delivery_method] ?? selectedOrder.delivery_method}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">العنوان:</span><span className="font-semibold text-left max-w-[60%]">{selectedOrder.customer_address}</span></div>
            </div>
            <h3 className="font-bold text-gray-800 mb-3">المنتجات</h3>
            <div className="space-y-3">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">{item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.product_name}</h4>
                    <p className="text-xs text-gray-500">{item.quantity} × {formatPrice(item.unit_price)}</p>
                    {item.selected_options?.length > 0 && (
                      <p className="text-xs text-gray-400">{item.selected_options.map((o) => `${o.group}: ${o.choice}`).join(' · ')}</p>
                    )}
                    {item.gift_earned && (
                      <p className="text-xs text-brand-600 font-semibold flex items-center gap-1 mt-0.5"><Gift size={12} /> هدية: {item.gift_earned}</p>
                    )}
                  </div>
                  <span className="font-bold text-sm text-brand-600 whitespace-nowrap">{formatPrice(item.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">إجمالي المنتجات</span><span className="font-semibold">{formatPrice(selectedOrder.items_total)}</span></div>
              {selectedOrder.delivery_fee > 0 && <div className="flex justify-between"><span className="text-gray-500">مصاريف التوصيل</span><span className="font-semibold">{formatPrice(selectedOrder.delivery_fee)}</span></div>}
              <div className="flex justify-between text-base font-extrabold text-gray-800"><span>الإجمالي</span><span className="text-brand-600">{formatPrice(selectedOrder.grand_total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => (window.location.hash = '#/')} className="text-brand-600 hover:underline flex items-center gap-1 text-sm mb-4"><ArrowRight size={18} /> العودة للمتجر</button>
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center"><User size={32} className="text-white" /></div>
            <div><h1 className="text-xl font-extrabold text-gray-800">{customer.name}</h1><p className="text-sm text-gray-500" dir="ltr">{customer.phone}</p></div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 mb-4"><span className="font-semibold text-gray-700">العنوان: </span>{customer.address}</div>
          {!customer.is_active && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
              <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-800 font-bold text-sm mb-1">حسابك غير مفعل بعد</p>
                <p className="text-amber-700 text-xs mb-3">لا يمكنك الشراء من المتجر حتى يتم تفعيل حسابك بالكود المرسل على واتساب.</p>
                <button onClick={() => setShowActivateModal(true)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition">إدخال كود التفعيل</button>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl transition text-sm"><KeyRound size={18} /> تغيير كلمة المرور</button>
            <button onClick={logout} className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2.5 rounded-xl transition text-sm"><ArrowRight size={18} /> تسجيل الخروج</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('orders')}
            className={`flex-1 flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition ${tab === 'orders' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <Package size={18} /> طلباتي
          </button>
          <button
            onClick={() => setTab('favorites')}
            className={`flex-1 flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition ${tab === 'favorites' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <Heart size={18} /> المفضلة {favoriteProducts.length > 0 && `(${favoriteProducts.length})`}
          </button>
        </div>

        {tab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2"><Package size={22} /> طلباتي</h2>
            {loading ? <p className="text-center text-gray-400 py-8">جارٍ التحميل...</p> : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">لا توجد طلبات بعد</p></div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <button key={order.id} onClick={() => viewOrder(order)} className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition text-right">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><span className="font-bold text-sm text-gray-800">طلب #{order.id.slice(0, 8)}</span><span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[order.status]}`}>{statusLabels[order.status]}</span></div>
                      <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('ar-EG')} — {formatPrice(order.grand_total)}</p>
                    </div>
                    <ChevronLeft size={18} className="text-gray-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'favorites' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2"><Heart size={22} /> المفضلة</h2>
            {favLoading ? <p className="text-center text-gray-400 py-8">جارٍ التحميل...</p> : favoriteProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Heart size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-semibold">لا توجد منتجات في المفضلة بعد</p>
                <a href="#/" className="text-brand-600 text-sm font-semibold hover:underline block mt-2">تصفّح المتجر</a>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {favoriteProducts.map((p) => {
                  const price = p.discount_price != null && p.discount_price < p.price ? p.discount_price : p.price;
                  const hasOptions = (p.option_groups?.length ?? 0) > 0 || (p.checkbox_options?.length ?? 0) > 0;
                  return (
                    <div key={p.id} className="bg-gray-50 rounded-xl overflow-hidden">
                      <a href="#/" className="block">
                        <div className="aspect-square bg-gray-100">
                          {p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingCart size={32} /></div>
                          )}
                        </div>
                      </a>
                      <div className="p-2.5">
                        <h4 className="font-bold text-xs text-gray-800 line-clamp-2 mb-1 leading-snug">{p.name}</h4>
                        <p className="text-sm font-extrabold text-brand-600 mb-2">{formatPrice(price)}{hasOptions && <span className="text-xs text-gray-400 font-normal"> وأكثر</span>}</p>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              if (hasOptions) {
                                window.location.hash = '#/';
                                return;
                              }
                              addToCart(p, emptySelectedOptions());
                              setAddedId(p.id);
                              setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 1500);
                            }}
                            className="flex-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs py-2 rounded-lg transition"
                          >
                            {addedId === p.id ? 'تمت الإضافة' : hasOptions ? 'اذهب للمتجر' : 'أضف للسلة'}
                          </button>
                          <button
                            onClick={() => toggleFavorite(p)}
                            className="w-8 h-8 shrink-0 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition"
                            title="إزالة من المفضلة"
                          >
                            <Heart size={14} className="fill-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {showPasswordModal && <AuthModal initialMode="forgot" onClose={() => setShowPasswordModal(false)} onSuccess={() => setShowPasswordModal(false)} />}
      {showActivateModal && <AuthModal initialMode="activate" onClose={() => setShowActivateModal(false)} />}
    </div>
  );
}
