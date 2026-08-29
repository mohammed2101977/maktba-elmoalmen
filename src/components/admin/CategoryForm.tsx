import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase, type Category } from '@/lib/supabase';

export default function CategoryForm({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon ?? '');
      setSortOrder(String(category.sort_order));
    }
  }, [category]);

  function slugify(text: string) {
    return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\u0600-\u06FF\w-]/g, '');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('اسم القسم مطلوب');
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      slug: slugify(name),
      icon: icon.trim() || null,
      sort_order: parseInt(sortOrder) || 0,
    };

    let result;
    if (category) {
      result = await supabase.from('categories').update(payload).eq('id', category.id);
    } else {
      result = await supabase.from('categories').insert(payload);
    }

    setSaving(false);
    if (result.error) {
      setError('حدث خطأ أثناء الحفظ');
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-gray-800">
            {category ? 'تعديل القسم' : 'إضافة قسم جديد'}
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">اسم القسم *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
              placeholder="مثال: كتب مدرسية"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">أيقونة (اختياري)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
              placeholder="اسم الأيقونة من lucide-react"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">ترتيب العرض</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
              placeholder="0"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-semibold p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              <Save size={18} />
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
