import { useEffect, useState } from 'react';
import { Users, ChevronLeft, Phone, MapPin, Package } from 'lucide-react';
import { supabase, formatPrice, type Customer, type Order, type OrderItem } from '@/lib/supabase';

const statusLabels: Record<string, string> = { reviewing: 'جارٍ المراجعة', preparing: 'تم التجهيز', shipping: 'الشحن', delivered: 'تم التسليم' };
const statusColors: Record<string, string> = { reviewing: 'bg-amber-100 text-amber-700', preparing: 'bg-blue-100 text-blue-700', shipping: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700' };
const paymentLabels: Record<string, string> = { instapay: 'الإنستا', vodafone: 'فودافون كاش', deposit: 'عربون' };
const deliveryLabels: Record<string, string> = { pickup: 'استلام', minya: 'توصيل المنيا', outside_minya: 'توصيل خارج المنيا' };

export default function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => { fetchCustomers(); }, []);

  async function fetchCustomers() {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (data) setCustomers(data as Customer[]);
    setLoading(false);
  }

  async function viewCustomer(cust: Customer) {
    setSelectedCustomer(cust);
    const { data } = await supabase.from('orders').select('*').eq('customer_id', cust.id).order('created_at', { ascending: false });
    if (data) setCustomerOrders(data as Order[]);
  }

  async function viewOrder(order: Order) {
    setSelectedOrder(order);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    if (data) setOrderItems(data as OrderItem[]);
  }

  if (selectedOrder) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setSelectedOrder(null)} className="text-brand-600 hover:underline flex items-center gap-1 text-sm mb-4"><ChevronLeft size={18} /> العودة</button>
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-extrabold text-gray-800 mb-4">تفاصيل الطلب #{selectedOrder.id.slice(0, 8)}</h2>
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">العميل:</span><span className="font-semibold">{selectedOrder.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">الهاتف:</span><span className="font-semibold" dir="ltr">{selectedOrder.customer_phone}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">العنوان:</span><span className="font-semibold text-left max-w-[60%]">{selectedOrder.customer_address}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span><span className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString('ar-EG')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">الدفع:</span><span className="font-semibold">{paymentLabels[selectedOrder.payment_method] ?? selectedOrder.payment_method}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">التسليم:</span><span className="font-semibold">{deliveryLabels[selectedOrder.delivery_method] ?? selectedOrder.delivery_method}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">الحالة:</span><span className={`font-bold px-2 py-0.5 rounded text-xs ${statusColors[selectedOrder.status]}`}>{statusLabels[selectedOrder.status]}</span></div>
          </div>
          <h3 className="font-bold text-gray-800 mb-3">مكونات الطلب</h3>
          <div className="space-y-2">
            {orderItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">{item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}</div>
                <div className="flex-1"><h4 className="font-bold text-sm text-gray-800">{item.product_name}</h4><p className="text-xs text-gray-500">{item.quantity} × {formatPrice(item.unit_price)}</p></div>
                <span className="font-bold text-sm text-brand-600">{formatPrice(item.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">إجمالي المنتجات</span><span className="font-semibold">{formatPrice(selectedOrder.items_total)}</span></div>
            {selectedOrder.delivery_fee > 0 && <div className="flex justify-between"><span className="text-gray-500">التوصيل</span><span className="font-semibold">{formatPrice(selectedOrder.delivery_fee)}</span></div>}
            <div className="flex justify-between text-base font-extrabold"><span>الإجمالي</span><span className="text-brand-600">{formatPrice(selectedOrder.grand_total)}</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setSelectedCustomer(null)} className="text-brand-600 hover:underline flex items-center gap-1 text-sm mb-4"><ChevronLeft size={18} /> العودة للعملاء</button>
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center"><Users size={28} className="text-white" /></div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-800">{selectedCustomer.name}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={14} /> <span dir="ltr">{selectedCustomer.phone}</span></p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><MapPin size={12} /> {selectedCustomer.address}</p>
            </div>
          </div>
        </div>
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Package size={20} /> طلبات العميل ({customerOrders.length})</h3>
        {customerOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400"><Package size={40} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">لا توجد طلبات لهذا العميل</p></div>
        ) : (
          <div className="space-y-3">
            {customerOrders.map((order) => (
              <button key={order.id} onClick={() => viewOrder(order)} className="w-full bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition text-right flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="font-bold text-sm text-gray-800">طلب #{order.id.slice(0, 8)}</span><span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[order.status]}`}>{statusLabels[order.status]}</span></div>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('ar-EG')} — {formatPrice(order.grand_total)}</p>
                </div>
                <ChevronLeft size={18} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-6">العملاء</h1>
      {loading ? <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div> : customers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400"><Users size={48} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">لا يوجد عملاء مسجلون بعد</p></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {customers.map((cust) => (
              <button key={cust.id} onClick={() => viewCustomer(cust)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-right">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Users size={20} /></div>
                <div className="flex-1 min-w-0"><h4 className="font-bold text-sm text-gray-800">{cust.name}</h4><p className="text-xs text-gray-500" dir="ltr">{cust.phone}</p><p className="text-xs text-gray-400 line-clamp-1">{cust.address}</p></div>
                <ChevronLeft size={18} className="text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
