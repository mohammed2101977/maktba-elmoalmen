import { Phone, MessageCircle, CreditCard, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase, type StoreSettings } from '@/lib/supabase';

export default function ContactPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    supabase.from('store_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as StoreSettings);
    });
  }, []);

  const numbers = [
    { icon: <CreditCard size={24} />, label: 'رقم الإنستا', value: settings?.instapay_number ?? '01014137629', color: 'bg-blue-500' },
    { icon: <CreditCard size={24} />, label: 'رقم فودافون كاش', value: settings?.vodafone_cash_number ?? '01014137629', color: 'bg-red-500' },
    { icon: <MessageCircle size={24} />, label: 'رقم الواتس', value: settings?.whatsapp_number ?? '01014137629', color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <a href="#/" className="text-brand-600 hover:underline flex items-center gap-1 text-sm"><ArrowRight size={18} /> العودة للمتجر</a>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Phone size={32} className="text-white" /></div>
            <h1 className="text-2xl font-extrabold text-gray-800">اتصل بنا</h1>
            <p className="text-gray-500 text-sm mt-1">تواصل معنا عبر الأرقام التالية</p>
          </div>
          <div className="space-y-4">
            {numbers.map((n, i) => (
              <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                <div className={`w-12 h-12 ${n.color} text-white rounded-xl flex items-center justify-center shrink-0`}>{n.icon}</div>
                <div className="flex-1"><div className="font-bold text-gray-800">{n.label}</div><div className="text-lg font-extrabold text-brand-600" dir="ltr">{n.value}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
