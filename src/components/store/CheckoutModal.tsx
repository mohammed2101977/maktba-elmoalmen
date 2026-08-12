import { useState, useEffect } from 'react';
import { X, CreditCard, Truck, Store, CheckCircle, MapPin } from 'lucide-react';
import { supabase, formatPrice, type Product, type StoreSettings } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type CartItem = { product: Product; qty: number };
type PaymentMethod = 'instapay' | 'vodafone' | 'deposit';
type DeliveryMethod = 'pickup' | 'minya' | 'outside_minya';

export default function CheckoutModal({
  cart,
  onClose,
  onOrderPlaced,
  onRequireAuth,
}: {
  cart: CartItem[];
  onClose: () => void;
  onOrderPlaced: () => void;
  onRequireAuth: () => void;
}) {
  const { customer } = useAuth();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('instapay');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [address, setAddress] = useState('');
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.from('store_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as StoreSettings);
    });
  }, []);

  useEffect(() => {
    if (customer && !useDifferentAddress) setAddress(customer.address);
  }, [customer, useDifferentAddress]);

  const itemsTotal = cart.reduce((sum, c) => sum + c.qty * (c.product.discount_price ?? c.product.price), 0);
  const deliveryFee =
    deliveryMethod === 'minya' ? (settings?.minya_delivery_fee ?? 25) :
    deliveryMethod === 'outside_minya' ? (settings?.outside_minya_shipping ?? 150) : 0;
  const grandTotal = itemsTotal + deliveryFee;

  async function handleConfirm() {
    setError('');
    if (!customer) { onRequireAuth(); return; }
    if (deliveryMethod !== 'pickup' && !address.trim()) { setError('العنوان مطلوب للتوصيل'); return; }
    setLoading(true);
    try {
      const finalAddress = deliveryMethod === 'pickup' ? (customer.address || 'استلام من المتجر') : address.trim();
      const { data: orderData, error: orderError } = await supabase
        .from('orders').insert({
          customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone,
          customer_address: finalAddress, items_total: itemsTotal, delivery_fee: deliveryFee,
          grand_total: grandTotal, payment_method: paymentMethod, delivery_method: deliveryMethod, status: 'reviewing',
        }).select('*').single();
      if (orderError || !orderData) { setError('حدث خطأ أثناء إنشاء الطلب'); setLoading(false); return; }
      const orderItems = cart.map((c) => ({
        order_id: orderData.id, product_id: c.product.id, product_name: c.product.name,
        product_image: c.product.images[0] || null, quantity: c.qty,
        unit_price: c.product.discount_price ?? c.product.price,
        line_total: c.qty * (c.product.discount_price ?? c.product.price),
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) { setError('حدث خطأ أثناء حفظ تفاصيل الطلب'); setLoading(false); return; }
      setSuccess(true); setLoading(false); onOrderPlaced();
    } catch { setError('حدث خطأ غير متوقع'); setLoading(false); }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-800 mb-2">تم استلام طلبك بنجاح!</h2>
          <p className="text-gray-600 text-sm mb-6">سيتم التوصيل خلال من 1-3 أيام بحد أقصى. سنتواصل معك قريباً.</p>
          <button onClick={onClose} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition">تم</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-extrabold text-gray-800">إتمام الطلب</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          {!customer && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-800 font-semibold text-sm mb-2">يجب تسجيل الدخول لإتمام الطلب</p>
              <button onClick={onRequireAuth} className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition">سجّل دخول / أنشئ حساب</button>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-gray-800 text-sm mb-2">ملخص الطلب</h3>
            {cart.map((c) => (
              <div key={c.product.id} className="flex justify-between text-sm text-gray-600">
                <span className="line-clamp-1">{c.product.name} × {c.qty}</span>
                <span className="font-semibold whitespace-nowrap">{formatPrice(c.qty * (c.product.discount_price ?? c.product.price))}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-sm font-bold text-gray-800"><span>إجمالي المنتجات</span><span>{formatPrice(itemsTotal)}</span></div>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm mb-2">طريقة الدفع</h3>
            <div className="space-y-2">
              <PaymentOption selected={paymentMethod === 'instapay'} onClick={() => setPaymentMethod('instapay')} icon={<CreditCard size={20} />} title="الدفع بالإنستا" desc={`على الرقم ${settings?.instapay_number ?? '01014137629'}`} />
              <PaymentOption selected={paymentMethod === 'vodafone'} onClick={() => setPaymentMethod('vodafone')} icon={<CreditCard size={20} />} title="فودافون كاش" desc={`على الرقم ${settings?.vodafone_cash_number ?? '01014137629'}`} />
              <PaymentOption selected={paymentMethod === 'deposit'} onClick={() => setPaymentMethod('deposit')} icon={<CreditCard size={20} />} title="دفع عربون (نصف الفاتورة)" desc={`بالإنستا أو فودافون كاش على الرقم ${settings?.instapay_number ?? '01014137629'} والباقي عند الاستلام`} />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm mb-2">طريقة التسليم</h3>
            <div className="space-y-2">
              <DeliveryOption selected={deliveryMethod === 'pickup'} onClick={() => setDeliveryMethod('pickup')} icon={<Store size={20} />} title="حضور بنفسك للاستلام" desc={`التواصل على واتس ${settings?.whatsapp_number ?? '01014137629'}`} fee={0} />
              <DeliveryOption selected={deliveryMethod === 'minya'} onClick={() => setDeliveryMethod('minya')} icon={<Truck size={20} />} title="توصيل داخل المنيا" desc="توصيل داخل محافظة المنيا" fee={settings?.minya_delivery_fee ?? 25} />
              <DeliveryOption selected={deliveryMethod === 'outside_minya'} onClick={() => setDeliveryMethod('outside_minya')} icon={<Truck size={20} />} title="توصيل خارج المنيا (كل مصر)" desc="شحن لأي مكان داخل مصر" fee={settings?.outside_minya_shipping ?? 150} />
            </div>
          </div>
          {deliveryMethod !== 'pickup' && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1"><MapPin size={16} /> عنوان التوصيل</label>
              {customer && !useDifferentAddress && <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 mb-2">{customer.address}</div>}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mb-2">
                <input type="checkbox" checked={useDifferentAddress} onChange={(e) => setUseDifferentAddress(e.target.checked)} className="rounded" /> توصيل لعنوان آخر
              </label>
              {(useDifferentAddress || !customer) && (
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition resize-none" placeholder="العنوان بالتفصيل..." />
              )}
            </div>
          )}
          <div className="bg-brand-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-700"><span>إجمالي المنتجات</span><span className="font-semibold">{formatPrice(itemsTotal)}</span></div>
            {deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-700"><span>مصاريف التوصيل</span><span className="font-semibold">{formatPrice(deliveryFee)}</span></div>}
            <div className="border-t border-brand-200 pt-2 flex justify-between font-extrabold text-gray-800"><span>الإجمالي النهائي</span><span className="text-brand-600">{formatPrice(grandTotal)}</span></div>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm font-semibold p-3 rounded-xl text-center">{error}</div>}
          <button onClick={handleConfirm} disabled={loading || !customer} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
            {loading ? 'جارٍ تأكيد الطلب...' : 'تأكيد الشراء'}
          </button>
          {!customer && <p className="text-xs text-gray-500 text-center">سجّل دخولك أولاً لتتمكن من تأكيد الطلب</p>}
        </div>
      </div>
    </div>
  );
}

function PaymentOption({ selected, onClick, icon, title, desc }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; }) {
  return (
    <button onClick={onClick} className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition text-right ${selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
      <span className={`shrink-0 ${selected ? 'text-brand-600' : 'text-gray-400'}`}>{icon}</span>
      <div className="flex-1"><div className="font-bold text-sm text-gray-800">{title}</div><div className="text-xs text-gray-500">{desc}</div></div>
      <span className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 ${selected ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`} />
    </button>
  );
}

function DeliveryOption({ selected, onClick, icon, title, desc, fee }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; fee: number; }) {
  return (
    <button onClick={onClick} className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition text-right ${selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
      <span className={`shrink-0 ${selected ? 'text-brand-600' : 'text-gray-400'}`}>{icon}</span>
      <div className="flex-1"><div className="font-bold text-sm text-gray-800">{title}</div><div className="text-xs text-gray-500">{desc}</div></div>
      <div className="text-left shrink-0"><span className="font-bold text-sm text-gray-700">{fee === 0 ? 'مجاني' : formatPrice(fee)}</span><span className={`block w-5 h-5 rounded-full border-2 mt-1 ml-auto ${selected ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`} /></div>
    </button>
  );
}
