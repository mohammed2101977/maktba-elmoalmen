import { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, ExternalLink } from 'lucide-react';
import { supabase, type StoreBanner } from '@/lib/supabase';

export default function BannersTab() {
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  async function fetchBanners() {
    setLoading(true);
    const { data } = await supabase.from('store_banners').select('*').order('sort_order', { ascending: true });
    if (data) setBanners(data as StoreBanner[]);
    setLoading(false);
  }

  async function addBanner() {
    if (!newImageUrl.trim()) return;
    setSaving(true);
    const maxOrder = banners.reduce((max, b) => Math.max(max, b.sort_order), 0);
    await supabase.from('store_banners').insert({
      image_url: newImageUrl.trim(),
      link_url: newLinkUrl.trim() || null,
      active: true,
      sort_order: maxOrder + 1,
    });
    setNewImageUrl('');
    setNewLinkUrl('');
    setSaving(false);
    fetchBanners();
  }

  async function toggleActive(banner: StoreBanner) {
    await supabase.from('store_banners').update({ active: !banner.active }).eq('id', banner.id);
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, active: !b.active } : b)));
  }

  async function updateSortOrder(banner: StoreBanner, sort_order: number) {
    await supabase.from('store_banners').update({ sort_order }).eq('id', banner.id);
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, sort_order } : b)));
  }

  async function removeBanner(id: string) {
    await supabase.from('store_banners').delete().eq('id', id);
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-2">الإعلانات</h1>
      <p className="text-sm text-gray-500 mb-6">صور إعلانية تظهر في شريط أعلى المنتجات في المتجر. يمكن أن تفتح رابطاً عند الضغط عليها. رتّبها بالأرقام (الأصغر يظهر أولاً).</p>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 space-y-3">
        <h2 className="font-bold text-sm text-gray-700">إضافة إعلان جديد</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="url"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="رابط صورة الإعلان"
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
          />
          <input
            type="url"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="رابط عند الضغط (اختياري)"
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
          />
        </div>
        <button
          onClick={addBanner}
          disabled={!newImageUrl.trim() || saving}
          className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
        >
          <Plus size={16} /> إضافة
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
          <ImageIcon size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">لا توجد إعلانات حالياً</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {banners.map((banner) => (
            <div key={banner.id} className="p-4 flex items-center gap-3">
              <img src={banner.image_url} alt="" className="w-24 h-14 rounded-lg object-cover shrink-0 bg-gray-100" />
              <div className="flex-1 min-w-0">
                {banner.link_url && (
                  <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 flex items-center gap-1 hover:underline truncate">
                    <ExternalLink size={12} /> {banner.link_url}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-500">ترتيب</span>
                <input
                  type="number"
                  value={banner.sort_order}
                  onChange={(e) => updateSortOrder(banner, parseInt(e.target.value) || 0)}
                  className="w-14 h-9 rounded-lg border-2 border-gray-200 px-2 text-xs focus:outline-none focus:border-brand-500 transition"
                />
              </div>
              <button
                onClick={() => toggleActive(banner)}
                className={`w-11 h-6 rounded-full transition relative shrink-0 ${banner.active ? 'bg-green-500' : 'bg-gray-300'}`}
                title={banner.active ? 'مفعّل' : 'معطّل'}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${banner.active ? 'right-0.5' : 'right-5'}`} />
              </button>
              <button onClick={() => removeBanner(banner.id)} className="w-9 h-9 shrink-0 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
