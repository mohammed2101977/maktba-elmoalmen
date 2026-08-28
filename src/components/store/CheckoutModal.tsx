import { useState, useEffect } from 'react';
import { X, Truck, Store, CheckCircle, MapPin, Gift } from 'lucide-react';
import { supabase, formatPrice, describeSelectedOptions, earnedGeneralGifts, fetchActiveGifts, type StoreSettings, type StoreGift } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { CartLine } from '@/lib/cart';

type DeliveryMethod = 'pickup' | 'minya' | 'outside_minya';

type EarnedGift = { productName: string; description: string; image: string | null };

// Some products can be added to the cart multiple times with different options/add-ons
// (each combination is its own cart line), but a per-product gift threshold should be
// based on the TOTAL quantity of that product across all its lines, not any single line.
function computeProductQtyTotals(cart: CartLine[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const c of cart) totals[c.product.id] = (totals[c.product.id] ?? 0) + c.qty;
  return totals;
}

export default function CheckoutModal({
  cart,
  onClose,
  onOrderPlaced,
  onRequireAuth,
}: {
  cart: CartLine[];
  onClose: () => void;
  onOrderPlaced: () => void;
  onRequireAuth: () => void;
}) {
  const { customer } = useAuth();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [address, setAddress] = useState('');
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [earnedGifts, setEarnedGifts] = useState<EarnedGift[]>([]);
  const [activeGeneralGifts, setActiveGeneralGifts] = useState<StoreGift[]>([]);

  useEffect(() => {
    supabase.from('store_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as StoreSettings);
    });
    fetchActiveGifts().then(setActiveGeneralGifts);
  }, []);

  useEffect(() => {
    if (customer && !useDifferentAddress) setAddress(customer.address);
  }, [customer, useDifferentAddress]);

  const itemsTotal = cart.reduce((sum, c) => sum + c.qty * c.unitPrice, 0);
  const deliveryFee =
    deliveryMethod === 'minya' ? (settings?.minya_delivery_fee ?? 25) :
    deliveryMethod === 'outside_minya' ? (settings?.outside_minya_shipping ?? 150) : 0;
  const grandTotal = itemsTotal + deliveryFee;

  async function handleConfirm() {
    setError('');
    if (!customer) { onRequireAuth(); return; }
    if (!customer.is_active) { onRequireAuth(); return; }
    if (deliveryMethod !== 'pickup' && !address.trim()) { setError('العنوان مطلوب للتوصيل'); return; }
    setLoading(true);
    try {
      const finalAddress = deliveryMethod === 'pickup' ? (customer.address || 'استلام من المتجر') : address.trim();
      const { data: orderData, error: orderError } = await supabase
        .from('orders').insert({
          customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone,
          customer_address: finalAddress, items_total: itemsTotal, delivery_fee: deliveryFee,
          grand_total: grandTotal, payment_method: 'whatsapp', delivery_method: deliveryMethod,
          status: 'reviewing',
        }).select('*').single();
      if (orderError || !orderData) { setError('حدث خطأ أثناء إنشاء الطلب'); setLoading(false); return; }

      const gifts: EarnedGift[] = [];
      const productQtyTotals = computeProductQtyTotals(cart);
      const awardedProductIds = new Set<string>();
      const orderItems = cart.map((c) => {
        const productQualifies = c.product.gift_enabled && (productQtyTotals[c.product.id] ?? 0) >= c.product.gift_min_qty;
        // Award the gift once per qualifying product, even if it's split across multiple
        // cart lines (same product, different options/add-ons).
        const isFirstLineForThisGift = productQualifies && !awardedProductIds.has(c.product.id);
        if (isFirstLineForThisGift) {
          awardedProductIds.add(c.product.id);
          gifts.push({
            productName: c.product.name,
            description: c.product.gift_description || 'هدية خاصة',
            image: c.product.gift_image,
          });
        }
        return {
          order_id: orderData.id, product_id: c.product.id, product_name: c.product.name,
          product_image: c.product.images[0] || null, quantity: c.qty,
          unit_price: c.unitPrice, line_total: c.qty * c.unitPrice,
          selected_options: describeSelectedOptions(c.product, c.selected),
          gift_earned: isFirstLineForThisGift ? (c.product.gift_description || 'هدية خاصة') : null,
        };
      });

      // General (cart-wide) gifts: "spend X" or "buy N items" tiers that apply once per order.
      const totalQty = cart.reduce((sum, c) => sum + c.qty, 0);
      for (const g of earnedGeneralGifts(activeGeneralGifts, totalQty, itemsTotal)) {
        gifts.push({ productName: 'الطلب بالكامل', description: g.name, image: g.image_url });
      }

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) { setError('حدث خطأ أثناء حفظ تفاصيل الطلب'); setLoading(false); return; }
      setEarnedGifts(gifts);
      setSuccess(true); setLoading(false); onOrderPlaced();
    } catch { setError('حدث خطأ غير متوقع'); setLoading(false); }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in max-h-[90vh] overflow-y-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-800 mb-2">تم تأكيد الطلب</h2>
          <p className="text-gray-600 text-sm mb-6">وسيتم التواصل معكم على الواتساب في أقرب وقت.</p>

          {earnedGifts.length > 0 && (
            <div className="bg-brand-50 border-2 border-brand-200 rounded-xl p-4 mb-6 text-right space-y-3">
              <div className="flex items-center gap-2 justify-center text-brand-700 font-extrabold">
                <Gift size={20} />
                مبروك! ربحت هدية
              </div>
              {earnedGifts.map((g, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-2">
                  {g.image && <img src={g.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                  <div className="text-sm">
                    <p className="font-bold text-gray-800">{g.description}</p>
                    <p className="text-xs text-gray-500">{g.productName === 'الطلب بالكامل' ? 'هدية عامة على الطلب' : `هدية مع منتج: ${g.productName}`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

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
          {customer && !customer.is_active && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-800 font-semibold text-sm mb-2">حسابك غير مفعل بعد، لا يمكنك الشراء قبل تفعيله بالكود المرسل على واتساب</p>
              <button onClick={onRequireAuth} className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-2 rounded-lg text-sm transition">تفعيل الحساب</button>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-gray-800 text-sm mb-2">ملخص الطلب</h3>
            {cart.map((c) => {
              const optionLabels = describeSelectedOptions(c.product, c.selected);
              const productQtyTotal = cart.filter((x) => x.product.id === c.product.id).reduce((sum, x) => sum + x.qty, 0);
              const giftQualifies = c.product.gift_enabled && productQtyTotal >= c.product.gift_min_qty;
              return (
                <div key={c.key} className="flex justify-between text-sm text-gray-600">
                  <span className="line-clamp-1">
                    {c.product.name} × {c.qty}
                    {optionLabels.length > 0 && (
                      <span className="block text-xs text-gray-400">{optionLabels.map((o) => `${o.group}: ${o.choice}`).join(' · ')}</span>
                    )}
                    {giftQualifies && (
                      <span className="block text-xs text-brand-600 font-semibold flex items-center gap-1"><Gift size={12} /> هدية عند إتمام الطلب</span>
                    )}
                  </span>
                  <span className="font-semibold whitespace-nowrap">{formatPrice(c.qty * c.unitPrice)}</span>
                </div>
              );
            })}
            <div className="border-t pt-2 flex justify-between text-sm font-bold text-gray-800"><span>إجمالي المنتجات</span><span>{formatPrice(itemsTotal)}</span></div>
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
          <button onClick={handleConfirm} disabled={loading || !customer || !customer.is_active} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
            {loading ? 'جارٍ تأكيد الطلب...' : 'تأكيد الشراء'}
          </button>
          {!customer && <p className="text-xs text-gray-500 text-center">سجّل دخولك أولاً لتتمكن من تأكيد الطلب</p>}
          {customer && !customer.is_active && <p className="text-xs text-gray-500 text-center">فعّل حسابك أولاً لتتمكن من تأكيد الطلب</p>}
        </div>
      </div>
    </div>
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
