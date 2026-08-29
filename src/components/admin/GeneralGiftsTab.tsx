import { useEffect, useState } from 'react';
import { Gift, Plus, Trash2, Pencil, X, Save } from 'lucide-react';
import { supabase, type StoreGift } from '@/lib/supabase';

export default function GeneralGiftsTab() {
  const [gifts, setGifts] = useState<StoreGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newThresholdType, setNewThresholdType] = useState<'quantity' | 'amount'>('amount');
  const [newThresholdValue, setNewThresholdValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGifts();
  }, []);

  async function fetchGifts() {
    setLoading(true);
    const { data } = await supabase.from('store_gifts').select('*').order('sort_order', { ascending: true });
    if (data) setGifts(data as StoreGift[]);
    setLoading(false);
  }

  function resetForm() {
    setEditingId(null);
    setNewName('');
    setNewImageUrl('');
    setNewThresholdType('amount');
    setNewThresholdValue('');
  }

  function startEdit(gift: StoreGift) {
    setEditingId(gift.id);
    setNewName(gift.name);
    setNewImageUrl(gift.image_url ?? '');
    setNewThresholdType(gift.threshold_type);
    setNewThresholdValue(String(gift.threshold_value));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveGift() {
    if (!newName.trim() || !newThresholdValue) return;
    setSaving(true);
    const payload = {
      name: newName.trim(),
      image_url: newImageUrl.trim() || null,
      threshold_type: newThresholdType,
      threshold_value: Number(newThresholdValue) || 0,
    };
    if (editingId) {
      await supabase.from('store_gifts').update(payload).eq('id', editingId);
    } else {
      const maxOrder = gifts.reduce((max, g) => Math.max(max, g.sort_order), 0);
      await supabase.from('store_gifts').insert({ ...payload, active: true, sort_order: maxOrder + 1 });
    }
    resetForm();
    setSaving(false);
    fetchGifts();
  }

  async function toggleActive(gift: StoreGift) {
    await supabase.from('store_gifts').update({ active: !gift.active }).eq('id', gift.id);
    setGifts((prev) => prev.map((g) => (g.id === gift.id ? { ...g, active: !g.active } : g)));
  }

  async function removeGift(id: string) {
    await supabase.from('store_gifts').delete().eq('id', id);
    setGifts((prev) => prev.filter((g) => g.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-2">هدايا عامة على السلة</h1>
      <p className="text-sm text-gray-500 mb-6">
        هدايا تُمنح بناءً على إجمالي السلة كلها (وليس منتجاً بعينه)، مثل "اشترِ بـ 300 جنيه واحصل على هدية" أو "اشترِ 5 قطع واحصل على هدية". تظهر صورة الهدية للعميل في السلة قبل إتمام الشراء، ويمكن إضافة أكثر من هدية بحدود مختلفة.
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-700">{editingId ? 'تعديل الهدية' : 'إضافة هدية جديدة'}</h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-semibold">
              <X size={14} /> إلغاء التعديل
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اسم الهدية (مثال: قلم فاخر)"
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
          />
          <input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="رابط صورة الهدية (اختياري)"
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
          />
          <select
            value={newThresholdType}
            onChange={(e) => setNewThresholdType(e.target.value as 'quantity' | 'amount')}
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm bg-white focus:outline-none focus:border-brand-500 transition"
          >
            <option value="amount">حد أدنى لمبلغ الشراء (ج.م)</option>
            <option value="quantity">حد أدنى لعدد القطع في السلة</option>
          </select>
          <input
            type="number"
            min="0"
            value={newThresholdValue}
            onChange={(e) => setNewThresholdValue(e.target.value)}
            placeholder={newThresholdType === 'amount' ? 'مثال: 300' : 'مثال: 5'}
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
          />
        </div>
        <button
          onClick={saveGift}
          disabled={!newName.trim() || !newThresholdValue || saving}
          className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
        >
          {editingId ? <><Save size={16} /> حفظ التعديلات</> : <><Plus size={16} /> إضافة الهدية</>}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>
      ) : gifts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
          <Gift size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">لا توجد هدايا عامة حالياً</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {gifts.map((gift) => (
            <div key={gift.id} className={`p-4 flex items-center gap-3 ${editingId === gift.id ? 'bg-brand-50' : ''}`}>
              {gift.image_url ? (
                <img src={gift.image_url} alt="" className="w-14 h-14 rounded-lg object-contain bg-gray-100 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center shrink-0"><Gift size={22} /></div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-800">{gift.name}</h4>
                <p className="text-xs text-gray-500">
                  {gift.threshold_type === 'amount' ? `عند الشراء بـ ${gift.threshold_value} ج.م أو أكثر` : `عند شراء ${gift.threshold_value} قطعة أو أكثر`}
                </p>
              </div>
              <button
                onClick={() => toggleActive(gift)}
                className={`w-11 h-6 rounded-full transition relative shrink-0 ${gift.active ? 'bg-green-500' : 'bg-gray-300'}`}
                title={gift.active ? 'مفعّلة' : 'معطّلة'}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${gift.active ? 'right-0.5' : 'right-5'}`} />
              </button>
              <button onClick={() => startEdit(gift)} className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition">
                <Pencil size={16} />
              </button>
              <button onClick={() => removeGift(gift.id)} className="w-9 h-9 shrink-0 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
