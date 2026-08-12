import { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { supabase, type StoreSettings } from '@/lib/supabase';

export default function SettingsTab() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('store_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as StoreSettings);
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await supabase.from('store_settings').update({
      minya_delivery_fee: settings.minya_delivery_fee,
      outside_minya_shipping: settings.outside_minya_shipping,
      instapay_number: settings.instapay_number,
      vodafone_cash_number: settings.vodafone_cash_number,
      whatsapp_number: settings.whatsapp_number,
    }).eq('id', 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>;
  if (!settings) return <div className="p-8 text-center text-gray-400">تعذر تحميل الإعدادات</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2"><Settings size={24} /> الإعدادات</h1>
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6 max-w-lg space-y-5">
        <div>
          <h3 className="font-bold text-gray-800 mb-3">مصاريف التوصيل</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">توصيل داخل المنيا (ج.م)</label>
              <input type="number" step="0.01" value={settings.minya_delivery_fee} onChange={(e) => setSettings({ ...settings, minya_delivery_fee: parseFloat(e.target.value) || 0 })} className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">شحن خارج المنيا (ج.م)</label>
              <input type="number" step="0.01" value={settings.outside_minya_shipping} onChange={(e) => setSettings({ ...settings, outside_minya_shipping: parseFloat(e.target.value) || 0 })} className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition" />
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-gray-800 mb-3">أرقام التواصل</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">رقم الإنستا</label>
              <input type="text" value={settings.instapay_number} onChange={(e) => setSettings({ ...settings, instapay_number: e.target.value })} className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">رقم فودافون كاش</label>
              <input type="text" value={settings.vodafone_cash_number} onChange={(e) => setSettings({ ...settings, vodafone_cash_number: e.target.value })} className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">رقم الواتس</label>
              <input type="text" value={settings.whatsapp_number} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition" dir="ltr" />
            </div>
          </div>
        </div>
        {saved && <div className="bg-green-50 text-green-700 text-sm font-semibold p-3 rounded-xl text-center">تم الحفظ بنجاح</div>}
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition"><Save size={18} />{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button>
      </form>
    </div>
  );
}
