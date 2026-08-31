import { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, ExternalLink, Video, MessageSquareText, Images, Pencil, X, Save } from 'lucide-react';
import { supabase, type StoreBanner, type BannerSlide } from '@/lib/supabase';

type ContentType = StoreBanner['content_type'];

const typeLabels: Record<ContentType, string> = {
  image: 'صورة / GIF',
  video: 'فيديو',
  text_ticker: 'شريط نص متحرك',
  slideshow: 'سلايدر صور متعددة',
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function BannersTab() {
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentType>('image');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newTextContent, setNewTextContent] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [newSlides, setNewSlides] = useState<BannerSlide[]>([]);
  const [slideUrl, setSlideUrl] = useState('');
  const [slideLink, setSlideLink] = useState('');
  const [tickerSpeed, setTickerSpeed] = useState('20');
  const [slideshowInterval, setSlideshowInterval] = useState('3');
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

  function resetForm() {
    setEditingId(null);
    setContentType('image');
    setNewMediaUrl('');
    setNewTextContent('');
    setNewLinkUrl('');
    setNewWidth('');
    setNewHeight('');
    setNewSlides([]);
    setSlideUrl('');
    setSlideLink('');
    setTickerSpeed('20');
    setSlideshowInterval('3');
  }

  function startEdit(banner: StoreBanner) {
    setEditingId(banner.id);
    setContentType(banner.content_type);
    setNewMediaUrl(banner.content_type === 'image' || banner.content_type === 'video' ? (banner.image_url ?? '') : '');
    setNewTextContent(banner.text_content ?? '');
    setNewLinkUrl(banner.link_url ?? '');
    setNewWidth(banner.width != null ? String(banner.width) : '');
    setNewHeight(banner.height != null ? String(banner.height) : '');
    setNewSlides(banner.slides ?? []);
    setSlideUrl('');
    setSlideLink('');
    setTickerSpeed(String(banner.ticker_speed_seconds ?? 20));
    setSlideshowInterval(String(banner.slideshow_interval_seconds ?? 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addSlide() {
    if (!slideUrl.trim()) return;
    setNewSlides((prev) => [...prev, { id: uid(), image_url: slideUrl.trim(), link_url: slideLink.trim() || null }]);
    setSlideUrl('');
    setSlideLink('');
  }

  function removeSlide(id: string) {
    setNewSlides((prev) => prev.filter((s) => s.id !== id));
  }

  function canSave() {
    if (contentType === 'text_ticker') return !!newTextContent.trim();
    if (contentType === 'slideshow') return newSlides.length >= 2;
    return !!newMediaUrl.trim();
  }

  async function saveBanner() {
    if (!canSave()) return;
    setSaving(true);
    const payload = {
      content_type: contentType,
      image_url: contentType === 'image' || contentType === 'video' ? newMediaUrl.trim() : null,
      text_content: contentType === 'text_ticker' ? newTextContent.trim() : null,
      slides: contentType === 'slideshow' ? newSlides : [],
      link_url: newLinkUrl.trim() || null,
      width: newWidth ? parseInt(newWidth) : null,
      height: newHeight ? parseInt(newHeight) : null,
      ticker_speed_seconds: Math.max(2, parseInt(tickerSpeed) || 20),
      slideshow_interval_seconds: Math.max(1, parseInt(slideshowInterval) || 3),
    };
    if (editingId) {
      await supabase.from('store_banners').update(payload).eq('id', editingId);
    } else {
      const maxOrder = banners.reduce((max, b) => Math.max(max, b.sort_order), 0);
      await supabase.from('store_banners').insert({ ...payload, active: true, sort_order: maxOrder + 1 });
    }
    resetForm();
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
    if (editingId === id) resetForm();
  }

  const typeIcon: Record<ContentType, React.ReactNode> = {
    image: <ImageIcon size={20} />,
    video: <Video size={20} />,
    text_ticker: <MessageSquareText size={20} />,
    slideshow: <Images size={20} />,
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-2">الإعلانات</h1>
      <p className="text-sm text-gray-500 mb-6">
        صور، فيديوهات، سلايدر صور متعددة، أو شريط نص متحرك يظهر أعلى المنتجات في المتجر. تظهر الصور والفيديوهات كاملة دون قص (استريتش)، ويمكنك تحديد عرض وارتفاع مخصصين لكل إعلان — الإعلانات ذات العرض المخصص تظهر جنب بعضها تلقائياً لو وُجدت مساحة كافية.
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-700">{editingId ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}</h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-semibold">
              <X size={14} /> إلغاء التعديل
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['image', 'video', 'text_ticker', 'slideshow'] as ContentType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setContentType(t)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${contentType === t ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {typeIcon[t]} {typeLabels[t]}
            </button>
          ))}
        </div>

        {contentType === 'text_ticker' && (
          <div className="space-y-2">
            <input
              type="text"
              value={newTextContent}
              onChange={(e) => setNewTextContent(e.target.value)}
              placeholder="نص الشريط المتحرك (مثال: عروض نهاية الأسبوع خصم 20%)"
              className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-600 shrink-0">سرعة حركة النص (بالثواني)</label>
              <input
                type="number"
                min="2"
                value={tickerSpeed}
                onChange={(e) => setTickerSpeed(e.target.value)}
                className="w-24 h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
              />
              <p className="text-[11px] text-gray-400">كل ما قل الرقم كل ما تحرك النص أسرع</p>
            </div>
          </div>
        )}

        {(contentType === 'image' || contentType === 'video') && (
          <input
            type="url"
            value={newMediaUrl}
            onChange={(e) => setNewMediaUrl(e.target.value)}
            placeholder={contentType === 'video' ? 'رابط فيديو (يوتيوب/فيميو/فيسبوك أو ملف مباشر)' : 'رابط صورة أو GIF'}
            className="w-full h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
          />
        )}

        {contentType === 'slideshow' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">أضف صورتين على الأقل. يظهر للعميل أسهم للتنقل، ويمكنه السحب باللمس على الموبايل.</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={slideUrl}
                onChange={(e) => setSlideUrl(e.target.value)}
                placeholder="رابط صورة السلايد"
                className="flex-1 h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
              />
              <input
                type="url"
                value={slideLink}
                onChange={(e) => setSlideLink(e.target.value)}
                placeholder="رابط عند الضغط (اختياري)"
                className="flex-1 h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
              />
              <button type="button" onClick={addSlide} disabled={!slideUrl.trim()} className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center transition">
                <Plus size={16} />
              </button>
            </div>
            {newSlides.length > 0 && (
              <div className="space-y-1.5">
                {newSlides.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-gray-500 shrink-0">#{i + 1}</span>
                    <span className="text-xs text-gray-600 truncate flex-1" dir="ltr">{s.image_url}</span>
                    <button type="button" onClick={() => removeSlide(s.id)} className="shrink-0 w-7 h-7 rounded-md bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-600 shrink-0">سرعة تغيير الشريحة (بالثواني)</label>
              <input
                type="number"
                min="1"
                value={slideshowInterval}
                onChange={(e) => setSlideshowInterval(e.target.value)}
                className="w-24 h-10 rounded-lg border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-brand-500 transition"
              />
              <p className="text-[11px] text-gray-400">المدة التي تظهر فيها كل صورة قبل الانتقال للتالية</p>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          {contentType !== 'slideshow' && (
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="رابط عند الضغط (اختياري)"
              className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
            />
          )}
          <input
            type="number"
            min="0"
            value={newWidth}
            onChange={(e) => setNewWidth(e.target.value)}
            placeholder="العرض بالبكسل (اختياري)"
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
          />
          <input
            type="number"
            min="0"
            value={newHeight}
            onChange={(e) => setNewHeight(e.target.value)}
            placeholder="الارتفاع بالبكسل (اختياري)"
            className="h-11 rounded-xl border-2 border-gray-200 px-4 text-sm focus:outline-none focus:border-brand-500 transition"
          />
        </div>
        <p className="text-xs text-gray-400">اترك العرض/الارتفاع فارغين لاستخدام الحجم التلقائي المناسب للشاشة.</p>

        <button
          onClick={saveBanner}
          disabled={!canSave() || saving}
          className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
        >
          {editingId ? <><Save size={16} /> حفظ التعديلات</> : <><Plus size={16} /> إضافة</>}
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
            <div key={banner.id} className={`p-4 flex items-center gap-3 ${editingId === banner.id ? 'bg-brand-50' : ''}`}>
              <div className="w-24 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center text-gray-400">
                {banner.content_type === 'image' && banner.image_url && (
                  <img src={banner.image_url} alt="" className="w-full h-full object-contain" />
                )}
                {banner.content_type === 'slideshow' && banner.slides?.[0] && (
                  <img src={banner.slides[0].image_url} alt="" className="w-full h-full object-contain" />
                )}
                {banner.content_type === 'video' && <Video size={22} />}
                {banner.content_type === 'text_ticker' && <MessageSquareText size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-gray-500">{typeLabels[banner.content_type]}</span>
                {banner.content_type === 'text_ticker' ? (
                  <p className="text-sm text-gray-700 truncate">{banner.text_content}</p>
                ) : banner.content_type === 'slideshow' ? (
                  <p className="text-xs text-gray-400">{banner.slides?.length ?? 0} صورة في السلايدر</p>
                ) : (
                  <p className="text-xs text-gray-400 truncate" dir="ltr">{banner.image_url}</p>
                )}
                {banner.link_url && (
                  <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 flex items-center gap-1 hover:underline truncate">
                    <ExternalLink size={12} /> {banner.link_url}
                  </a>
                )}
                {(banner.width || banner.height) && (
                  <p className="text-[11px] text-gray-400">الحجم: {banner.width ?? 'تلقائي'} × {banner.height ?? 'تلقائي'} بكسل</p>
                )}
                {banner.content_type === 'text_ticker' && (
                  <p className="text-[11px] text-gray-400">سرعة الحركة: {banner.ticker_speed_seconds}ث</p>
                )}
                {banner.content_type === 'slideshow' && (
                  <p className="text-[11px] text-gray-400">سرعة تغيير الشريحة: {banner.slideshow_interval_seconds}ث</p>
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
              <button onClick={() => startEdit(banner)} className="w-9 h-9 shrink-0 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition">
                <Pencil size={16} />
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
