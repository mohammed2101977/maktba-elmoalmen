import { useEffect, useState } from 'react';
import { Package, ChevronLeft, Clock, CheckCircle, Truck, Boxes, Gift } from 'lucide-react';
import { supabase, formatPrice, type Order, type OrderItem } from '@/lib/supabase';

const STATUSES = [
  { key: 'reviewing', label: 'جارٍ المراجعة', icon: <Clock size={16} />, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { key: 'preparing', label: 'تم التجهيز', icon: <Boxes size={16} />, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'shipping', label: 'الشحن', icon: <Truck size={16} />, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'delivered', label: 'تم التسليم', icon: <CheckCircle size={16} />, color: 'bg-green-100 text-green-700 border-green-300' },
];
const statusLabels: Record<string, string> = { reviewing: 'جارٍ المراجعة', preparing: 'تم التجهيز', shipping: 'الشحن', delivered: 'تم التسليم' };
const statusColors: Record<string, string> = { reviewing: 'bg-amber-100 text-amber-700', preparing: 'bg-blue-100 text-blue-700', shipping: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700' };
const deliveryLabels: Record<string, string> = { pickup: 'استلام', minya: 'توصيل المنيا', outside_minya: 'توصيل خارج المنيا' };

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }

  async function viewOrder(order: Order) {
    setSelectedOrder(order);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    if (data) setItems(data as OrderItem[]);
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdating(true);
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setSelectedOrder((prev) => prev ? { ...prev, status } : prev);
    setUpdating(false);
    fetchOrders();
  }

  if (selectedOrder) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setSelectedOrder(null)} className="text-brand-600 hover:underline flex items-center gap-1 text-sm mb-4"><ChevronLeft size={18} /> العودة للطلبات</button>
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-extrabold text-gray-800 mb-4">طلب #{selectedOrder.id.slice(0, 8)}</h2>
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">العميل:</span><span className="font-semibold">{selectedOrder.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">الهاتف:</span><span className="font-semibold" dir="ltr">{selectedOrder.customer_phone}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">العنوان:</span><span className="font-semibold text-left max-w-[60%]">{selectedOrder.customer_address}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span><span className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString('ar-EG')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">التسليم:</span><span className="font-semibold">{deliveryLabels[selectedOrder.delivery_method] ?? selectedOrder.delivery_method}</span></div>
          </div>
          <h3 className="font-bold text-gray-800 mb-3">مكونات الطلب</h3>
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">{item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-800">{item.product_name}</h4>
                  <p className="text-xs text-gray-500">{item.quantity} × {formatPrice(item.unit_price)}</p>
                  {item.selected_options?.length > 0 && (
                    <p className="text-xs text-gray-400">{item.selected_options.map((o) => `${o.group}: ${o.choice}`).join(' · ')}</p>
                  )}
                  {item.gift_earned && (
                    <p className="text-xs text-brand-600 font-semibold flex items-center gap-1 mt-0.5"><Gift size={12} /> هدية مستحقة: {item.gift_earned}</p>
                  )}
                </div>
                <span className="font-bold text-sm text-brand-600">{formatPrice(item.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">إجمالي المنتجات</span><span className="font-semibold">{formatPrice(selectedOrder.items_total)}</span></div>
            {selectedOrder.delivery_fee > 0 && <div className="flex justify-between"><span className="text-gray-500">التوصيل</span><span className="font-semibold">{formatPrice(selectedOrder.delivery_fee)}</span></div>}
            <div className="flex justify-between text-base font-extrabold"><span>الإجمالي</span><span className="text-brand-600">{formatPrice(selectedOrder.grand_total)}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-3">تحديث حالة الطلب</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATUSES.map((s) => (
              <button key={s.key} onClick={() => updateStatus(selectedOrder.id, s.key)} disabled={updating} className={`flex items-center gap-2 p-3 rounded-xl border-2 font-bold text-sm transition ${selectedOrder.status === s.key ? s.color : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {s.icon}{s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-6">الطلبات</h1>
      {loading ? <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div> : orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400"><Package size={48} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">لا توجد طلبات بعد</p></div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button key={order.id} onClick={() => viewOrder(order)} className="w-full bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition text-right flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><span className="font-bold text-sm text-gray-800">طلب #{order.id.slice(0, 8)}</span><span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[order.status]}`}>{statusLabels[order.status]}</span></div>
                <p className="text-xs text-gray-500">{order.customer_name} — {new Date(order.created_at).toLocaleDateString('ar-EG')}</p>
                <p className="text-xs text-gray-400">{deliveryLabels[order.delivery_method] ?? order.delivery_method} — {formatPrice(order.grand_total)}</p>
              </div>
              <ChevronLeft size={18} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
